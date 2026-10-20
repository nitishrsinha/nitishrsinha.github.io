/**
 * qis-quiz: phone quizzes for BUFN736, graded on the server.
 *
 * GET  /quiz?week=week01
 *                 -> {open: true, title, questions: [{id, q, choices, bonus}]} while the quiz is
 *                    open (answers never leave the worker), {open: false} otherwise.
 * POST /quiz    {"week": "week01", "name": "...", "email": "...", "answers": {"q1": 0}}
 *                 -> stores one submission per email while open; unanswered
 *                    questions score zero. {"ok": true}
 * GET  /admin?week=week01        (requires Authorization: Bearer <ADMIN_PASSWORD>)
 *                 -> {open, title, outOf, questions (with answers), submissions (scored)}
 *
 * A question with "bonus": true adds a point when correct but is left out of outOf.
 * POST /admin   {"week": "week01", "open": true}   (same Authorization header)
 *                 -> opens or closes submissions.
 *
 * Secrets (set via `wrangler secret put`):
 *   ADMIN_PASSWORD - password for the instructor results page
 *
 * Bindings:
 *   QUIZ           - KV namespace. Keys:
 *                      def:<week>          quiz definition JSON (from quizzes/<week>.json)
 *                      open:<week>         "1" while accepting submissions
 *                      sub:<week>:<email>  one submission
 *
 * Vars:
 *   ALLOWED_ORIGIN - origin allowed to call this worker from a browser
 */

const MAX_NAME_LENGTH = 100;
const EMAIL_PATTERN = /^[^\s@]{1,64}@[^\s@]+\.[^\s@]+$/;
const WEEK_PATTERN = /^week\d{2}$/;
const MAX_ADMIN_FAILS_PER_IP = 10; // per FAIL_TTL_SECONDS
const FAIL_TTL_SECONDS = 900;

function json(body, status, corsHeaders) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...corsHeaders },
  });
}

function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function loadQuiz(env, week) {
  if (!WEEK_PATTERN.test(week || "")) return null;
  return env.QUIZ.get(`def:${week}`, "json");
}

async function isOpen(env, week) {
  return (await env.QUIZ.get(`open:${week}`)) === "1";
}

/** Correct answers, bonus questions included. */
function score(quiz, answers) {
  let correct = 0;
  for (const q of quiz.questions) {
    if (answers[q.id] === q.answer) correct++;
  }
  return correct;
}

function outOf(quiz) {
  return quiz.questions.filter((q) => !q.bonus).length;
}

async function handleQuizGet(env, url, corsHeaders) {
  const week = url.searchParams.get("week");
  const quiz = await loadQuiz(env, week);
  if (!quiz) return json({ error: "no such quiz" }, 404, corsHeaders);
  if (!(await isOpen(env, week))) return json({ open: false, title: quiz.title }, 200, corsHeaders);

  return json(
    {
      open: true,
      title: quiz.title,
      questions: quiz.questions.map(({ id, q, choices, bonus }) => ({ id, q, choices, bonus: Boolean(bonus) })),
    },
    200,
    corsHeaders
  );
}

async function handleQuizPost(env, request, corsHeaders) {
  let week, name, email, answers;
  try {
    ({ week, name, email, answers } = await request.json());
  } catch {
    return json({ error: "invalid JSON body" }, 400, corsHeaders);
  }

  const quiz = await loadQuiz(env, week);
  if (!quiz) return json({ error: "no such quiz" }, 404, corsHeaders);
  if (!(await isOpen(env, week))) {
    return json({ error: "This quiz is not accepting submissions right now." }, 403, corsHeaders);
  }

  name = typeof name === "string" ? name.trim() : "";
  email = typeof email === "string" ? email.trim().toLowerCase() : "";
  if (!name || name.length > MAX_NAME_LENGTH) {
    return json({ error: "Please enter your full name." }, 400, corsHeaders);
  }
  if (!EMAIL_PATTERN.test(email)) {
    return json({ error: "Please enter a valid email address." }, 400, corsHeaders);
  }
  if (!answers || typeof answers !== "object") {
    return json({ error: "answers missing" }, 400, corsHeaders);
  }

  // keep only known questions with in-range integer choices
  const clean = {};
  for (const q of quiz.questions) {
    const a = answers[q.id];
    if (Number.isInteger(a) && a >= 0 && a < q.choices.length) clean[q.id] = a;
  }

  const key = `sub:${week}:${email}`;
  if ((await env.QUIZ.get(key)) !== null) {
    return json({ error: "A submission from this email is already recorded." }, 409, corsHeaders);
  }

  // stored in KV metadata too, so the results page can read everything from one list() call
  const submission = { name, email, answers: clean, submittedAt: new Date().toISOString() };
  await env.QUIZ.put(key, JSON.stringify(submission), { metadata: submission });

  return json({ ok: true }, 200, corsHeaders);
}

