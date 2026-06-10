/**
 * research-gate: TOTP-gated key release for StatiCrypt-protected pages.
 *
 * POST {"code": "123456"}  ->  {"key": "<staticrypt hashed password>"} on success.
 *
 * Secrets (set via `wrangler secret put`):
 *   TOTP_SECRET    - base32 TOTP secret (the one behind the authenticator QR code)
 *   STATICRYPT_KEY - StatiCrypt derived key (output of derive-key.mjs / staticrypt --share)
 *
 * Bindings:
 *   RATE_LIMIT     - KV namespace for rate limiting and replay protection (required)
 *
 * Vars:
 *   ALLOWED_ORIGIN - origin allowed to call this worker from a browser
 */

const TOTP_STEP_SECONDS = 30;
const TOTP_WINDOW = 1; // accept previous/current/next step (clock drift)
const MAX_FAILS_PER_IP = 5; // per FAIL_TTL_SECONDS
const MAX_FAILS_GLOBAL = 10; // per FAIL_TTL_SECONDS, across all IPs
const FAIL_TTL_SECONDS = 900;

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export function base32Decode(s) {
  const clean = s.toUpperCase().replace(/[\s=-]/g, "");
  let bits = 0;
  let value = 0;
  const out = [];
  for (const c of clean) {
    const idx = BASE32_ALPHABET.indexOf(c);
    if (idx === -1) throw new Error("invalid base32 character");
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return new Uint8Array(out);
}

export async function totpCode(secretBytes, counter) {
  const key = await crypto.subtle.importKey(
    "raw",
    secretBytes,
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"]
  );
  const msg = new Uint8Array(8);
  let c = counter;
  for (let i = 7; i >= 0; i--) {
    msg[i] = c & 0xff;
    c = Math.floor(c / 256);
  }
  const mac = new Uint8Array(await crypto.subtle.sign("HMAC", key, msg));
  const offset = mac[mac.length - 1] & 0x0f;
  const bin =
    ((mac[offset] & 0x7f) << 24) |
    (mac[offset + 1] << 16) |
    (mac[offset + 2] << 8) |
    mac[offset + 3];
  return String(bin % 1_000_000).padStart(6, "0");
}

function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Returns the matched time-step counter, or null if the code is invalid. */
export async function verifyTotp(secret, code, nowMs = Date.now()) {
  const secretBytes = base32Decode(secret);
  const counter = Math.floor(nowMs / 1000 / TOTP_STEP_SECONDS);
  let matched = null;
  for (let i = -TOTP_WINDOW; i <= TOTP_WINDOW; i++) {
    const expected = await totpCode(secretBytes, counter + i);
    // no early exit: check every step so timing doesn't reveal which matched
    if (timingSafeEqual(expected, code) && matched === null) {
      matched = counter + i;
    }
  }
  return matched;
}

function json(body, status, corsHeaders) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

async function bumpFailCounter(kv, key) {
  const current = parseInt((await kv.get(key)) || "0", 10);
  await kv.put(key, String(current + 1), { expirationTtl: FAIL_TTL_SECONDS });
}

export default {
  async fetch(request, env) {
    const corsHeaders = {
      "Access-Control-Allow-Origin": env.ALLOWED_ORIGIN || "https://nitishrsinha.github.io",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    if (request.method === "GET") {
      // status endpoint for setup debugging; reveals configuration state only
      return json(
        {
          service: "research-gate",
          configured: {
            totp_secret: Boolean(env.TOTP_SECRET),
            staticrypt_key: Boolean(env.STATICRYPT_KEY),
            rate_limit_kv: Boolean(env.RATE_LIMIT),
          },
        },
        200,
        corsHeaders
      );
    }

    if (request.method !== "POST") {
      return json({ error: "method not allowed" }, 405, corsHeaders);
    }

    if (!env.TOTP_SECRET || !env.STATICRYPT_KEY) {
      return json({ error: "worker secrets not configured" }, 500, corsHeaders);
    }
    // fail closed: without the KV binding there is no brute-force protection
    if (!env.RATE_LIMIT) {
      return json({ error: "RATE_LIMIT KV namespace not bound" }, 500, corsHeaders);
    }

    let code;
    try {
      ({ code } = await request.json());
    } catch {
      return json({ error: "invalid JSON body" }, 400, corsHeaders);
    }
    if (typeof code !== "string" || !/^\d{6}$/.test(code)) {
      return json({ error: "code must be 6 digits" }, 400, corsHeaders);
    }

    const ip = request.headers.get("CF-Connecting-IP") || "unknown";
    const ipKey = `fails:${ip}`;
    const [ipFails, globalFails] = await Promise.all([
      env.RATE_LIMIT.get(ipKey),
      env.RATE_LIMIT.get("fails:global"),
    ]);
    if (parseInt(ipFails || "0", 10) >= MAX_FAILS_PER_IP) {
      return json({ error: "too many attempts, try again later" }, 429, corsHeaders);
    }
    if (parseInt(globalFails || "0", 10) >= MAX_FAILS_GLOBAL) {
      return json({ error: "too many attempts, try again later" }, 429, corsHeaders);
    }

    const matchedCounter = await verifyTotp(env.TOTP_SECRET, code);

    if (matchedCounter === null) {
      await Promise.all([
        bumpFailCounter(env.RATE_LIMIT, ipKey),
        bumpFailCounter(env.RATE_LIMIT, "fails:global"),
      ]);
      return json({ error: "invalid code" }, 401, corsHeaders);
    }

    // replay protection: each code (time step) can only be used once
    const lastCounter = parseInt((await env.RATE_LIMIT.get("last_counter")) || "0", 10);
    if (matchedCounter <= lastCounter) {
      return json({ error: "code already used, wait for the next one" }, 401, corsHeaders);
    }
    await env.RATE_LIMIT.put("last_counter", String(matchedCounter));

    return json({ key: env.STATICRYPT_KEY }, 200, corsHeaders);
  },
};
