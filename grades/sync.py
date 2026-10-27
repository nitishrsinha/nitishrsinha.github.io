"""Publish BUFN736 grades to the qis-grades worker.

Reads the grade workbooks listed in assignments.json from ~/BUFN736/grading,
builds one dashboard per student, and replaces what is in the GRADES KV namespace.
Only a numeric "Your final" counts as a grade; a row without one shows as
"submitted, grading in progress". Submitted notebooks (.ipynb/.pdf/.py) come from
each row's Folder, links from LINK.txt there or a "Submission link" column, and a
"Comment for student" column, if a workbook has one, is shown to the student.
Quizzes come from the qis-quiz worker's KV (../quiz): each student sees the quizzes
they took, with a link to review their answers, and the score once review is open.

Student tokens live in ~/BUFN736/grading/portal/roster.json, never in this repo,
and each student's link is written to portal/links.csv. The grading folder is a
private git repo shared between laptops (QIS_GRADING overrides its location);
sync.py refuses to publish while it is behind its remote, so a stale laptop cannot
roll back grades entered on the other one.

    python sync.py --dry-run            # show what would be published
    python sync.py                      # publish
    python sync.py --add EMAIL "Name"   # give a student a link before they submit
    python sync.py --rotate EMAIL       # new link for a student; the old one stops working
    python sync.py --alias OTHER EMAIL  # treat rows sent from OTHER as EMAIL's

Needs openpyxl (e.g. uv run --with openpyxl sync.py) and a Cloudflare login for npx wrangler@4.
"""

import argparse
import base64
import csv
import hashlib
import json
import mimetypes
import os
import secrets
import subprocess
import sys
import urllib.parse
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

import openpyxl

HERE = Path(__file__).resolve().parent
GRADING = Path(os.environ.get("QIS_GRADING", Path.home() / "BUFN736" / "grading")).expanduser()
PORTAL = GRADING / "portal"
ROSTER = PORTAL / "roster.json"
FILE_TYPES = {".ipynb", ".pdf", ".py"}
MAX_FILE_BYTES = 20 * 1024 * 1024
WRANGLER = ["npx", "--yes", "wrangler@4"]
QUIZ_WORKER = HERE.parent / "quiz"


def load_roster():
    if ROSTER.exists():
        return json.loads(ROSTER.read_text())
    return {"students": {}, "aliases": {}}


def save_roster(roster):
    PORTAL.mkdir(parents=True, exist_ok=True)
    ROSTER.write_text(json.dumps(roster, indent=1, sort_keys=True))
    ROSTER.chmod(0o600)


def token_hash(token):
    return hashlib.sha256(token.encode()).hexdigest()


def eastern_iso(value):
    """'2026-10-23 09:46' (Eastern) as ISO with its offset, so every browser parses it."""
    try:
        t = value if isinstance(value, datetime) else datetime.strptime(str(value).strip(), "%Y-%m-%d %H:%M")
    except ValueError:
        return str(value)
    return t.replace(tzinfo=ZoneInfo("America/New_York")).isoformat(timespec="minutes")


def number(value):
    return value if isinstance(value, (int, float)) and not isinstance(value, bool) else None


def read_rows(assignment):
    """Yield one dict per student row, keyed by header text."""
    path = GRADING / assignment["workbook"]
    if not path.exists():
        print(f"  {assignment['id']}: {path.name} not found, skipped")
        return
    # data_only gives the cached value of a formula typed into "Your final"
    sheets = [openpyxl.load_workbook(path, data_only=d)[assignment["sheet"]] for d in (False, True)]
    raw_rows, cached_rows = (list(s.iter_rows(values_only=True)) for s in sheets)
    header = [str(h).strip() if h else "" for h in raw_rows[0]]
    for raw, cached in zip(raw_rows[1:], cached_rows[1:]):
        row = {h: (c if r is None or str(r).startswith("=") else r) for h, r, c in zip(header, raw, cached)}
        if row.get("Sent from (email)"):
            yield row