async function authenticateAdmin(env, request) {
  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  const failKey = `fails:${ip}`;
  const fails = parseInt((await env.QUIZ.get(failKey)) || "0", 10);
  if (fails >= MAX_ADMIN_FAILS_PER_IP) {
    return { ok: false, status: 429, error: "too many attempts, try again later" };
  }

  const auth = String(request.headers.get("Authorization") || "");
  const given = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!env.ADMIN_PASSWORD || !given || !timingSafeEqual(given, env.ADMIN_PASSWORD)) {
    await env.QUIZ.put(failKey, String(fails + 1), { expirationTtl: FAIL_TTL_SECONDS });
    return { ok: false, status: 401, error: "wrong password" };
  }
  return { ok: true };
}

async function listSubmissions(env, week) {
  const subs = [];
  let cursor;
  do {
    const page = await env.QUIZ.list({ prefix: `sub:${week}:`, cursor });
    for (const k of page.keys) {
      // metadata is normally present; fall back to the value just in case
      subs.push(k.metadata || (await env.QUIZ.get(k.name, "json")));
    }
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor);
  return subs;
}

async function handleAdmin(env, request, url, corsHeaders) {
  const auth = await authenticateAdmin(env, request);
  if (!auth.ok) return json({ error: auth.error }, auth.status, corsHeaders);

  if (request.method === "GET") {
    const week = url.searchParams.get("week");
    const quiz = await loadQuiz(env, week);
    if (!quiz) return json({ error: "no such quiz" }, 404, corsHeaders);

    // score at read time, so a corrected answer key re-grades everyone
    const submissions = (await listSubmissions(env, week))
      .map((s) => ({ ...s, score: score(quiz, s.answers) }))
      .sort((a, b) => a.submittedAt.localeCompare(b.submittedAt));

    return json(
      {
        open: await isOpen(env, week),
        title: quiz.title,
        outOf: outOf(quiz),
        questions: quiz.questions,
        submissions,
      },
      200,
      corsHeaders
    );
  }

  if (request.method === "POST") {
    let week, open;
    try {
      ({ week, open } = await request.json());
    } catch {
      return json({ error: "invalid JSON body" }, 400, corsHeaders);
    }
    if (!(await loadQuiz(env, week))) return json({ error: "no such quiz" }, 404, corsHeaders);

    if (open === true) await env.QUIZ.put(`open:${week}`, "1");
    else await env.QUIZ.delete(`open:${week}`);
    return json({ ok: true, open: open === true }, 200, corsHeaders);
  }

  return json({ error: "method not allowed" }, 405, corsHeaders);
}

export default {
  async fetch(request, env) {
    const corsHeaders = {
      "Access-Control-Allow-Origin": env.ALLOWED_ORIGIN || "https://nitishrsinha.github.io",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }
    if (!env.QUIZ) {
      return json({ error: "QUIZ KV namespace not bound" }, 500, corsHeaders);
    }

    const url = new URL(request.url);

    if (url.pathname === "/quiz" && request.method === "GET") {
      return handleQuizGet(env, url, corsHeaders);
    }
    if (url.pathname === "/quiz" && request.method === "POST") {
      return handleQuizPost(env, request, corsHeaders);
    }
    if (url.pathname === "/admin") {
      return handleAdmin(env, request, url, corsHeaders);
    }

    return json(
      {
        service: "qis-quiz",
        configured: { quiz_kv: true, admin_password: Boolean(env.ADMIN_PASSWORD) },
      },
      200,
      corsHeaders
    );
  },
};
