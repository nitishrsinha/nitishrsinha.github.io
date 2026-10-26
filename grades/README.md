# qis-grades — a private grades dashboard for each BUFN736 student

A small Cloudflare Worker, separate from `research-gate` and `qis-quiz`. Each student
has one permanent link, `teaching/qis/grades.html#t=<token>`, that shows every
assignment: the confirmed score, the rubric breakdown, an optional comment, and
the notebook or Colab link they submitted. No login and no email: the token is
the credential.

- Grades come from the workbooks in `~/BUFN736/grading` listed in `assignments.json`.
  Only a numeric **Your final** is published; until then a row shows
  "Submitted · grading in progress". Parts are shown only when they add up to it.
- A **Comment for student** column, if you add one to a workbook, is shown on the
  dashboard. The existing Comments column is never published.
- Tokens are in `~/BUFN736/grading/portal/roster.json` and the links in
  `portal/links.csv`, both outside this repo. KV stores only token hashes.

## One-time setup

```bash
cd grades
./setup.sh      # Cloudflare login, KV namespace, deploy
```

## Each week

1. Add the assignment to `assignments.json` (workbook, sheet, part columns).
2. Fill in **Your final** for the rows you've reviewed.
3. `~/.venvs/main/bin/python sync.py --dry-run`, then `sync.py` to publish. Every run
   replaces everything in KV, so a fixed grade or removed file updates on the next
   run. Cloudflare caches KV reads, so a change can take up to a minute to show.
4. New students get a link in `portal/links.csv`; put it in their feedback email.

## Working from another laptop

`~/BUFN736/grading` is the private repo `nitishrsinha/bufn736-grading`; its CLAUDE.md
describes the grading workflow for Claude Code. On a new laptop, once:

```bash
git clone https://github.com/nitishrsinha/bufn736-grading.git ~/BUFN736/grading
git clone https://github.com/nitishrsinha/nitishrsinha.github.io.git ~/site
npx wrangler@4 login        # same Cloudflare account
```

Then `git pull` in `~/BUFN736/grading` before grading and commit and push after. `sync.py`
refuses to publish while that repo is behind its remote, since every publish replaces
all dashboards. Folder paths written on the other laptop are resolved relative to the
grading folder, and `QIS_GRADING=/path` points sync.py somewhere else.

Other commands: `sync.py --rotate EMAIL` (new link, old one stops working),
`--add EMAIL "Name"` (link before a first submission), `--alias OTHER EMAIL`
(a student who submits from two addresses). `--add` and `--alias` can be repeated
to make several changes in one publish.