def local_folder(value):
    """A Folder cell as a path on this laptop: relative to GRADING, or an absolute
    path written on another laptop (/home/x/BUFN736/grading/week1_assignments/...)."""
    if not value:
        return None
    path = Path(str(value).strip())
    if not path.is_absolute():
        return GRADING / path
    if path.is_dir():
        return path
    parts = path.parts
    return GRADING.joinpath(*parts[parts.index("grading") + 1 :]) if "grading" in parts else path


def collect_files(folder):
    files, links = [], []
    folder = local_folder(folder)
    if not folder or not folder.is_dir():
        return files, links
    for p in sorted(folder.iterdir()):
        if p.suffix.lower() in FILE_TYPES and p.stat().st_size <= MAX_FILE_BYTES:
            data = p.read_bytes()
            name = p.name[len("drive_") + 9 :] if p.name.startswith("drive_") else p.name
            files.append({"name": name, "hash": hashlib.sha256(data).hexdigest(), "data": data})
        elif p.name == "LINK.txt":
            links += [l.strip() for l in p.read_text().split() if l.startswith(("https://", "http://"))]
    return files, links


def kv_json(out):
    return json.loads(out[out.index("[") :] if out.lstrip()[:1] != "{" else out)


def load_quizzes(config, roster):
    """Quizzes given so far, and each student's submission, from the qis-quiz KV.

    Returns (quizzes, {(email, quiz id): entry}, unmatched emails). A quiz counts as
    given once it has submissions or is not closed; uploaded-but-unused ones stay hidden.
    """
    def kv(*args):
        return wrangler("kv", "key", *args, "--binding=QUIZ", "--remote", capture=True, cwd=QUIZ_WORKER)

    def get(key):
        try:
            return kv("get", key)
        except subprocess.CalledProcessError:
            return None

    known, aliases = set(roster["students"]), roster["aliases"]
    quizzes, entries, unmatched = [], {}, set()
    for key in kv_json(kv("list", "--prefix=def:")):
        qid = key["name"][len("def:") :]
        quiz = json.loads(get(key["name"]))
        state = (get(f"state:{qid}") or "closed").strip()
        if state not in ("open", "review"):
            state = "closed"
        subs = kv_json(kv("list", f"--prefix=sub:{qid}:"))
        if state == "closed" and not subs:
            continue
        out_of = sum(1 for q in quiz["questions"] if not q.get("bonus"))
        quizzes.append({"id": qid, "title": quiz.get("title", qid), "state": state, "outOf": out_of})
        for k in subs:
            sub = k.get("metadata") or {}
            if not sub.get("token"):
                sub = json.loads(get(k["name"]))
            email = aliases.get(sub["email"], sub["email"])
            if email not in known:
                unmatched.add(f"{sub['email']} ({sub.get('name', '')}, {qid})")
                continue
            hash_ = urllib.parse.urlencode({"email": sub["email"], "token": sub["token"]})
            entry = {"status": "taken", "takenAt": sub.get("submittedAt"),
                     "review": f"{config['quizPage']}?week={qid}#{hash_}"}
            if state == "review":
                # same rule as the quiz worker: every correct answer counts, bonus included
                answers = sub.get("answers", {})
                entry["score"] = sum(1 for q in quiz["questions"] if answers.get(q["id"]) == q["answer"])
            entries[(email, qid)] = entry
    quizzes.sort(key=lambda q: q["id"])
    return quizzes, entries, sorted(unmatched)


