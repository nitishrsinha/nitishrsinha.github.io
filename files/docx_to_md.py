#!/usr/bin/env python3
"""
docx_to_md.py — Convert a .docx to Markdown for LLM consumption.

Design goals (in order):
  1. Comments stay in place, anchored to a quoted span and a paragraph ID.
  2. Tracked changes render as CriticMarkup with author attribution:
     {++inserted++}{>>ins: Author date<<}   {--deleted--}{>>del: Author date<<}
  3. Every body paragraph carries a stable ID [¶n].
  4. A "Numeric index" table at the top lists every number with its ¶ ID
     and local context, computed on the changes-accepted text.

Example comment block in the output:

    > 💬 **Jane Doe** (2026-06-12) on ¶3, anchored to "rose 25 basis points":
    > Check against numerical tables — I get 22 bps.
    >     ↳ **Bob Smith** (reply): Fixed in v3.

Usage:
    python docx_to_md.py input.docx [-o output.md]

Stdlib only — no dependencies.
"""

from __future__ import annotations

import argparse
import re
import sys
import zipfile
import xml.etree.ElementTree as ET
from dataclasses import dataclass, field
from pathlib import Path
from xml.etree.ElementTree import Element

# OOXML namespaces. Tags in ElementTree appear as "{namespace}localname".
WORD_NS = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"
WORD_2012_NS = "{http://schemas.microsoft.com/office/word/2012/wordml}"
RELATIONSHIP_NS = "{http://schemas.openxmlformats.org/officeDocument/2006/relationships}"

ANCHOR_PREVIEW_MAX_CHARS = 80
NUMBER_CONTEXT_CHARS = 45

# Matches standalone numeric tokens (25, 1,250.5, 3.2%, -10) while
# excluding dates (2026-06-12), versions (3.1.4), and word-attached digits.
NUMERIC_TOKEN_PATTERN = re.compile(
    r"(?<![\w./-])[+-]?\d[\d,]*(?:\.\d+)?%?(?![\w/-])"
)


# --------------------------------------------------------------------------
# Data model
# --------------------------------------------------------------------------

@dataclass
class Comment:
    """One Word comment (or reply) from word/comments.xml."""
    comment_id: str
    author: str
    date: str                       # ISO date (YYYY-MM-DD) or ""
    text: str
    paragraph_xml_ids: list[str]    # w15:paraId values, used for threading
    parent_id: str | None = None    # set if this comment is a reply


@dataclass
class NumericEntry:
    """One numeric token found in the document body."""
    paragraph_label: str            # e.g. "¶3"
    value: str                      # e.g. "25" or "3.2%"
    context: str                    # surrounding text snippet


@dataclass
class ConversionState:
    """Mutable state threaded through paragraph conversion."""
    # comment_id -> accumulated plain text inside its open range
    open_comment_anchors: dict[str, list[str]] = field(default_factory=dict)
    # (comment_id, anchored_text) for ranges that closed in the current block
    closed_comment_anchors: list[tuple[str, str]] = field(default_factory=list)
    # (numbering_id, indent_level) -> current ordinal, for numbered lists
    ordered_list_counters: dict[tuple[str, str], int] = field(default_factory=dict)


# --------------------------------------------------------------------------
# Loading document parts
# --------------------------------------------------------------------------

def read_xml_part(archive: zipfile.ZipFile, part_name: str) -> Element | None:
    """Parse one XML file inside the .docx zip; None if the part is absent."""
    try:
        return ET.fromstring(archive.read(part_name))
    except KeyError:
        return None


def load_comments(archive: zipfile.ZipFile) -> dict[str, Comment]:
    """Load comments and resolve reply threads.

    Comment bodies live in word/comments.xml. Reply relationships live in
    word/commentsExtended.xml, keyed by w15:paraId of the comment's own
    paragraphs (not by comment id — hence the paragraph_xml_ids indirection).
    """
    comments: dict[str, Comment] = {}
    comments_root = read_xml_part(archive, "word/comments.xml")
    if comments_root is None:
        return comments

    for node in comments_root.findall(f"{WORD_NS}comment"):
        paragraph_texts: list[str] = []
        paragraph_xml_ids: list[str] = []
        for paragraph in node.findall(f"{WORD_NS}p"):
            xml_id = paragraph.get(f"{WORD_2012_NS}paraId")
            if xml_id:
                paragraph_xml_ids.append(xml_id)
            paragraph_texts.append(
                "".join(t.text or "" for t in paragraph.iter(f"{WORD_NS}t"))
            )
        comment_id = node.get(f"{WORD_NS}id")
        comments[comment_id] = Comment(
            comment_id=comment_id,
            author=node.get(f"{WORD_NS}author", "Unknown"),
            date=(node.get(f"{WORD_NS}date", "") or "")[:10],
            text="\n".join(t for t in paragraph_texts if t).strip(),
            paragraph_xml_ids=paragraph_xml_ids,
        )

    _resolve_reply_threads(archive, comments)
    return comments


