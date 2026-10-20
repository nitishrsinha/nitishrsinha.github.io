/**
 * qis-quiz: phone quizzes for BUFN736, graded on the server.
 *
 * Each quiz is in one of three states: "closed", "open" (taking submissions) or
 * "review" (closed, and the answer key with explanations is public).
 *
 * GET  /quiz?week=week01
 *                 -> open:   {state, title, questions: [{id, q, code, choices, bonus}]}
 *                            (answers never leave the worker)
 *                    review: {state, title, outOf, questions (with answer and why)}
 *                    closed: {state, title}
 * POST /quiz    {"week": "week01", "name": "...", "email": "...", "answers": {"q1": 0}}
 *                 -> stores one submission per email while open; unanswered
 *                    questions score zero. {"ok": true, "token": "<receipt>"}
 * POST /quiz/mine {"week": "week01", "email": "...", "token": "<receipt>"}
 *                 -> in review only: {name, answers, score, outOf} for that submission.
 *                    The receipt token, not the email, is what proves who is asking.
 * GET  /admin?week=week01        (requires Authorization: Bearer <ADMIN_PASSWORD>)
 *                 -> {state, title, outOf, questions (with answers),
 *                     submissions (scored, with receipt tokens for review links)}
 * POST /admin   {"week": "week01", "state": "open"}   (same Authorization header)
 *                 -> sets the state: "open", "review" or "closed".
 *
 * A question with "bonus": true adds a point when correct but is left out of outOf.
 * An optional "code" string is shown as a code block under the question.
 *
 * Secrets (set via `wrangler secret put`):
 *   ADMIN_PASSWORD - password for the instructor results page
 *
 * Bindings:
 *   QUIZ           - KV namespace. Keys:
 *                      def:<week>          quiz definition JSON (from quizzes/<week>.json)
 *                      state:<week>        "open" or "review"; absent means closed
 *                      sub:<week>:<email>  one submission
 *
 * Vars:
 *   ALLOWED_ORIGIN - origin allowed to call this worker from a browser
 */

const MAX_NAME_LENGTH = 100;
const EMAIL_PATTERN = /^[^\s@]{1,64}@[^\s@]+\.[^\s@]+$/;
const WEEK_PATTERN = /^week\d{2}$/;
const STATES = ["closed", "open", "review"];
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

async function getState(env, week) {
  return (await env.QUIZ.get(`state:${week}`)) || "closed";
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
  const state = await getState(env, week);
  if (state === "review") {
    return json(
      { state, title: quiz.title, outOf: outOf(quiz), questions: quiz.questions },
      200,
      corsHeaders
    );
  }
  if (state !== "open") return json({ state, title: quiz.title }, 200, corsHeaders);

  return json(
    {
      state,
      title: quiz.title,
      questions: quiz.questions.map(({ id, q, code, choices, bonus }) => ({
        id,
        q,
        code,
        choices,
        bonus: Boolean(bonus),
      })),
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
  if ((await getState(env, week)) !== "open") {
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

  // stored in KV metadata too, so the admin page can read everything (including
  // the receipt token, for emailing review links) from one list() call
  const token = crypto.randomUUID();
  const submission = { name, email, answers: clean, submittedAt: new Date().toISOString(), token };
  await env.QUIZ.put(key, JSON.stringify(submission), { metadata: submission });

  return json({ ok: true, token }, 200, corsHeaders);
}

async function handleQuizMine(env, request, corsHeaders) {
  let week, email, token;
  try {
    ({ week, email, token } = await request.json());
  } catch {
    return json({ error: "invalid JSON body" }, 400, corsHeaders);
  }

  const quiz = await loadQuiz(env, week);
  if (!quiz) return json({ error: "no such quiz" }, 404, corsHeaders);
  if ((await getState(env, week)) !== "review") {
    return json({ error: "Review is not open for this quiz." }, 403, corsHeaders);
  }

  email = typeof email === "string" ? email.trim().toLowerCase() : "";
  const sub = EMAIL_PATTERN.test(email) ? await env.QUIZ.get(`sub:${week}:${email}`, "json") : null;
  if (!sub || !sub.token || typeof token !== "string" || !timingSafeEqual(token, sub.token)) {
    return json({ error: "No submission found for this receipt." }, 404, corsHeaders);
  }

  return json(
    { name: sub.name, answers: sub.answers, score: score(quiz, sub.answers), outOf: outOf(quiz) },
    200,
    corsHeaders
  );
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
        state: await getState(env, week),
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
    let week, state;
    try {
      ({ week, state } = await request.json());
    } catch {
      return json({ error: "invalid JSON body" }, 400, corsHeaders);
    }
    if (!(await loadQuiz(env, week))) return json({ error: "no such quiz" }, 404, corsHeaders);
    if (!STATES.includes(state)) {
      return json({ error: `state must be one of ${STATES.join(", ")}` }, 400, corsHeaders);
    }

    // one key, so a quiz can never be open for submissions and in review at once
    if (state === "closed") await env.QUIZ.delete(`state:${week}`);
    else await env.QUIZ.put(`state:${week}`, state);
    return json({ ok: true, state }, 200, corsHeaders);
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
    if (url.pathname === "/quiz/mine" && request.method === "POST") {
      return handleQuizMine(env, request, corsHeaders);
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