def build(config, roster, quizzes=(), quiz_entries=None):
    """Return (dashboards by email, files by hash)."""
    aliases = roster["aliases"]
    entries, names, files = {}, {}, {}
    for a in config["assignments"]:
        for row in read_rows(a):
            email = str(row["Sent from (email)"]).strip().lower()
            email = aliases.get(email, email)
            names[email] = str(row.get("Student") or "").strip() or names.get(email, "")

            final = number(row.get("Your final"))
            entry = {"status": "graded" if final is not None else "submitted"}
            if row.get("Submitted (ET)"):
                entry["submittedAt"] = eastern_iso(row["Submitted (ET)"])
            if final is not None:
                entry["score"] = final
                parts = [number(row.get(p["column"])) for p in a["parts"]]
                deductions = number(row.get(a.get("deductions", ""))) or 0
                # show the breakdown only when it explains the final score
                if None not in parts and abs(sum(parts) + deductions - final) < 1e-9:
                    entry["parts"] = [
                        {"label": p["label"], "points": p["points"], "score": s} for p, s in zip(a["parts"], parts)
                    ]
                    if deductions:
                        entry["deductions"] = deductions
                comment = str(row.get("Comment for student") or "").strip()
                if comment:
                    entry["comment"] = comment

            found, links = collect_files(row.get("Folder"))
            link = str(row.get("Submission link") or "").strip()
            if link.startswith(("https://", "http://")):
                links.insert(0, link)
            for f in found:
                files[f["hash"]] = f
            entry["files"] = [{"name": f["name"], "hash": f["hash"]} for f in found]
            entry["links"] = links
            entries[(email, a["id"])] = entry

    for email, s in roster["students"].items():
        names.setdefault(email, s.get("name", ""))

    now = datetime.now().astimezone().isoformat(timespec="minutes")
    dashboards = {}
    for email, name in names.items():
        assignments = []
        for a in config["assignments"]:
            entry = entries.get((email, a["id"]), {"status": "none", "files": [], "links": []})
            assignments.append({"id": a["id"], "title": a["title"], "due": a["due"], "outOf": a["outOf"], **entry})
        taken = [
            {**q, **(quiz_entries or {}).get((email, q["id"]), {"status": "none"})} for q in quizzes
        ]
        dashboards[email] = {
            "name": name, "email": email, "updatedAt": now, "assignments": assignments, "quizzes": taken,
        }
    return dashboards, files


def ensure_tokens(roster, dashboards):
    for email, d in dashboards.items():
        s = roster["students"].setdefault(email, {})
        s["name"] = d["name"] or s.get("name", "")
        s.setdefault("token", secrets.token_urlsafe(24))


def git(*args):
    return subprocess.run(["git", "-C", str(GRADING), *args], text=True, capture_output=True)


def check_grading_repo():
    """Refuse to publish from a copy that is missing the other laptop's commits."""
    if git("rev-parse", "--git-dir").returncode != 0:
        print(f"  note: {GRADING} is not a git repo; skipping the up-to-date check")
        return
    if git("fetch", "--quiet").returncode != 0:
        sys.exit("Could not reach the grading repo's remote. Pull first, or publish once you are online.")
    behind = git("rev-list", "--count", "HEAD..@{u}").stdout.strip()
    if behind and behind != "0":
        sys.exit(f"{GRADING} is {behind} commit(s) behind its remote. Run `git pull` there first.")


def remind_to_push():
    dirty = git("status", "--porcelain").stdout.strip()
    ahead = git("rev-list", "--count", "@{u}..HEAD").stdout.strip()
    if dirty or (ahead and ahead != "0"):
        print(f"Reminder: commit and push {GRADING} so the other laptop has these grades.")


def wrangler(*args, capture=False, cwd=HERE):
    result = subprocess.run(
        WRANGLER + list(args), cwd=cwd, check=True, text=True, capture_output=capture
    )
    return result.stdout


def remote_keys():
    keys = []
    for prefix in ("stu:", "file:"):
        out = wrangler("kv", "key", "list", "--binding=GRADES", "--remote", f"--prefix={prefix}", capture=True)
        keys += [k["name"] for k in json.loads(out[out.index("[") :])]
    return keys


