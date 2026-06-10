/**
 * research-gate: TOTP-gated key release and publishing for StatiCrypt-protected pages.
 *
 * POST /        {"code": "123456"}
 *                 -> {"key": "<staticrypt hashed password>"} on success.
 * POST /upload  {"code": "123456", "filename": "paper.html", "content": "<html>..."}
 *                 -> encrypts content in StatiCrypt format with STATICRYPT_KEY and
 *                    commits it to private/<filename> on GitHub. {"ok": true, ...}
 * POST /delete  {"code": "123456", "filename": "paper.html"}
 *                 -> removes private/<filename> from the repo. {"ok": true, ...}
 *
 * Secrets (set via `wrangler secret put`):
 *   TOTP_SECRET    - base32 TOTP secret (the one behind the authenticator QR code)
 *   STATICRYPT_KEY - StatiCrypt derived key (output of derive-key.mjs / staticrypt --share)
 *   GITHUB_TOKEN   - fine-grained PAT, contents read/write on the site repo only
 *
 * Bindings:
 *   RATE_LIMIT     - KV namespace for rate limiting and replay protection (required)
 *
 * Vars:
 *   ALLOWED_ORIGIN - origin allowed to call this worker from a browser
 *   GITHUB_REPO    - owner/repo to publish into
 *   GITHUB_BRANCH  - branch to commit to
 */

import template from "./template.html";
import { staticryptEncrypt, buildProtectedPage } from "./staticrypt-format.js";

const TOTP_STEP_SECONDS = 30;
const TOTP_WINDOW = 1; // accept previous/current/next step (clock drift)
const MAX_FAILS_PER_IP = 5; // per FAIL_TTL_SECONDS
const MAX_FAILS_GLOBAL = 10; // per FAIL_TTL_SECONDS, across all IPs
const FAIL_TTL_SECONDS = 900;
const MAX_CONTENT_BYTES = 25 * 1024 * 1024;

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

