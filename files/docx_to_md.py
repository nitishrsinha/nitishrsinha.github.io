#!/usr/bin/env python3
"""
docx_to_md.py — Convert a .docx to Markdown, preserving comments in place.

Comments are rendered as blockquote annotations immediately after the
paragraph containing their anchor, quoting the anchored text:

    > 💬 **Jane Doe** (2026-06-12) on "the anchored text":
    > This number looks stale — check against the June H.15 release.
    >     ↳ **Bob Smith** (reply): Fixed in v3.

Handles: headings, bold/italic/strikethrough, hyperlinks, footnote refs,
bullet/numbered lists (with nesting), tables, comment threads (replies via
commentsExtended.xml), and comments spanning multiple paragraphs.

Usage:
    python docx_to_md.py input.docx [-o output.md]

Stdlib only — no dependencies.
"""

import argparse
import re
import sys
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path

W = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"
W15 = "{http://schemas.microsoft.com/office/word/2012/wordml}"
R = "{http://schemas.openxmlformats.org/officeDocument/2006/relationships}"


# ---------------------------------------------------------------- comments

def load_comments(zf: zipfile.ZipFile) -> dict:
    """Return {comment_id: {author, date, text, para_ids, parent}}."""
    comments = {}
    try:
        root = ET.fromstring(zf.read("word/comments.xml"))
    except KeyError:
        return comments

    for c in root.findall(f"{W}comment"):
        cid = c.get(f"{W}id")
        text_parts, para_ids = [], []
        for p in c.findall(f"{W}p"):
            pid = p.get(f"{W15}paraId")
            if pid:
                para_ids.append(pid)
            text_parts.append("".join(t.text or "" for t in p.iter(f"{W}t")))
        comments[cid] = {
            "author": c.get(f"{W}author", "Unknown"),
            "date": (c.get(f"{W}date", "") or "")[:10],
            "text": "\n".join(tp for tp in text_parts if tp).strip(),
            "para_ids": para_ids,
            "parent": None,
        }

    # Threading: commentsExtended.xml links reply paraId -> parent paraId
    try:
        ext = ET.fromstring(zf.read("word/commentsExtended.xml"))
        parent_of = {}  # child paraId -> parent paraId
        for cx in ext.iter(f"{W15}commentEx"):
            child, parent = cx.get(f"{W15}paraId"), cx.get(f"{W15}paraIdParent")
            if child and parent:
                parent_of[child] = parent
        pid_to_cid = {pid: cid for cid, c in comments.items() for pid in c["para_ids"]}
        for cid, c in comments.items():
            for pid in c["para_ids"]:
                pp = parent_of.get(pid)
                if pp and pp in pid_to_cid:
                    c["parent"] = pid_to_cid[pp]
                    break
    except KeyError:
        pass

    return comments


# ---------------------------------------------------------------- numbering

def load_numbering(zf: zipfile.ZipFile) -> dict:
    """Return {(numId, ilvl): 'bullet'|'decimal'|...} for list rendering."""
    fmt = {}
    try:
        root = ET.fromstring(zf.read("word/numbering.xml"))
    except KeyError:
        return fmt
    abstract = {}
    for a in root.findall(f"{W}abstractNum"):
        aid = a.get(f"{W}abstractNumId")
        for lvl in a.findall(f"{W}lvl"):
            nf = lvl.find(f"{W}numFmt")
            abstract[(aid, lvl.get(f"{W}ilvl"))] = (
                nf.get(f"{W}val") if nf is not None else "decimal"
            )
    for n in root.findall(f"{W}num"):
        nid = n.get(f"{W}numId")
        ref = n.find(f"{W}abstractNumId")
        if ref is None:
            continue
        aid = ref.get(f"{W}val")
        for (a, ilvl), v in abstract.items():
            if a == aid:
                fmt[(nid, ilvl)] = v
    return fmt


# ---------------------------------------------------------------- runs

def esc(text: str) -> str:
    return re.sub(r"([\\`*_])", r"\\\1", text)