def bulk(command, payload):
    tmp = PORTAL / f".bulk-{command}.json"
    tmp.write_text(json.dumps(payload))
    tmp.chmod(0o600)
    try:
        extra = ["--force"] if command == "delete" else []
        wrangler("kv", "bulk", command, str(tmp), "--binding=GRADES", "--remote", *extra)
    finally:
        tmp.unlink()


def publish(roster, dashboards, files):
    puts = [
        {"key": f"stu:{token_hash(roster['students'][e]['token'])}", "value": json.dumps(d)}
        for e, d in dashboards.items()
    ]
    for h, f in files.items():
        mime = "application/x-ipynb+json" if f["name"].endswith(".ipynb") else (
            mimetypes.guess_type(f["name"])[0] or "application/octet-stream"
        )
        puts.append({
            "key": f"file:{h}",
            "value": base64.b64encode(f["data"]).decode(),
            "base64": True,
            "metadata": {"name": f["name"], "type": mime},
        })
    bulk("put", puts)

    # drop dashboards of rotated tokens and files no longer submitted
    keep = {p["key"] for p in puts}
    stale = [k for k in remote_keys() if k not in keep]
    if stale:
        bulk("delete", stale)
    print(f"Published {len(dashboards)} dashboards and {len(files)} files; removed {len(stale)} stale keys.")


def write_links(config, roster):
    path = PORTAL / "links.csv"
    with path.open("w", newline="") as fh:
        w = csv.writer(fh)
        w.writerow(["name", "email", "link"])
        for email, s in sorted(roster["students"].items(), key=lambda kv: kv[1].get("name", "")):
            w.writerow([s.get("name", ""), email, f"{config['page']}#t={s['token']}"])
    path.chmod(0o600)
    print(f"Links: {path}")


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--add", nargs=2, metavar=("EMAIL", "NAME"), action="append", default=[],
                    help="repeat to add several students in one run")
    ap.add_argument("--rotate", metavar="EMAIL")
    ap.add_argument("--alias", nargs=2, metavar=("OTHER", "EMAIL"), action="append", default=[],
                    help="repeat to add several aliases in one run")
    args = ap.parse_args()

    config = json.loads((HERE / "assignments.json").read_text())
    roster = load_roster()
    for email, name in args.add:
        roster["students"].setdefault(email.lower(), {})["name"] = name
    for other, email in args.alias:
        if email.lower() not in roster["students"]:
            sys.exit(f"--alias {other} {email}: {email} is not in the roster")
        roster["aliases"][other.lower()] = email.lower()
    if args.rotate:
        email = args.rotate.lower()
        if email not in roster["students"]:
            sys.exit(f"{email} is not in the roster")
        roster["students"][email]["token"] = secrets.token_urlsafe(24)

    quizzes, quiz_entries, unmatched = load_quizzes(config, roster)
    dashboards, files = build(config, roster, quizzes, quiz_entries)
    ensure_tokens(roster, dashboards)

    for email, d in sorted(dashboards.items(), key=lambda kv: kv[1]["name"]):
        cells = []
        for a in d["assignments"]:
            cells.append(f"{a['id']}={a['score']}" if a["status"] == "graded" else f"{a['id']}:{a['status']}")
        for q in d["quizzes"]:
            cells.append(f"{q['id']}={q.get('score', 'taken')}" if q["status"] == "taken" else f"{q['id']}:-")
        print(f"  {d['name'] or '?':28} {email:32} {'  '.join(cells)}")

    for u in unmatched:
        print(f"  quiz taker not in the roster (use --alias or --add): {u}")

    if args.dry_run:
        print(f"Dry run: {len(dashboards)} dashboards, {len(files)} files. Nothing saved or published.")
        return
    check_grading_repo()
    save_roster(roster)
    publish(roster, dashboards, files)
    write_links(config, roster)
    remind_to_push()


if __name__ == "__main__":
    main()