def _resolve_reply_threads(archive: zipfile.ZipFile,
                           comments: dict[str, Comment]) -> None:
    """Set Comment.parent_id using word/commentsExtended.xml, if present."""
    extended_root = read_xml_part(archive, "word/commentsExtended.xml")
    if extended_root is None:
        return

    reply_to_parent_xml_id: dict[str, str] = {}
    for node in extended_root.iter(f"{WORD_2012_NS}commentEx"):
        child_xml_id = node.get(f"{WORD_2012_NS}paraId")
        parent_xml_id = node.get(f"{WORD_2012_NS}paraIdParent")
        if child_xml_id and parent_xml_id:
            reply_to_parent_xml_id[child_xml_id] = parent_xml_id

    xml_id_to_comment_id = {
        xml_id: comment.comment_id
        for comment in comments.values()
        for xml_id in comment.paragraph_xml_ids
    }
    for comment in comments.values():
        for xml_id in comment.paragraph_xml_ids:
            parent_xml_id = reply_to_parent_xml_id.get(xml_id)
            if parent_xml_id in xml_id_to_comment_id:
                comment.parent_id = xml_id_to_comment_id[parent_xml_id]
                break


def load_list_formats(archive: zipfile.ZipFile) -> dict[tuple[str, str], str]:
    """Map (numbering_id, indent_level) -> numFmt ("bullet", "decimal", ...).

    word/numbering.xml has two layers: concrete <w:num> entries reference
    shared <w:abstractNum> definitions that hold the per-level formats.
    """
    formats: dict[tuple[str, str], str] = {}
    numbering_root = read_xml_part(archive, "word/numbering.xml")
    if numbering_root is None:
        return formats

    abstract_formats: dict[tuple[str, str], str] = {}
    for abstract in numbering_root.findall(f"{WORD_NS}abstractNum"):
        abstract_id = abstract.get(f"{WORD_NS}abstractNumId")
        for level in abstract.findall(f"{WORD_NS}lvl"):
            format_node = level.find(f"{WORD_NS}numFmt")
            format_name = (format_node.get(f"{WORD_NS}val")
                           if format_node is not None else "decimal")
            abstract_formats[(abstract_id, level.get(f"{WORD_NS}ilvl"))] = format_name

    for concrete in numbering_root.findall(f"{WORD_NS}num"):
        numbering_id = concrete.get(f"{WORD_NS}numId")
        abstract_ref = concrete.find(f"{WORD_NS}abstractNumId")
        if abstract_ref is None:
            continue
        abstract_id = abstract_ref.get(f"{WORD_NS}val")
        for (candidate_id, indent_level), format_name in abstract_formats.items():
            if candidate_id == abstract_id:
                formats[(numbering_id, indent_level)] = format_name
    return formats


def load_hyperlink_targets(archive: zipfile.ZipFile) -> dict[str, str]:
    """Map relationship id -> URL, from word/_rels/document.xml.rels."""
    relationships_root = read_xml_part(archive, "word/_rels/document.xml.rels")
    if relationships_root is None:
        return {}
    return {node.get("Id"): node.get("Target", "") for node in relationships_root}


# --------------------------------------------------------------------------
# Run- and paragraph-level conversion
# --------------------------------------------------------------------------

def escape_markdown(text: str) -> str:
    return re.sub(r"([\\`*_])", r"\\\1", text)


def _format_flag_enabled(run_properties: Element, tag: str) -> bool:
    """True if a boolean run property (w:b, w:i, ...) is present and not 'false'."""
    node = run_properties.find(f"{WORD_NS}{tag}")
    return node is not None and node.get(f"{WORD_NS}val") != "false"