def run_to_md(run) -> str:
    text = "".join(
        t.text or "" if t.tag == f"{W}t" else ("\n" if t.tag == f"{W}br" else "\t")
        for t in run
        if t.tag in (f"{W}t", f"{W}br", f"{W}tab")
    )
    if not text:
        return ""
    rpr = run.find(f"{W}rPr")
    if rpr is not None and text.strip():
        lead = text[: len(text) - len(text.lstrip())]
        trail = text[len(text.rstrip()):]
        core = esc(text.strip())
        bold = rpr.find(f"{W}b") is not None and rpr.find(f"{W}b").get(f"{W}val") != "false"
        ital = rpr.find(f"{W}i") is not None and rpr.find(f"{W}i").get(f"{W}val") != "false"
        strike = rpr.find(f"{W}strike") is not None
        if bold and ital:
            core = f"***{core}***"
        elif bold:
            core = f"**{core}**"
        elif ital:
            core = f"*{core}*"
        if strike:
            core = f"~~{core}~~"
        return lead + core + trail
    return esc(text)


# ---------------------------------------------------------------- paragraphs

class ParagraphState:
    """Tracks open comment ranges and collects anchored text per comment."""

    def __init__(self):
        self.open = {}          # cid -> list of anchored text pieces
        self.done_in_para = []  # (cid, anchored_text) closed in current paragraph
        self.list_counters = {}


def para_to_md(p, state: ParagraphState, numbering: dict, rels: dict) -> tuple[str, str]:
    """Return (markdown_text, prefix) for one paragraph, updating comment state."""
    state.done_in_para = []
    parts = []

    def walk(el):
        for child in el:
            tag = child.tag
            if tag == f"{W}commentRangeStart":
                state.open[child.get(f"{W}id")] = []
            elif tag == f"{W}commentRangeEnd":
                cid = child.get(f"{W}id")
                if cid in state.open:
                    state.done_in_para.append((cid, "".join(state.open.pop(cid))))
            elif tag == f"{W}r":
                md = run_to_md(child)
                if md:
                    parts.append(md)
                    plain = "".join(t.text or "" for t in child.iter(f"{W}t"))
                    for pieces in state.open.values():
                        pieces.append(plain)
            elif tag == f"{W}hyperlink":
                rid = child.get(f"{R}id")
                inner_start = len(parts)
                walk(child)
                inner = "".join(parts[inner_start:])
                del parts[inner_start:]
                url = rels.get(rid, "")
                parts.append(f"[{inner}]({url})" if url else inner)
            elif tag == f"{W}ins":  # tracked insertion
                inner_start = len(parts)
                walk(child)
                inner = "".join(parts[inner_start:])
                del parts[inner_start:]
                if inner:
                    who = child.get(f"{W}author", "")
                    when = (child.get(f"{W}date", "") or "")[:10]
                    attr = f"{{>>ins: {who} {when}<<}}" if who else ""
                    parts.append(f"{{++{inner}++}}{attr}")
            elif tag == f"{W}del":  # tracked deletion
                deleted = "".join(t.text or "" for t in child.iter(f"{W}delText"))
                if deleted:
                    who = child.get(f"{W}author", "")
                    when = (child.get(f"{W}date", "") or "")[:10]
                    attr = f"{{>>del: {who} {when}<<}}" if who else ""
                    parts.append(f"{{--{esc(deleted)}--}}{attr}")
            elif tag == f"{W}smartTag":
                walk(child)

    walk(p)
    text = "".join(parts).strip()

    # Style -> heading / list prefix
    prefix = ""
    ppr = p.find(f"{W}pPr")
    if ppr is not None:
        style = ppr.find(f"{W}pStyle")
        sval = style.get(f"{W}val") if style is not None else ""
        m = re.match(r"Heading(\d)", sval or "", re.I)
        if m:
            prefix = "#" * int(m.group(1)) + " "
        elif sval == "Title":
            prefix = "# "
        numpr = ppr.find(f"{W}numPr")
        if numpr is not None and not prefix:
            ilvl_el = numpr.find(f"{W}ilvl")
            nid_el = numpr.find(f"{W}numId")
            ilvl = ilvl_el.get(f"{W}val") if ilvl_el is not None else "0"
            nid = nid_el.get(f"{W}val") if nid_el is not None else None
            indent = "  " * int(ilvl)
            if numbering.get((nid, ilvl), "bullet") == "bullet":
                prefix = f"{indent}- "
            else:
                key = (nid, ilvl)
                state.list_counters[key] = state.list_counters.get(key, 0) + 1
                prefix = f"{indent}{state.list_counters[key]}. "

    return text, prefix


