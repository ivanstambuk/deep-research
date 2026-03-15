#!/usr/bin/env python3
"""Validate YAML front matter and visible metadata line in DR documents.

Checks:
  1. YAML front matter exists and is parseable
  2. Required fields are present: title, dr_id, status, authors, date_created, date_updated
  3. `status` is one of the allowed values: draft, published, archived
  4. `dr_id` matches the filename pattern (DR-NNNN)
  5. `date_created` and `date_updated` are valid ISO dates (YYYY-MM-DD)
  6. `date_updated` is not earlier than `date_created`
  7. Visible metadata line exists and its status matches the YAML `status`

Usage:
  python3 .githooks/validate-front-matter.py papers/DR-0001-*.md [papers/DR-0002-*.md ...]

Exit codes:
  0 — all checks passed
  1 — one or more checks failed (details printed to stderr)
"""

import re
import sys
from datetime import date
from pathlib import Path

ALLOWED_STATUSES = {"draft", "published", "archived"}

REQUIRED_FIELDS = {"title", "dr_id", "status", "authors", "date_created", "date_updated"}

# Display name for each status (used in the visible metadata line)
STATUS_DISPLAY = {
    "draft": "Draft",
    "published": "Published",
    "archived": "Archived",
}


def parse_yaml_front_matter(lines: list[str]) -> tuple[dict | None, str | None]:
    """Extract YAML front matter fields from lines.

    Returns (fields_dict, error_message). Uses simple regex parsing
    to avoid a PyYAML dependency.
    """
    if not lines or lines[0].rstrip() != "---":
        return None, "No YAML front matter found (file must start with '---')"

    end_idx = None
    for i in range(1, len(lines)):
        if lines[i].rstrip() == "---":
            end_idx = i
            break

    if end_idx is None:
        return None, "YAML front matter is not closed (missing closing '---')"

    fields: dict = {}
    for line in lines[1:end_idx]:
        # Skip blank lines and continuation lines (e.g., list items under authors)
        stripped = line.rstrip()
        if not stripped or stripped.startswith("  ") or stripped.startswith("\t"):
            # Capture author name from nested list
            m = re.match(r"\s+-\s+name:\s+(.+)", stripped)
            if m and "authors" not in fields:
                fields["authors"] = m.group(1).strip()
            elif m:
                pass  # additional authors, first is enough for validation
            continue
        m = re.match(r"^(\w[\w_]*):\s*(.*)", stripped)
        if m:
            key = m.group(1)
            val = m.group(2).strip()
            # Strip surrounding quotes
            if val.startswith('"') and val.endswith('"'):
                val = val[1:-1]
            elif val.startswith("'") and val.endswith("'"):
                val = val[1:-1]
            fields[key] = val

    return fields, None


def find_visible_metadata_line(lines: list[str]) -> tuple[int | None, str | None]:
    """Find the visible metadata line: **DR-NNNN** · Status · ...

    Returns (line_index, line_content) or (None, None) if not found.
    Searches within the first 30 lines (after front matter).
    """
    for i, line in enumerate(lines[:30]):
        if re.match(r"^\*\*DR-\d{4}\*\*\s+·", line):
            return i, line.rstrip()
    return None, None


