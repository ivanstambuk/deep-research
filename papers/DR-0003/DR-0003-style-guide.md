# DR-0003 Manual of Style

This document defines the editorial and visual conventions for **DR-0003: Cryptographic Hash Functions**. It serves as a reference for maintaining consistency when editing or extending this document.

## Document Structure

### Hierarchy
- `## Group` — Major thematic groupings (e.g., "The Foundations and Vulnerable Legacy Hashing")
- `### Chapter` — Topical chapters within groups
- `#### Section` — Individual topics within chapters

**Rules:**
- Prefer fewer, larger chapters. Split into a new chapter only when a section grows large (~100+ lines).
- Never merge Findings, Recommendations, or Open Questions chapters.
- Remove group headings that contain only one chapter.

### Frontmatter
```yaml
---
title: "Cryptographic Hash Functions"
dr_id: DR-0003
status: draft
authors:
  - name: Ivan Stambuk
date_created: YYYY-MM-DD
date_updated: YYYY-MM-DD
tags: [cryptography, hash-functions, ...]
related: []
style_guide: DR-0003-style-guide.md
---
```

---

## Table of Contents

### Structure
The TOC must contain **only** chapter-level (`###`) entries under each group. Do not include section-level (`####`) or deeper subsections.

**Maximum depth:**
```text
- Group Heading
  - 1. Chapter Title
  - 2. Another Chapter
```

❌ **Forbidden:**
```text
- Group Heading
  - 9. Chapter Title
    - 9.0. Section        ← Do not include
    - 9.1. Another Section ← Do not include
```

**Rationale:** DR documents are 5,000–30,000+ lines. Including every section makes TOCs unusably long. Readers can navigate within chapters using the document's internal structure.

### Exceptions
- **Appendices** and **Synthesis chapters** (Findings, Recommendations, Open Questions) follow the same rule—chapter-level only.
- **Reading Guide** tables may reference specific sections for navigation guidance; that is separate from the TOC.

---

## Collapsible Sections

DR-0003 uses five collapsible patterns with emoji prefixes. Each serves a distinct pedagogical purpose.

### 1. 📖 Prerequisite
Background knowledge required to understand the main content. Readers who lack this foundation should expand these first.

```markdown
<details>
<summary><strong>📖 Prerequisite: Title</strong></summary>

> Explanation of prerequisite concept...
>
> ### Subheading if needed
> Additional details...

</details><br/>
```

### 2. 📎 Clarification
Self-contained elaboration of a dense concept, model, notation, or paragraph-level idea introduced in the main text. Clarifications are used to fill knowledge gaps without simplifying the mainline prose.

```markdown
<details>
<summary><strong>📎 Clarification: Title</strong></summary>

> Formal elaboration of the concept...
>
> Additional intuition, notation unpacking, examples, tables, or Mermaid diagrams may appear here if they materially improve understanding.

</details><br/>
```

**Rules:**
- Place the clarification immediately after the definition, theorem, or paragraph it expands.
- Keep the main text dense and self-sufficient; the clarification is optional support, not a replacement.
- Explain the concept in a more explicit and pedagogical way, but **do not** adopt a casual, conversational, or "dumbed-down" tone.
- Avoid filler scaffolding such as "the phrase means..." or "nobody is claiming...".
- Prefer formal elaboration: define the model boundary, unpack notation, state what is included or excluded, and explain why the concept matters.
- For mathematical, cryptographic, or protocol concepts, include at least one **technical anchor** whenever reasonably possible: a compact formula restatement, variable legend, comparison table, worked example, micro-derivation, or Mermaid diagram.
- Pure-prose clarifications should be the exception rather than the default for technical sections.
- Use prose mainly as connective tissue around the technical anchor, not as the entire clarifying payload.
- Clarifications may be long. They may include tables, examples, and Mermaid diagrams when these genuinely improve comprehension.
- Explain a concept well at its first natural introduction; do not repeat the same clarification later unless new context requires a materially different explanation.

### 3. 🔧 Deep Dive
Extended technical analysis for readers who want more depth. The main content should be complete without reading these.

```markdown
<details>
<summary><strong>🔧 Deep Dive: Title</strong></summary>

> In-depth technical explanation...
>
> ### Subheading
> Mathematical proofs, algorithm details, etc.

</details><br/>
```