function bytesToBase64(bytes) {
  let bin = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(bin);
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

/**
 * Rate-limited, replay-protected TOTP check shared by all routes.
 * Returns { ok: true } or { ok: false, status, error }.
 */
async function authenticate(env, request, code) {
  if (typeof code !== "string" || !/^\d{6}$/.test(code)) {
    return { ok: false, status: 400, error: "code must be 6 digits" };
  }

  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  const ipKey = `fails:${ip}`;
  const [ipFails, globalFails] = await Promise.all([
    env.RATE_LIMIT.get(ipKey),
    env.RATE_LIMIT.get("fails:global"),
  ]);
  if (
    parseInt(ipFails || "0", 10) >= MAX_FAILS_PER_IP ||
    parseInt(globalFails || "0", 10) >= MAX_FAILS_GLOBAL
  ) {
    return { ok: false, status: 429, error: "too many attempts, try again later" };
  }

  const matchedCounter = await verifyTotp(env.TOTP_SECRET, code);

  if (matchedCounter === null) {
    await Promise.all([
      bumpFailCounter(env.RATE_LIMIT, ipKey),
      bumpFailCounter(env.RATE_LIMIT, "fails:global"),
    ]);
    return { ok: false, status: 401, error: "invalid code" };
  }

  // replay protection: each code (time step) can only be used once
  const lastCounter = parseInt((await env.RATE_LIMIT.get("last_counter")) || "0", 10);
  if (matchedCounter <= lastCounter) {
    return { ok: false, status: 401, error: "code already used, wait for the next one" };
  }
  await env.RATE_LIMIT.put("last_counter", String(matchedCounter));

  return { ok: true };
}

async function githubRequest(env, method, path, body) {
  return fetch(`https://api.github.com${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${env.GITHUB_TOKEN}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "research-gate-worker",
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

function isValidFilename(filename) {
  return (
    typeof filename === "string" &&
    /^[A-Za-z0-9][A-Za-z0-9._-]{0,80}\.html$/.test(filename) &&
    filename !== "index.html"
  );
}

/** Optional single-level folder under private/. */
function isValidFolder(folder) {
  return (
    folder === undefined ||
    folder === "" ||
    (typeof folder === "string" && /^[A-Za-z0-9][A-Za-z0-9._-]{0,40}$/.test(folder))
  );
}

function contentApiPath(env, folder, filename) {
  const repo = env.GITHUB_REPO || "nitishrsinha/nitishrsinha.github.io";
  const dir = folder ? `private/${folder}` : "private";
  return { apiPath: `/repos/${repo}/contents/${dir}/${filename}`, relPath: `${dir}/${filename}` };
}

/** Look up the blob sha of private/<filename>; undefined if it doesn't exist. */
async function getFileSha(env, apiPath, branch) {
  const res = await githubRequest(env, "GET", `${apiPath}?ref=${branch}`);
  if (res.status === 200) return (await res.json()).sha;
  if (res.status === 404) return undefined;
  throw new Error(`GitHub lookup failed (${res.status})`);
}

async function handleUpload(env, request, corsHeaders) {
  if (!env.GITHUB_TOKEN) {
    return json({ error: "GITHUB_TOKEN secret not configured" }, 500, corsHeaders);
  }

  let code, filename, content, folder;
  try {
    ({ code, filename, content, folder } = await request.json());
  } catch {
    return json({ error: "invalid JSON body" }, 400, corsHeaders);
  }

  const auth = await authenticate(env, request, code);
  if (!auth.ok) {
    return json({ error: auth.error }, auth.status, corsHeaders);
  }

  if (!isValidFilename(filename)) {
    return json(
      { error: "filename must be a simple .html name (and not index.html)" },
      400,
      corsHeaders
    );
  }
  if (!isValidFolder(folder)) {
    return json({ error: "folder must be a simple name (letters, digits, ._-)" }, 400, corsHeaders);
  }
  if (typeof content !== "string" || content.length === 0) {
    return json({ error: "content must be a non-empty string" }, 400, corsHeaders);
  }
  if (content.length > MAX_CONTENT_BYTES) {
    return json({ error: "content too large (25MB max)" }, 413, corsHeaders);
  }

  const payload = await staticryptEncrypt(content, env.STATICRYPT_KEY);
  const page = buildProtectedPage(payload, template);
  const pageBase64 = bytesToBase64(new TextEncoder().encode(page));

  const branch = env.GITHUB_BRANCH || "main";
  const { apiPath, relPath } = contentApiPath(env, folder, filename);

  // existing file? need its sha to update
  let sha;
  try {
    sha = await getFileSha(env, apiPath, branch);
  } catch (err) {
    return json({ error: err.message }, 502, corsHeaders);
  }

  const putRes = await githubRequest(env, "PUT", apiPath, {
    message: `Publish protected document: ${filename}`,
    content: pageBase64,
    branch,
    ...(sha ? { sha } : {}),
  });
  if (!putRes.ok) {
    const detail = await putRes.text();
    return json(
      { error: `GitHub commit failed (${putRes.status}): ${detail.slice(0, 200)}` },
      502,
      corsHeaders
    );
  }

  const result = await putRes.json();
  return json(
    {
      ok: true,
      path: relPath,
      updated: Boolean(sha),
      commit: result.commit && result.commit.sha,
      note: "GitHub Pages usually publishes within a minute or two",
    },
    200,
    corsHeaders
  );
}

async function handleDelete(env, request, corsHeaders) {
  if (!env.GITHUB_TOKEN) {
    return json({ error: "GITHUB_TOKEN secret not configured" }, 500, corsHeaders);
  }

  let code, filename, folder;
  try {
    ({ code, filename, folder } = await request.json());
  } catch {
    return json({ error: "invalid JSON body" }, 400, corsHeaders);
  }

  const auth = await authenticate(env, request, code);
  if (!auth.ok) {
    return json({ error: auth.error }, auth.status, corsHeaders);
  }

  if (!isValidFilename(filename)) {
    return json(
      { error: "filename must be a simple .html name (and not index.html)" },
      400,
      corsHeaders
    );
  }
  if (!isValidFolder(folder)) {
    return json({ error: "folder must be a simple name (letters, digits, ._-)" }, 400, corsHeaders);
  }

  const branch = env.GITHUB_BRANCH || "main";
  const { apiPath, relPath } = contentApiPath(env, folder, filename);

  let sha;
  try {
    sha = await getFileSha(env, apiPath, branch);
  } catch (err) {
    return json({ error: err.message }, 502, corsHeaders);
  }
  if (!sha) {
    return json({ error: "file not found" }, 404, corsHeaders);
  }

  const delRes = await githubRequest(env, "DELETE", apiPath, {
    message: `Remove protected document: ${filename}`,
    sha,
    branch,
  });
  if (!delRes.ok) {
    const detail = await delRes.text();
    return json(
      { error: `GitHub delete failed (${delRes.status}): ${detail.slice(0, 200)}` },
      502,
      corsHeaders
    );
  }

  const result = await delRes.json();
  return json(
    {
      ok: true,
      path: relPath,
      commit: result.commit && result.commit.sha,
    },
    200,
    corsHeaders
  );
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
            github_token: Boolean(env.GITHUB_TOKEN),
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

    const url = new URL(request.url);
    if (url.pathname === "/upload") {
      return handleUpload(env, request, corsHeaders);
    }
    if (url.pathname === "/delete") {
      return handleDelete(env, request, corsHeaders);
    }

    let code;
    try {
      ({ code } = await request.json());
    } catch {
      return json({ error: "invalid JSON body" }, 400, corsHeaders);
    }

    const auth = await authenticate(env, request, code);
    if (!auth.ok) {
      return json({ error: auth.error }, auth.status, corsHeaders);
    }

    return json({ key: env.STATICRYPT_KEY }, 200, corsHeaders);
  },
};