def run_to_markdown(run: Element) -> str:
    """Convert one <w:r> to markdown, applying bold/italic/strikethrough."""
    text = "".join(
        child.text or "" if child.tag == f"{WORD_NS}t"
        else ("\n" if child.tag == f"{WORD_NS}br" else "\t")
        for child in run
        if child.tag in (f"{WORD_NS}t", f"{WORD_NS}br", f"{WORD_NS}tab")
    )
    if not text:
        return ""

    run_properties = run.find(f"{WORD_NS}rPr")
    if run_properties is None or not text.strip():
        return escape_markdown(text)

    # Emphasis markers must hug non-whitespace, so re-attach edge whitespace.
    leading_ws = text[: len(text) - len(text.lstrip())]
    trailing_ws = text[len(text.rstrip()):]
    core = escape_markdown(text.strip())

    bold = _format_flag_enabled(run_properties, "b")
    italic = _format_flag_enabled(run_properties, "i")
    if bold and italic:
        core = f"***{core}***"
    elif bold:
        core = f"**{core}**"
    elif italic:
        core = f"*{core}*"
    if run_properties.find(f"{WORD_NS}strike") is not None:
        core = f"~~{core}~~"
    return leading_ws + core + trailing_ws


def _revision_attribution(node: Element, kind: str) -> str:
    """CriticMarkup comment crediting a tracked change, e.g. {>>ins: Jane 2026-06-12<<}."""
    author = node.get(f"{WORD_NS}author", "")
    if not author:
        return ""
    date = (node.get(f"{WORD_NS}date", "") or "")[:10]
    return f"{{>>{kind}: {author} {date}<<}}"


def paragraph_to_markdown(paragraph: Element,
                          state: ConversionState,
                          list_formats: dict[tuple[str, str], str],
                          hyperlink_targets: dict[str, str]) -> tuple[str, str]:
    """Convert one <w:p> to (markdown_text, block_prefix).

    block_prefix is the heading marker ("## ") or list marker ("- ", "1. ").
    Side effects on `state`: comment ranges opened/closed here are recorded,
    and text inside open ranges is accumulated as the comment's anchor.
    """
    state.closed_comment_anchors = []
    markdown_parts: list[str] = []

    def convert_children(element: Element) -> None:
        for child in element:
            tag = child.tag

            if tag == f"{WORD_NS}commentRangeStart":
                state.open_comment_anchors[child.get(f"{WORD_NS}id")] = []

            elif tag == f"{WORD_NS}commentRangeEnd":
                comment_id = child.get(f"{WORD_NS}id")
                if comment_id in state.open_comment_anchors:
                    anchored_text = "".join(
                        state.open_comment_anchors.pop(comment_id))
                    state.closed_comment_anchors.append((comment_id, anchored_text))

            elif tag == f"{WORD_NS}r":
                markdown = run_to_markdown(child)
                if markdown:
                    markdown_parts.append(markdown)
                    plain_text = "".join(
                        t.text or "" for t in child.iter(f"{WORD_NS}t"))
                    for anchor_pieces in state.open_comment_anchors.values():
                        anchor_pieces.append(plain_text)

            elif tag == f"{WORD_NS}hyperlink":
                inner = _convert_subtree(child)
                url = hyperlink_targets.get(child.get(f"{RELATIONSHIP_NS}id"), "")
                markdown_parts.append(f"[{inner}]({url})" if url else inner)

            elif tag == f"{WORD_NS}ins":  # tracked insertion
                inner = _convert_subtree(child)
                if inner:
                    markdown_parts.append(
                        f"{{++{inner}++}}{_revision_attribution(child, 'ins')}")

            elif tag == f"{WORD_NS}del":  # tracked deletion (text in w:delText)
                deleted_text = "".join(
                    t.text or "" for t in child.iter(f"{WORD_NS}delText"))
                if deleted_text:
                    markdown_parts.append(
                        f"{{--{escape_markdown(deleted_text)}--}}"
                        f"{_revision_attribution(child, 'del')}")

            elif tag == f"{WORD_NS}smartTag":
                convert_children(child)

    def _convert_subtree(element: Element) -> str:
        """Convert a child subtree in isolation and return its markdown."""
        subtree_start = len(markdown_parts)
        convert_children(element)
        inner = "".join(markdown_parts[subtree_start:])
        del markdown_parts[subtree_start:]
        return inner

    convert_children(paragraph)
    markdown_text = "".join(markdown_parts).strip()
    block_prefix = _block_prefix(paragraph, state, list_formats)
    return markdown_text, block_prefix


