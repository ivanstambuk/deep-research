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