def validate_file(filepath: Path) -> list[str]:
    """Validate a single DR file. Returns a list of error messages."""
    errors = []
    try:
        content = filepath.read_text(encoding="utf-8")
    except Exception as e:
        return [f"Cannot read file: {e}"]

    lines = content.split("\n")

    # ── 1. Parse front matter ─────────────────────────────────────────
    fields, parse_err = parse_yaml_front_matter(lines)
    if parse_err or fields is None:
        errors.append(parse_err or "No front matter found")
        return errors  # can't continue without front matter
    assert fields is not None  # help type checker after early return

    # ── 2. Required fields ────────────────────────────────────────────
    missing = REQUIRED_FIELDS - set(fields.keys())
    if missing:
        errors.append(f"Missing required front matter fields: {', '.join(sorted(missing))}")

    # ── 3. Status validation ──────────────────────────────────────────
    status = fields.get("status", "")
    if status and status not in ALLOWED_STATUSES:
        errors.append(
            f"Invalid status '{status}' in YAML front matter. "
            f"Allowed values: {', '.join(sorted(ALLOWED_STATUSES))}"
        )

    # ── 3b. Draft documents cannot be committed ──────────────────────
    if status == "draft":
        errors.append(
            f"Cannot commit a document with status 'draft'. "
            f"Draft documents are work-in-progress and must not be committed. "
            f"Change the front matter status to 'published' (or 'archived') "
            f"before committing."
        )

    # ── 4. DR ID matches filename ─────────────────────────────────────
    dr_id = fields.get("dr_id", "")
    if dr_id:
        expected_prefix = dr_id.upper()  # e.g., DR-0001
        if not filepath.name.startswith(expected_prefix.replace("DR-", "DR-").lower()) and \
           not filepath.name.upper().startswith(expected_prefix):
            # More lenient: just check the ID appears in the filename
            if dr_id.lower().replace("-", "-") not in filepath.name.lower():
                errors.append(
                    f"dr_id '{dr_id}' does not match filename '{filepath.name}'. "
                    f"Expected filename to start with '{dr_id}'"
                )

    # ── 5. Date validation ────────────────────────────────────────────
    date_created_str = fields.get("date_created", "")
    date_updated_str = fields.get("date_updated", "")
    date_created = None
    date_updated = None

    for label, val in [("date_created", date_created_str), ("date_updated", date_updated_str)]:
        if val:
            try:
                parsed = date.fromisoformat(val)
                if label == "date_created":
                    date_created = parsed
                else:
                    date_updated = parsed
            except ValueError:
                errors.append(f"'{label}' value '{val}' is not a valid ISO date (expected YYYY-MM-DD)")

    # ── 6. date_updated >= date_created ───────────────────────────────
    if date_created and date_updated:
        if date_updated < date_created:
            errors.append(
                f"date_updated ({date_updated_str}) is earlier than "
                f"date_created ({date_created_str})"
            )

    # ── 7. Visible metadata line consistency ──────────────────────────
    line_idx, meta_line = find_visible_metadata_line(lines)
    if meta_line and status:
        expected_display = STATUS_DISPLAY.get(status, status.title())
        # Extract the status token from the visible line:
        # **DR-0001** · Draft · Last updated 2026-03-15 · ~10,400 lines
        parts = [p.strip() for p in meta_line.split("·")]
        if len(parts) >= 2:
            visible_status = parts[1]
            if visible_status != expected_display:
                errors.append(
                    f"Visible metadata line (line {line_idx + 1}) shows status "
                    f"'{visible_status}' but YAML front matter has status '{status}'. "
                    f"Expected visible status: '{expected_display}'"
                )
        # Also check DR ID consistency
        m = re.match(r"\*\*([^*]+)\*\*", parts[0])
        if m:
            visible_dr_id = m.group(1)
            if visible_dr_id != dr_id:
                errors.append(
                    f"Visible metadata line shows DR ID '{visible_dr_id}' "
                    f"but YAML front matter has dr_id '{dr_id}'"
                )

    return errors


def main():
    if len(sys.argv) < 2:
        print(f"Usage: {sys.argv[0]} <file.md> [<file2.md> ...]", file=sys.stderr)
        sys.exit(2)

    all_passed = True

    for filepath_str in sys.argv[1:]:
        filepath = Path(filepath_str)
        if not filepath.exists():
            continue
        
        # Only validate deep research documents (which start with DR-)
        if not filepath.name.upper().startswith("DR-"):
            continue

        errors = validate_file(filepath)
        if errors:
            all_passed = False
            print(f"╔══════════════════════════════════════════════════════════════════╗", file=sys.stderr)
            print(f"║  ❌ FRONT MATTER VALIDATION FAILED                              ║", file=sys.stderr)
            print(f"╚══════════════════════════════════════════════════════════════════╝", file=sys.stderr)
            print(f"", file=sys.stderr)
            print(f"  File: {filepath}", file=sys.stderr)
            print(f"", file=sys.stderr)
            for err in errors:
                print(f"  • {err}", file=sys.stderr)
            print(f"", file=sys.stderr)
            print(f"REFERENCE:", file=sys.stderr)
            print(f"  Allowed statuses: {', '.join(sorted(ALLOWED_STATUSES))}", file=sys.stderr)
            print(f"  Status lifecycle: draft → published → archived", file=sys.stderr)
            print(f"  Required fields:  {', '.join(sorted(REQUIRED_FIELDS))}", file=sys.stderr)
            print(f"", file=sys.stderr)
            print(f"HOW TO FIX:", file=sys.stderr)
            print(f"  1. Open the file and check the YAML block between the --- markers", file=sys.stderr)
            print(f"  2. Ensure 'status' is one of: draft, published, archived", file=sys.stderr)
            print(f"  3. If present, ensure the visible metadata line matches:", file=sys.stderr)
            print(f"     **DR-NNNN** · Draft · Last updated YYYY-MM-DD · ~N lines", file=sys.stderr)
            print(f"  4. Re-validate: python3 .githooks/validate-front-matter.py {filepath}", file=sys.stderr)
            print(f"", file=sys.stderr)

    sys.exit(0 if all_passed else 1)


if __name__ == "__main__":
    main()