def _block_prefix(paragraph: Element,
                  state: ConversionState,
                  list_formats: dict[tuple[str, str], str]) -> str:
    """Heading or list marker implied by the paragraph's style, or ""."""
    properties = paragraph.find(f"{WORD_NS}pPr")
    if properties is None:
        return ""

    style_node = properties.find(f"{WORD_NS}pStyle")
    style_name = style_node.get(f"{WORD_NS}val") if style_node is not None else ""
    heading_match = re.match(r"Heading(\d)", style_name or "", re.IGNORECASE)
    if heading_match:
        return "#" * int(heading_match.group(1)) + " "
    if style_name == "Title":
        return "# "

    numbering_props = properties.find(f"{WORD_NS}numPr")
    if numbering_props is None:
        return ""
    indent_node = numbering_props.find(f"{WORD_NS}ilvl")
    numbering_node = numbering_props.find(f"{WORD_NS}numId")
    indent_level = indent_node.get(f"{WORD_NS}val") if indent_node is not None else "0"
    numbering_id = numbering_node.get(f"{WORD_NS}val") if numbering_node is not None else None
    indent = "  " * int(indent_level)

    if list_formats.get((numbering_id, indent_level), "bullet") == "bullet":
        return f"{indent}- "
    counter_key = (numbering_id, indent_level)
    state.ordered_list_counters[counter_key] = (
        state.ordered_list_counters.get(counter_key, 0) + 1)
    return f"{indent}{state.ordered_list_counters[counter_key]}. "


def table_to_markdown(table: Element,
                      state: ConversionState,
                      list_formats: dict[tuple[str, str], str],
                      hyperlink_targets: dict[str, str],
                      closed_anchors_out: list[tuple[str, str]]) -> str:
    """Convert a <w:tbl> to a pipe table; first row becomes the header."""
    rows: list[list[str]] = []
    for table_row in table.findall(f"{WORD_NS}tr"):
        cells: list[str] = []
        for table_cell in table_row.findall(f"{WORD_NS}tc"):
            cell_texts: list[str] = []
            for paragraph in table_cell.findall(f"{WORD_NS}p"):
                text, _ = paragraph_to_markdown(
                    paragraph, state, list_formats, hyperlink_targets)
                closed_anchors_out.extend(state.closed_comment_anchors)
                if text:
                    cell_texts.append(text)
            cells.append(" ".join(cell_texts).replace("|", "\\|"))
        rows.append(cells)

    if not rows:
        return ""
    column_count = max(len(row) for row in rows)
    rows = [row + [""] * (column_count - len(row)) for row in rows]
    lines = ["| " + " | ".join(rows[0]) + " |",
             "| " + " | ".join(["---"] * column_count) + " |"]
    lines += ["| " + " | ".join(row) + " |" for row in rows[1:]]
    return "\n".join(lines)


# --------------------------------------------------------------------------
# LLM-grounding features: numeric index and comment rendering
# --------------------------------------------------------------------------

def accept_tracked_changes(markdown: str) -> str:
    """Strip CriticMarkup, keeping insertions and dropping deletions."""
    accepted = re.sub(r"\{>>.*?<<\}", "", markdown)         # attribution notes
    accepted = re.sub(r"\{--.*?--\}", "", accepted)          # deletions
    accepted = re.sub(r"\{\+\+(.*?)\+\+\}", r"\1", accepted)  # keep insertions
    return accepted


def extract_numeric_entries(paragraph_label: str, markdown: str) -> list[NumericEntry]:
    """Find numeric tokens in the changes-accepted text, with local context."""
    plain = re.sub(r"[*_~`|]", "", accept_tracked_changes(markdown))
    entries = []
    for match in NUMERIC_TOKEN_PATTERN.finditer(plain):
        window_start = max(0, match.start() - NUMBER_CONTEXT_CHARS)
        window_end = min(len(plain), match.end() + NUMBER_CONTEXT_CHARS)
        context = " ".join(plain[window_start:window_end].split())
        entries.append(NumericEntry(paragraph_label, match.group(), context))
    return entries


def render_comment_block(comment: Comment,
                         anchored_text: str,
                         replies: list[Comment],
                         paragraph_label: str | None) -> str:
    """Render a comment thread as a markdown blockquote."""
    anchor_preview = anchored_text.strip()
    if len(anchor_preview) > ANCHOR_PREVIEW_MAX_CHARS:
        anchor_preview = anchor_preview[:ANCHOR_PREVIEW_MAX_CHARS - 3] + "..."

    header = f"> 💬 **{comment.author}**"
    if comment.date:
        header += f" ({comment.date})"
    location = f" on {paragraph_label}" if paragraph_label else ""
    header += (f'{location}, anchored to "{anchor_preview}":'
               if anchor_preview else f"{location}:")

    body = "\n".join(f"> {line}" for line in comment.text.splitlines() or [""])
    lines = [header, body]
    for reply in replies:
        reply_text = reply.text.replace("\n", " ")
        lines.append(f">     ↳ **{reply.author}** (reply): {reply_text}")
    return "\n".join(lines)