`🔧 Deep Dive` may also be used for optional proof-oriented expansions, with titles such as `🔧 Deep Dive: Proof Sketch — Why ...`.

### 4. ⚙️ Application
Real-world practical applications, code examples, and security recommendations.

```markdown
<details>
<summary><strong>⚙️ Application: Title</strong></summary>

> Practical guidance...
>
> ```language
> Code example if applicable
> ```
>
> **Recommendation:** Specific advice...

</details><br/>
```

### 5. 📜 Historical
Chronological narratives of attacks, deprecation timelines, and standards evolution. Contextual — not required to understand the main content, but enriches understanding of how and why the field evolved.

```markdown
<details>
<summary><strong>📜 Historical: Title</strong></summary>

> Chronological narrative of events...
>
> | Year | Event |
> |------|-------|
> | ...  | ...   |

</details><br/>
```

### Formatting Rules
- Include `<br/>` after closing `</details>` for spacing — **except** when the next element is a heading (`##`–`#####`). Headings provide their own top margin; adding `<br/>` creates an ugly double gap.
- Begin content with a blockquote (`>`) for visual separation
- Do not begin a collapsible with a section header. The first sentence or first technical artifact should start directly; use subheadings (`###`, `####`) only after the opening material when they materially improve structure.
- Keep titles concise but descriptive
- The internal tone of `📎 Clarification` should remain academically formal, even when more explanatory than the main text

### Collapsible Review
- Treat collapsibles as editorial tools, not permanent fixtures. A box should remain only if it materially improves understanding, navigation, or depth.
- When revising a dense section, review collapsibles one by one rather than assuming existing boxes are automatically correct.
- Use judgment rather than a rigid template. Depending on the concept, a box may need to be kept, expanded, contracted, merged with a nearby box, moved, retyped, or removed.
- Review the mainline and the collapsible together. Improving one often creates redundancy in the other.
- Prefer explaining a concept substantially once at its best natural introduction, then keeping later references lighter unless new context genuinely requires a different explanation.
- If a box no longer adds distinct value beyond nearby prose, remove it or fold only its unique insight into the surrounding text.
- For foundational concepts, longer mini-article clarifications are appropriate when they materially improve re-entry and understanding. For local concepts, prefer tighter boxes.

---

## Mermaid Diagrams

### Theme Philosophy
**Use Mermaid's native auto-theming.** Do not force colors that break on dark/light theme switches.

### Allowed Styling

✅ **Permitted:**
```mermaid
style NodeName text-align:left, stroke:#27ae60, stroke-width:2px
classDef important stroke:#e74c3c, stroke-width:3px
```

❌ **Forbidden:**
```mermaid
style NodeName fill:#e8f5e9, stroke:#27ae60    # No fill colors
classDef node fill:#1e293b, color:#fff         # No fill/text colors
themeVariables:
  primaryTextColor: "#f1f5f9"                  # No theme variables
```

### Subgraph Titles
Force single-line titles using `&nbsp;` instead of `<br/>` to prevent overlap:

✅ **Correct:**
```
subgraph Parallel["`**Parallel&nbsp;Leaf&nbsp;Processing&nbsp;(Independent&nbsp;CPU&nbsp;Cores)**`"]
```

❌ **Incorrect:**
```
subgraph Parallel["`**Parallel&nbsp;Leaf&nbsp;Processing**<br/>(Independent&nbsp;CPU&nbsp;Cores)`"]
```

### Semantic Stroke Colors
Use consistent colors for semantic meaning:
- **Red** (`#e74c3c`, `#c0392b`) — Critical, root, danger
- **Green** (`#27ae60`, `#2ecc71`) — Success, active, selected
- **Blue** (`#3498db`, `#3b82f6`) — Info, path, secondary
- **Purple** (`#9b59b6`) — Tertiary elements

### Structural Config (OK to keep)
```yaml
---
config:
  flowchart:
    nodeSpacing: 18
    rankSpacing: 30
---
```

