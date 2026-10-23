/**
 * qis-grades: a private course dashboard for each BUFN736 student.
 *
 * Each student has one permanent link, teaching/qis/grades.html#t=<token>. The page
 * sends the token to this worker, which returns that student's dashboard. There is no
 * login and no email: the unguessable token is the credential. Issuing a new token
 * (sync.py --rotate <email>) makes the old link stop working.
 *
 * GET /me                 (Authorization: Bearer <token>)
 *                 -> {name, email, updatedAt, assignments: [{id, title, due, outOf,
 *                     status, score, parts, deductions, comment, submittedAt, links, files}]}
 *                    status is "graded", "submitted" (grading in progress) or "none".
 *                    Only grades the instructor confirmed are ever uploaded.
 * GET /file?h=<sha256>    (same Authorization header)
 *                 -> one submitted file, if it belongs to this student.
 *
 * Bindings:
 *   GRADES         - KV namespace, written only by sync.py. Keys:
 *                      stu:<sha256(token)>  one student's dashboard JSON
 *                      file:<sha256(bytes)> a submitted file (metadata: {name, type})
 *                      fails:<ip>           bad-token counter (rate limit)
 *
 * Vars:
 *   ALLOWED_ORIGIN - origin allowed to call this worker from a browser
 */

const TOKEN_PATTERN = /^[A-Za-z0-9_-]{20,100}$/;
const HASH_PATTERN = /^[0-9a-f]{64}$/;
const MAX_FAILS_PER_IP = 20; // per FAIL_TTL_SECONDS
const FAIL_TTL_SECONDS = 900;

function json(body, status, corsHeaders) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...corsHeaders },
  });
}

async function sha256Hex(text) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** The student's dashboard, or an error response. Bad tokens count against the IP. */
async function authenticate(env, request, corsHeaders) {
  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  const failKey = `fails:${ip}`;
  const fails = parseInt((await env.GRADES.get(failKey)) || "0", 10);
  if (fails >= MAX_FAILS_PER_IP) {
    return { error: json({ error: "Too many attempts. Try again in 15 minutes." }, 429, corsHeaders) };
  }

  const auth = String(request.headers.get("Authorization") || "");
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  // KV is keyed by the token's hash, so a leaked key listing is not a set of working links
  const student = TOKEN_PATTERN.test(token)
    ? await env.GRADES.get(`stu:${await sha256Hex(token)}`, "json")
    : null;
  if (!student) {
    await env.GRADES.put(failKey, String(fails + 1), { expirationTtl: FAIL_TTL_SECONDS });
    return {
      error: json(
        { error: "This link is not valid. It may have been replaced; ask your instructor for a new one." },
        401,
        corsHeaders
      ),
    };
  }
  return { student };
}

async function handleFile(env, student, url, corsHeaders) {
  const hash = url.searchParams.get("h") || "";
  const owns =
    HASH_PATTERN.test(hash) &&
    student.assignments.some((a) => (a.files || []).some((f) => f.hash === hash));
  if (!owns) return json({ error: "no such file" }, 404, corsHeaders);

  const { value, metadata } = await env.GRADES.getWithMetadata(`file:${hash}`, "arrayBuffer");
  if (!value) return json({ error: "no such file" }, 404, corsHeaders);
  const name = (metadata && metadata.name) || "submission";
  return new Response(value, {
    status: 200,
    headers: {
      "Content-Type": (metadata && metadata.type) || "application/octet-stream",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(name)}`,
      "Cache-Control": "no-store",
      ...corsHeaders,
    },
  });
}

export default {
  async fetch(request, env) {
    const corsHeaders = {
      "Access-Control-Allow-Origin": env.ALLOWED_ORIGIN || "https://nitishrsinha.github.io",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Authorization",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }
    if (!env.GRADES) {
      return json({ error: "GRADES KV namespace not bound" }, 500, corsHeaders);
    }

    const url = new URL(request.url);
    if (request.method === "GET" && (url.pathname === "/me" || url.pathname === "/file")) {
      const { student, error } = await authenticate(env, request, corsHeaders);
      if (error) return error;
      if (url.pathname === "/file") return handleFile(env, student, url, corsHeaders);
      return json(student, 200, corsHeaders);
    }

    return json({ service: "qis-grades", configured: { grades_kv: true } }, 200, corsHeaders);
  },
};