def render_numeric_index(entries: list[NumericEntry]) -> str:
    lines = ["## Numeric index", "",
             "| ¶ | value | context |", "| --- | --- | --- |"]
    lines += [f"| {e.paragraph_label} | {e.value} | ...{e.context}... |"
              for e in entries]
    return "\n".join(lines)


def grounding_preamble(source_name: str) -> str:
    return (
        f"<!-- Converted from {source_name}. Paragraphs carry stable IDs [¶n]. "
        "When making claims about this document, cite the relevant ¶ ID. "
        "All numeric values are indexed in the table below; treat it as "
        "canonical and do not restate numbers not present in it. -->"
    )


# --------------------------------------------------------------------------
# Document-level conversion
# --------------------------------------------------------------------------

def convert(docx_path: Path, output_path: Path) -> None:
    with zipfile.ZipFile(docx_path) as archive:
        comments = load_comments(archive)
        list_formats = load_list_formats(archive)
        hyperlink_targets = load_hyperlink_targets(archive)
        document_root = read_xml_part(archive, "word/document.xml")

    if document_root is None:
        sys.exit(f"{docx_path} has no word/document.xml — not a .docx?")

    replies_by_parent: dict[str, list[Comment]] = {}
    for comment in comments.values():
        if comment.parent_id:
            replies_by_parent.setdefault(comment.parent_id, []).append(comment)

    state = ConversionState()
    output_blocks: list[str] = []
    rendered_comment_ids: set[str] = set()
    numeric_entries: list[NumericEntry] = []
    paragraph_counter = 0

    for element in document_root.find(f"{WORD_NS}body"):
        closed_anchors: list[tuple[str, str]] = []
        paragraph_label: str | None = None

        if element.tag == f"{WORD_NS}p":
            text, prefix = paragraph_to_markdown(
                element, state, list_formats, hyperlink_targets)
            closed_anchors.extend(state.closed_comment_anchors)
            if text:
                if prefix.startswith("#"):  # headings carry no ¶ ID
                    output_blocks.append(prefix + text)
                else:
                    paragraph_counter += 1
                    paragraph_label = f"¶{paragraph_counter}"
                    output_blocks.append(f"[{paragraph_label}] {prefix}{text}")
                    numeric_entries.extend(
                        extract_numeric_entries(paragraph_label, text))

        elif element.tag == f"{WORD_NS}tbl":
            table_markdown = table_to_markdown(
                element, state, list_formats, hyperlink_targets, closed_anchors)
            if table_markdown:
                paragraph_counter += 1
                paragraph_label = f"¶{paragraph_counter}"
                output_blocks.append(f"[{paragraph_label}]\n{table_markdown}")
                numeric_entries.extend(
                    extract_numeric_entries(paragraph_label, table_markdown))
        else:
            continue

        for comment_id, anchored_text in closed_anchors:
            comment = comments.get(comment_id)
            if (comment is None or comment.parent_id
                    or comment_id in rendered_comment_ids):
                continue  # replies render under their parent
            output_blocks.append(render_comment_block(
                comment, anchored_text,
                replies_by_parent.get(comment_id, []), paragraph_label))
            rendered_comment_ids.add(comment_id)

    # Safety net: comments whose ranges never closed (malformed anchors).
    orphaned = [c for c in comments.values()
                if not c.parent_id and c.comment_id not in rendered_comment_ids
                and c.text]
    if orphaned:
        output_blocks.append("---\n\n## Unanchored comments")
        for comment in orphaned:
            output_blocks.append(render_comment_block(
                comment, "", replies_by_parent.get(comment.comment_id, []), None))

    header_blocks = [grounding_preamble(docx_path.name)]
    if numeric_entries:
        header_blocks.append(render_numeric_index(numeric_entries))
        header_blocks.append("---")

    output_path.write_text(
        "\n\n".join(header_blocks + output_blocks) + "\n", encoding="utf-8")
    thread_count = len(rendered_comment_ids) + len(orphaned)
    print(f"Wrote {output_path}  "
          f"({len(output_blocks)} blocks, {thread_count} comment threads, "
          f"{len(numeric_entries)} indexed numbers)")


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Convert .docx to Markdown, preserving comments, "
                    "tracked changes, and adding LLM-grounding metadata.")
    parser.add_argument("input", type=Path, help="path to the .docx file")
    parser.add_argument("-o", "--output", type=Path, default=None,
                        help="output .md path (default: input with .md suffix)")
    args = parser.parse_args()
    if not args.input.exists():
        sys.exit(f"File not found: {args.input}")
    convert(args.input, args.output or args.input.with_suffix(".md"))


if __name__ == "__main__":
    main()