### Diagram Types
| Type | Use Case | Notes |
|------|----------|-------|
| `flowchart TD/LR` | Process flows, architecture | Use `direction LR` inside subgraphs for horizontal layouts |
| `sequenceDiagram` | Protocol interactions | Use `rect rgba(...)` for phases, never `rgb()` |
| `timeline` | Historical evolution | Minimal styling needed |
| `xychart-beta` | Performance comparisons | Remove all `themeVariables` |

---

## Prose Style

DR-0003 uses a **maximum-density academic register** throughout. This is intentional and must be preserved:

- **Do not simplify prose for readability.** Technical density is a feature, not a bug. Sentences should pack maximum information per line.
- **Prefer precise technical vocabulary** over colloquial alternatives (e.g., "structurally quarantined from direct external interaction" over "hidden from input").
- **Adverbs like "natively," "mathematically," "deterministically"** are used deliberately to reinforce the formality of constructions and should not be removed for brevity.
- **The Synthesis sections** (Findings, Recommendations, Open Questions) should match the density of the body, not simplify it.

---

## Typography

### Mathematical Notation
- Inline math: `$H(m)$`, `$2^{64}$`
- Block math: `$$H(m) = \text{Compress}(h_{i-1}, M_i)$$`
- Subscripts in text: Use `<sub>` tags (e.g., `CV<sub>1</sub>`)
- Subscripts in Mermaid: Use Unicode subscript characters (e.g., `Hᵢ₋₁` not `H_{i-1}`) — LaTeX `$...$` notation crashes Mermaid's parser
- Operations: `‖` for concatenation, `⊕` for XOR, `⊕=` for XOR-assign

### Unicode Symbols
- Section sign: `§` (e.g., §5.1)
- Em dash: `—` for breaks
- Arrows: `→` `←` `↔` in text
- Check/cross: `✅` `❌` in tables
- Warning: `⚠️` for important notes

### Code Blocks
- Language tag required: ` ```rust `, ` ```python `, ` ```bash `
- Pseudocode: ` ```text ` or ` ```pseudocode `
- Inline code: Use backticks for `function_names`, `variable_names`, `constants`

---

## Tables

### Decision Guides
DR-0003 uses decision guide tables to help readers choose between alternatives:

```markdown
| Criterion | Option A | Option B | Option C |
|-----------|----------|----------|----------|
| **Factor 1** | Good | Better | Best |
| **Factor 2** | Fast | Slow | Medium |
| **Use case** | X | Y | Z |
```

**Rules:**
- First column is the criterion (bold header)
- Include a "Use case" row when comparing practical options
- Use emoji sparingly (✅/❌) for quick visual scanning

---

## Sequence Diagram Walkthroughs

Per AGENTS.md, every sequence diagram must be followed by collapsible `<details>` walkthrough steps with:

1. **Actor-first naming**: Step title begins with the actor performing the action
2. **Rich descriptions**: Substantive explanation, not just restating the title
3. **Payload embedding**: Include code blocks for protocol messages when applicable

Example:
```markdown
<details>
<summary><strong>1. Client submits authentication request to Server</strong></summary>

The client initiates the handshake by sending its supported cipher suites
and a random nonce. The server selects the strongest mutually-supported cipher.

```json
{
  "client_hello": {
    "random": "0x1a2b3c...",
    "cipher_suites": ["TLS_AES_256_GCM_SHA384", "TLS_CHACHA20_POLY1305_SHA256"]
  }
}
```

</details>
```

---

## Cross-References

### Internal Links
- Section: `[Section Title](#section-title)`
- Chapter: `[Chapter Name](#chapter-name)`
- Collapsible: Cannot link directly; reference the parent section

### External References
- RFCs: `[RFC 8391](https://www.rfc-editor.org/rfc/rfc8391)`
- Papers: `[Author, Year](https://doi.org/...)`
- Standards: `[FIPS 202](https://csrc.nist.gov/publications/detail/fips/202/final)`

---

## Editing Workflow

1. **Read context first** — Read surrounding sections before editing
2. **Targeted edits** — Use `replace_string_in_file`, not full rewrites
3. **Validate diagrams** — Run `mermaid-diagram-validator` after Mermaid changes
4. **Check dark theme** — Preview in VS Code dark mode
5. **Git hooks** — Pre-commit hooks will catch structural errors
