# qis-quiz — phone quizzes for BUFN736

A small Cloudflare Worker, separate from `research-gate`. Students take the quiz
at `teaching/qis/quiz.html?week=weekNN`; you open/close it and see results at
`teaching/qis/quiz-admin.html`.

- Questions and answer keys live only in KV (uploaded from `quizzes/`, which is
  gitignored). Students receive questions without answers, and only while the
  quiz is open. Grading happens in the worker, at read time, so fixing a key
  re-grades everyone.
- One submission per email; any address is accepted, and unanswered questions score zero. Question and choice order are shuffled per student.

## One-time setup

```bash
cd quiz
./setup.sh      # Cloudflare login, KV namespace, admin password, deploy, upload quizzes
```

The admin password is printed at the end and kept in `.admin-password` (gitignored).

## Each week

1. Write `quizzes/weekNN.json` (same shape as `week01.json`; `answer` is the
   0-based index of the correct choice; add `"bonus": true` for a question
   that adds a point without counting toward the total, and `"code"` for a
   snippet shown in a code block).
2. `./quiz-upload.sh weekNN`
3. In class: open the admin page, enter the week, show the QR code, press **Open**.
   Press **Close** when time is up, then **Download CSV**.

## Local testing

`.dev.vars` holds `ADMIN_PASSWORD=...` for `npx wrangler@4 dev`; load a quiz with
`npx wrangler@4 kv key put --binding=QUIZ --local def:week01 --path quizzes/week01.json`.
