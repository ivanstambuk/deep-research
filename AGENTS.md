# Agent Instructions — deep-research

## Repository Purpose

This repository contains **Deep Research (DR)** documents — exhaustive, long-form Markdown articles (5,000–30,000+ lines) with rich Unicode content including section signs (§), em/en dashes (—/–), arrows (→/←/↔), check/cross marks (✅/❌), warning signs (⚠️), and emoji.

## Editing Large Documents

DR documents are very large. When editing:

- **Make targeted, surgical edits.** Do not rewrite or re-emit entire sections unnecessarily.
- **Never read-then-rewrite the whole file** — this is the most common cause of encoding corruption. Use line-targeted replacement tools.
- **Verify the file renders correctly after edits** by spot-checking lines containing Unicode characters near your edit locations.

## Guardrail-First Error Prevention

> **Principle: guardrails catch, error messages teach.**
>
> Do not memorize error-prevention rules. Instead, rely on automated guardrails (pre-commit hooks, linters, validators) to catch mistakes at commit time. When a guardrail blocks your commit, read its error output — it contains everything you need to diagnose and fix the issue.

**When you encounter a new class of recurring mistake** — whether it's a formatting error, a broken cross-reference pattern, a naming convention violation, or anything else that can be detected mechanically:

1. **Propose a new guardrail.** Write a validation script in `.githooks/` and wire it into the pre-commit hook. The script should detect the error class automatically.
2. **Make the error message self-sufficient.** The output must explain: what went wrong, why it's wrong, and exactly how to fix it — with copy-pasteable commands or suggestions where possible. An agent seeing the error for the first time should be able to resolve it without any prior context.
3. **Remove the corresponding rule from AGENTS.md** (if one exists). Once a guardrail catches an error class, there is no need to also document it as a rule agents must remember. The guardrail *is* the rule.

This keeps AGENTS.md small, avoids cognitive load, and ensures consistency through enforcement rather than convention.

## Git Hooks

`.githooks/` validates commits and pushes (activate with `git config core.hooksPath .githooks`). If a hook blocks your commit or push, read its output — it explains what went wrong and how to fix it.

## Main-Only Workflow

**Do NOT create branches.** This repository uses a single-branch workflow — all commits go directly to `main`. Never use `git checkout -b`, `git branch`, or `git switch -c`. The pre-commit hook (Check 0) enforces this and will reject any commit on a non-main branch.

## Research from GitHub Repositories

When researching specifications, standards, or reference implementations hosted on GitHub, **clone the repository locally** (shallow clone to `/tmp/` is fine) and search it with local tools (`grep_search`, `find_by_name`, `view_file`). Do **not** use `read_url_content` or browser tools to scrape GitHub pages — they are unreliable, slow, and often return incomplete content. The sibling directory `/home/ivan/dev/eIDAS20/` contains the eIDAS 2.0 reference material including technical specifications, OpenAPI definitions, and ARF documents.

## Mermaid Diagram Best Practices

While programmatic errors are caught by git hooks, aesthetic consistency across DR documents requires adhering to the following structural patterns when crafting Mermaid diagrams:

1. **Sequence Diagram Readability**: Always define `messageAlign: left` and `noteAlign: left` in the YAML frontmatter. Standard center-aligned text makes complex JSON-RPC payloads and multi-line notes unreadable.
   ```yaml
   ---
   config:
     sequence:
       messageAlign: left
       noteAlign: left
   ---
   sequenceDiagram
   ```
2. **Flowchart & State Diagram Typography**: Do not use generic `<br/>` tags for multi-line nodes. Instead, wrap the node text in **Markdown strings** (``"`...`"``) and apply `text-align: left` to the node's style. This enables native left-aligned typography within the boundaries of the bounding box.
   ```mermaid
   A["`**Bold Header**
   Left-Aligned descriptive text`"]
   style A text-align:left
   ```
3. **Horizontal Layouts in Top-Down Charts**: To force horizontal structuring within a top-down diagram (`flowchart TD`), chain the target nodes together using the invisible link syntax (`~~~`) within a subgraph. This binds them in a single row without disrupting the vertical flow.
4. **Conserving Vertical Space**: To prevent awkward wrapping and reduce vertical bloat in large graphs, force inline titles or long descriptive phrases onto a single line by replacing standard spaces with a non-breaking space (`&nbsp;`).
5. **Code Blocks in Nodes**: Avoid using HTML tags (`<pre>`, `<code>`) for code blocks inside Mermaid nodes, as GitHub's native parser may strip them or format them incorrectly. Instead, use non-breaking spaces (`&nbsp;`) for manual indentation within Markdown strings. *Warning*: Do not use HTML entity hyphens (`&#8209;`) to prevent wrapping, as Mermaid has a known parser bug that renders them incorrectly (e.g., `&-`). Use standard hyphens.
6. **Phase Styling in Sequence Diagrams**: `sequenceDiagram` does not natively support background colors for individual `Note` statements. To style distinct background phases, wrap the steps in `rect rgba(...)` blocks and use `themeVariables` (`noteBkgColor: "transparent"`, `noteBorderColor: "transparent"`) in the YAML frontmatter to allow notes to seamlessly inherit the bounding box's background color without rendering ugly borders. Phase rects **MUST** use `rgba()` with low alpha (≈ 0.14) for dark-theme compatibility:
   - *Grey phase*: `rect rgba(148, 163, 184, 0.14)`
   - *Green phase*: `rect rgba(46, 204, 113, 0.14)`
   - *Yellow phase*: `rect rgba(241, 196, 15, 0.14)`
   - *Red phase*: `rect rgba(231, 76, 60, 0.14)`
   - *Blue phase*: `rect rgba(52, 152, 219, 0.14)`
   - Never use `rect rgb()` — the opaque backgrounds are unreadable on dark theme.
7. **Right-Side Text Cutoff**: Lengthy sequence diagram text extending over the right edge gets cropped when `messageAlign: left` is active because Mermaid does not account for left-aligned message spillover when calculating canvas width. Prevent this by anchoring a "phantom note" to the rightmost actor using a Braille Blank character (`⠀` / U+2800). Combined with transparent borders from the rule above, this invisibly forces the canvas to expand horizontally. Example: `Note right of <RightmostActor>: ⠀`
8. **Self-Referential Logic**: Avoid placing large logic pseudo-code in standalone or floating `Note` boxes. Instead, represent logic processing as a self-referential arrow (e.g., `Agent->>Agent: Validate Token`) with the pseudocode attached appropriately (e.g., `Note right of Agent`).
9. **Backticks in Sequence Diagrams**: Avoid using Markdown backticks (`` ` ``) for URLs, code blocks, or endpoints inside `sequenceDiagram` elements (messages or notes). The mermaid sequence parser treats them as literal characters; use standard text instead.
