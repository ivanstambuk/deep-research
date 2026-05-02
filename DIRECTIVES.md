# Directive Style Guide

This repository uses **directives** for high-signal callouts inside DR documents.

---

## Syntax

Use fenced container directives:

```md
:::warning[Custom Title]
Directive body text.
:::
```

The optional bracketed title becomes the visible directive title. If omitted, only the directive chip is shown.

---

## Tabbed Example Groups

Use `tabbed-example` when several sibling examples implement the same concept in different languages or variants. The reader renders the examples as tabs; generated Markdown lowers them back to headings plus escaped details blocks so the static artifact remains readable.

````md
::::tabbed-example[Manual memory management examples]{persist="dr-0006-memory-management"}
:::tab[C++23]{key="cpp" subtitle="RAII, unique_ptr, custom deleters" heading="5.2.2 C++23: RAII and Smart Pointers" anchor="522-c23-raii-and-smart-pointers" level="5"}
```cpp
// example
```
:::

:::tab[Zig 0.14]{key="zig" subtitle="Allocator interface, defer, DebugAllocator" heading="5.2.3 Zig 0.14: Explicit Allocators and Defer" anchor="523-zig-014-explicit-allocators-and-defer" level="5"}
```zig
// example
```
:::
::::
````

Attributes:

- `tabbed-example` label: required visible group title.
- `persist`: optional reader-local persistence family. Use lowercase kebab-case or namespaced keys.
- `tab` label: required visible tab label. Keep it compact; put longer qualifiers in `subtitle`.
- `key`: required stable tab key, unique inside the group.
- `subtitle`: optional short descriptor shown under the tab label.
- `heading`: optional preserved heading text for existing numbered sections.
- `anchor`: required with `heading` when replacing an existing anchored section.
- `level`: optional preserved heading level, usually `5` or `6` for existing example subsections.

Authoring rules:

1. Use tabs for direct comparison: same problem, same conceptual slot, different language or implementation variant.
2. Use tabs for Mermaid diagrams only when a single figure is really several standalone sibling clusters. Keep one integrated diagram when cross-cluster arrows, shared terminals, or a single end-to-end flow carry the meaning.
3. Do not use tabs for unrelated examples or a list of examples inside one language; ordinary details blocks read better there.
4. Prefer short tab labels such as `Rust`, `Go`, `C++23`, or `Ada 2022`. Put detail like “broadcast channel” or “functional options” in `subtitle`.
5. Preserve existing `heading` / `anchor` metadata when converting numbered sections so outline links and cross-references keep working.
6. Avoid adding new structural headings inside tab bodies unless they are intentional preserved anchors.
7. Do not nest `tabbed-example` groups.

---

## Supported Types

- `warning`
  Concrete risks, anti-patterns, exploit paths, legal exposure, or failure modes a reader could act on incorrectly.
- `caution`
  Meaningful caveats, trade-offs, lock-in concerns, hidden costs, or architecture constraints that matter but are less severe than a warning.
- `important`
  Hard requirements, must-not-miss architectural constraints, or statements that should shape design decisions even when they are not framed as a risk.
- `note`
  Scope clarifications, category boundaries, protocol-context clarifications, and “this is not the same as X” explanations.
- `tip`
  Practical implementation guidance, heuristics, shortcuts, or operator advice that improves execution quality.
- `info`
  Neutral factual context that is useful but not urgent. Use sparingly.
- `remark`
  Interpretive commentary or synthesis where a callout helps readability but none of the stronger semantics apply. Use sparingly.

---

## Editorial Rules

1. Prefer a directive only when the content has a clear semantic role beyond normal prose.
2. Do not convert every bold sentence into a directive.
3. Do not stack multiple directives back-to-back unless they clearly carry different meanings.
4. Prefer one strong directive over two weak ones.
5. Use directives for reader navigation and emphasis, not decoration.
6. Keep directive bodies short when possible: ideally one short paragraph, occasionally two.
7. A subsection should usually contain `0` or `1` directive. `2` is acceptable only when the subsection genuinely contains two distinct callout-worthy ideas.

---

## Good Candidates

- critical security requirements
- best-practice implementation guidance
- status clarifications
- caveats and lock-in warnings
- “do not do this” guidance
- high-signal operational constraints

---

## Poor Candidates

- routine summaries
- ordinary recommendations tables
- generic introductory framing
- every emphasized sentence
- content whose importance is already obvious from the surrounding heading structure