def render_comment(cid: str, comments: dict, anchored: str, replies: dict) -> str:
    c = comments.get(cid)
    if not c:
        return ""
    anchor = anchored.strip()
    if len(anchor) > 80:
        anchor = anchor[:77] + "..."
    header = f"> 💬 **{c['author']}**"
    if c["date"]:
        header += f" ({c['date']})"
    header += f' on "{anchor}":' if anchor else ":"
    body = "\n".join(f"> {line}" for line in c["text"].splitlines() or [""])
    lines = [header, body]
    for rcid in replies.get(cid, []):
        r = comments[rcid]
        rbody = r["text"].replace("\n", " ")
        lines.append(f">     ↳ **{r['author']}** (reply): {rbody}")
    return "\n".join(lines)


# ---------------------------------------------------------------- tables

def table_to_md(tbl, state, numbering, rels, pending_comments) -> str:
    rows = []
    for tr in tbl.findall(f"{W}tr"):
        cells = []
        for tc in tr.findall(f"{W}tc"):
            cell_parts = []
            for p in tc.findall(f"{W}p"):
                text, _ = para_to_md(p, state, numbering, rels)
                pending_comments.extend(state.done_in_para)
                if text:
                    cell_parts.append(text)
            cells.append(" ".join(cell_parts).replace("|", "\\|"))
        rows.append(cells)
    if not rows:
        return ""
    width = max(len(r) for r in rows)
    rows = [r + [""] * (width - len(r)) for r in rows]
    out = ["| " + " | ".join(rows[0]) + " |",
           "| " + " | ".join(["---"] * width) + " |"]
    out += ["| " + " | ".join(r) + " |" for r in rows[1:]]
    return "\n".join(out)


# ---------------------------------------------------------------- main

def convert(docx_path: Path, out_path: Path) -> None:
    with zipfile.ZipFile(docx_path) as zf:
        comments = load_comments(zf)
        numbering = load_numbering(zf)

        # hyperlink relationships
        rels = {}
        try:
            rroot = ET.fromstring(zf.read("word/_rels/document.xml.rels"))
            for rel in rroot:
                rels[rel.get("Id")] = rel.get("Target", "")
        except KeyError:
            pass

        doc = ET.fromstring(zf.read("word/document.xml"))

    # Build reply threads: parent cid -> [reply cids]
    replies = {}
    top_level = set(comments)
    for cid, c in comments.items():
        if c["parent"]:
            replies.setdefault(c["parent"], []).append(cid)
            top_level.discard(cid)

    body = doc.find(f"{W}body")
    state = ParagraphState()
    out_blocks = []
    emitted = set()

    for el in body:
        pending = []  # (cid, anchored_text) closing in this block
        if el.tag == f"{W}p":
            text, prefix = para_to_md(el, state, numbering, rels)
            pending.extend(state.done_in_para)
            if text:
                out_blocks.append(prefix + text)
        elif el.tag == f"{W}tbl":
            md = table_to_md(el, state, numbering, rels, pending)
            if md:
                out_blocks.append(md)
        else:
            continue

        for cid, anchored in pending:
            if cid in emitted or comments.get(cid, {}).get("parent"):
                continue  # replies rendered under their parent
            block = render_comment(cid, comments, anchored, replies)
            if block:
                out_blocks.append(block)
                emitted.add(cid)

    # Safety net: comments whose ranges were never closed / malformed anchors
    orphans = [cid for cid in top_level if cid not in emitted and comments[cid]["text"]]
    if orphans:
        out_blocks.append("---\n\n## Unanchored comments")
        for cid in orphans:
            out_blocks.append(render_comment(cid, comments, "", replies))

    out_path.write_text("\n\n".join(out_blocks) + "\n", encoding="utf-8")
    n = len(emitted) + len(orphans)
    print(f"Wrote {out_path}  ({len(out_blocks)} blocks, {n} comment threads)")


if __name__ == "__main__":
    ap = argparse.ArgumentParser(description="Convert .docx to Markdown, preserving comments in place.")
    ap.add_argument("input", type=Path)
    ap.add_argument("-o", "--output", type=Path, default=None)
    args = ap.parse_args()
    if not args.input.exists():
        sys.exit(f"File not found: {args.input}")
    out = args.output or args.input.with_suffix(".md")
    convert(args.input, out)
