# DR Narrative House Style

---

## Purpose

This guide captures the preferred narrative style for Deep Research chapters. It is chapter-agnostic and should be used when drafting, refreshing, or rewriting substantive DR content, especially when a chapter has become technically correct but reads like a pile of tables, matrices, or checklists.

The goal is not to make every chapter sound identical. The goal is to make dense technical material readable from top to bottom: a reader should understand the problem, the actors, the flow of evidence, the implementation consequences, and only then the detailed reference surfaces.

Use this guide together with:

- `AGENTS.md` for repository process rules
- `DIRECTIVES.md` for callout semantics
- `SEQUENCE_DIAGRAM_HOUSE_STYLE.md` for sequence-diagram walkthrough quality

---

## Default Principle

A strong DR chapter should read like a technical story with a clear decision surface, not like an encyclopedia entry.

The reader should be able to answer:

1. What problem does this chapter solve?
2. Who is the operational actor or system boundary?
3. What sequence of decisions or artifacts moves the story forward?
4. Which distinctions matter in implementation?
5. Which tables are reference surfaces, and how should they be used?
6. Where does this chapter stop, and where do neighboring chapters take over?

If the reader can only use the chapter by searching for a table row, the chapter is under-narrated even if the facts are correct.

---

## Gold-Standard Capture Procedure

Before rewriting a chapter for style, compare it against 2-3 strong sections from the same document. Choose examples that are strong on:

- opening thesis and scope boundary
- explanatory flow
- diagram placement
- table discipline
- walkthrough quality
- practical consequences
- cross-reference density without clutter

Do not copy wording. Capture the structure and pacing:

| What to inspect | What to learn |
|:----------------|:--------------|
| Opening paragraphs | How quickly the section establishes the problem, actor, and boundary. |
| First diagram or table | Whether the reader gets a mental model before reference detail. |
| Table introductions | How the prose tells the reader why the table exists and how to read it. |
| Transitions | How the section moves from legal/spec fact to engineering consequence. |
| Callouts | Which points are important enough to become directives, notes, or warnings. |
| Walkthroughs | How step bodies explain both what happened and why it matters. |
| Closing paragraphs | Whether the section leaves the reader with an operational decision or handoff. |

For broad rewrites, record the comparison in a `.scratch/` plan before editing the article.

---

## Narrative Spine

Every major chapter or large section should have a narrative spine: a one-sentence statement of the journey the reader is about to follow.

Good shapes:

- "A verifier receives an opaque response and must turn it into a decision-grade result."
- "A bank must run wallet acceptance, SCA, CDD, resilience, and architecture workstreams in parallel."
- "A proximity terminal must make a local decision even when online trust evidence may be cached."
- "An RP must separate what the Wallet authenticates from what the RP verifies."

Weak shapes:

- "This section lists requirements."
- "The following table summarizes the topic."
- "This chapter provides a deep dive."
- "Various considerations are discussed below."

The spine should drive the order of the chapter. If the chapter order does not follow the spine, restructure before adding more content.

---

## Preferred Section Rhythm

Use this rhythm for dense technical sections:

1. **Thesis paragraph**: state the operational problem and why it matters.
2. **Boundary paragraph**: define what is in scope and what is handled elsewhere.
3. **Mental-model diagram or compact flow**: show actors, phases, evidence, or topology before heavy tables where practical.
4. **Narrative walkthrough**: explain the flow in prose, with details or collapsible steps when useful.
5. **Reference table or matrix**: consolidate checks, obligations, fields, or failure classes after the reader has the model.
6. **Operational consequence**: say what implementers should do differently because of the distinction.
7. **Cross-reference handoff**: point to neighboring chapters by subsection name and section id where needed.

Not every section needs all seven elements, but a long table-first section should be treated as a style smell.

---

## Closing Sections and Release Gates

Closing sections should synthesize the chapter's evidence chain into an operational decision. They should not trail off into generic checklists merely because the preceding material was detailed.

Use closing or release-gate sections to explain:

- what blocks approval or production use
- what evidence artifact proves readiness
- which system, role, or governance process consumes that evidence
- what rollback, audit, or incident-response action follows if the decision is wrong

Preferred pattern:

1. Open with the decision being made.
2. Use bold gate names or short anchored subsections when the gates are durable concepts.
3. For each gate, state the release-blocking condition, the evidence artifact, and the operational consequence.
4. Close with the handoff to CI, release approval, incident response, audit reconstruction, or the next chapter.

Avoid generic endings:

```markdown
Operational gates:
1. Run tests.
2. Track dependencies.
3. Add regressions.
```

Prefer decision prose:

```markdown
**Fixture evidence gate.** A release candidate is not ready because one happy-path wallet test passes. It is ready only when deterministic known-good, known-bad, parser, tenant-isolation, async-state, and result-fidelity fixtures pass against the exact verifier build, policy bundle, and result schema proposed for release.
```

For high-assurance, security, compliance, or conformance chapters, the closing section should answer three questions: what would stop this from shipping, what evidence survives for audit, and what happens if the release is wrong. A bare checklist is acceptable only when the checklist itself is the artifact the reader needs.

---

## Heading Hierarchy and Anchorable Concepts

Dense DR chapters should not remain flat at only the chapter and subsection levels when the material contains durable internal concepts. If a `12.x` subsection contains several distinct boundaries, phases, failure families, schemas, fixture groups, or policy decisions, those concepts should usually become named sub-subsections with stable ids, for example `12.3.1`, `12.3.2`, or `12.3.3`.

Use sub-subsections when they create real navigation value:

- a reader would reasonably want to link directly to the concept;
- a table, diagram, walkthrough, or failure catalogue has its own durable topic;
- the section changes from one stage of the flow to another;
- a concept is referenced elsewhere in the document;
- a bold lead-in has grown into a mini-section;
- multiple dense artifacts appear under one `12.x` heading and need grouping.

Do not use a flat hierarchy as a dumping ground for unrelated artifacts. Long subsections with only bold labels, details blocks, and tables are a style smell because the important concepts have no anchors and cannot be cross-referenced by name.

Preferred pattern:

```markdown
#### 12.3 Intake Boundary: Response Envelope and Session Binding

Opening narrative...

##### 12.3.1 Response-Mode Branches

...

##### 12.3.2 Request Snapshot and Session Material

...

##### 12.3.3 URL-Surface Lifecycle

...
```

Avoid:

```markdown
#### 12.3 Response Envelope and Session Binding

**Request-object and URL-surface lifecycle.**

...

**Delegated callback handling.**

...

**Failure cases.**

...
```

Bold labels are fine for short local emphasis. They should be promoted to real headings when they name a reusable concept, hold substantial content, or should be linkable from another section.

Use deeper headings sparingly but confidently. A chapter may use `#####` and, where genuinely needed, `######` headings to expose its structure. The goal is not heading proliferation; the goal is that meaningful internal concepts have names, hierarchy, and anchors.

---

## Diagrams Before Tables

When a topic involves flow, topology, actor boundaries, layered checks, or evidence movement, prefer a diagram before the first dense table.

Use diagrams for:

- lifecycle or pipeline orientation
- actor and trust-boundary relationships
- branch points and failure states
- deployment or ownership topology
- evidence flow from input to decision

Use tables for:

- exact side-by-side comparisons
- regulatory obligation inventories
- checklists
- field-level schemas
- failure-code catalogs
- traceability matrices

Do not use a table as the first explanation of a complex system unless the table is itself the point of the section, such as a coverage matrix or index.

---

## Opening Sections: Avoid Table Stacks

Opening sections should establish the contract, boundary, actor, and narrative spine before the reader reaches dense reference material. A section that starts with multiple back-to-back tables is usually under-narrated, even when each table is individually correct.

For chapter openings and major section openings:

1. Start with prose that states the operational problem and boundary.
2. Prefer one mental-model diagram before the first table when the topic has a flow or system boundary.
3. Convert scope maps, reader-question maps, and invariant matrices into prose when they repeat the same boundary.
4. Keep only one early reference surface if it is essential; move other matrices to the section where they become operationally useful.
5. Put detailed negative cases, fixture cases, and traceability matrices near conformance or release-gate material, not in the opening.

Good opening shape:

```markdown
The verifier's first responsibility is to avoid category mistakes. Transport receipt, credential validity, holder binding, request-policy satisfaction, and business acceptance are separate facts. This chapter follows one response through those boundaries until the RP has a decision-grade result object.
```

Weak opening shape:

```markdown
The following tables summarize scope, reader questions, invariants, and related sections.
```

Use early tables only when the table is the section's primary product. Otherwise, make the opening readable as prose first and let later tables serve as reference surfaces.

---

## Table Discipline

Tables are consolidation tools. They should not carry the whole argument alone.

Rules:

1. Put prose before every non-trivial table explaining why it exists and how to read it.
2. Put prose after large tables explaining the operational consequence.
3. Avoid back-to-back dense tables without a transition paragraph.
4. If a table has more than about 10-12 rows, consider grouping it, splitting it, or adding an explicit "read this as..." paragraph.
5. Use tables for exactness, not for narrative momentum.
6. A table row should usually express one decision, obligation, artifact, or failure class.
7. Avoid columns that only repeat the heading or restate obvious prose.
8. Reference columns should usually come last unless the table is primarily a mapping or index.
9. Use named subsection references, with section ids in parentheses, rather than bare section-number blobs.

Strong table setup:

```markdown
The verifier stages below should be read as failure boundaries, not as independent library calls. A failure in an early boundary changes which later checks are meaningful and how the final result object should explain skipped evidence.
```

Weak table setup:

```markdown
The following table lists verifier stages.
```

---

## Flow, Consequence, Evidence

Prefer the pattern **flow -> consequence -> evidence**.

For each important distinction, the prose should explain:

| Layer | Question |
|:------|:---------|
| Flow | What happens, and in what order? |
| Consequence | Why does this order or distinction matter? |
| Evidence | What artifact, result field, audit event, or failure signal proves it? |

This pattern is especially important for verification, security, compliance, wallet flows, trust infrastructure, and banking chapters. It prevents content from becoming either abstract prose or raw checklist material.

Example shape:

```markdown
The response is not yet a verified credential when it reaches the intake endpoint. It is only an opaque object delivered through a particular channel. The verifier first has to bind it to the retained request snapshot; otherwise a valid credential can be accepted for the wrong session or tenant.

The evidence produced at this boundary is therefore not "credential valid." It is envelope and session-binding evidence: response mode, request-object hash, nonce/state consumption, origin or response target, tenant id, and response-key resolution.
```

---

## Scope Boundaries and Handoffs

Large DR chapters should be explicit about what they do not cover. Scope boundaries are not disclaimers; they are reader-navigation tools.

Use boundary paragraphs or short directives when:

- the same topic appears in multiple chapters
- one chapter handles mechanics while another handles policy or architecture
- a term has nearby but different meanings
- issuance, presentation, verification, monitoring, and business decisioning could be confused
- implementation responsibility changes actor or layer

Good boundary shape:

```markdown
This chapter defines the verifier-engine contract. It does not define wallet UX, issuance choreography, vendor scoring, or downstream business policy. Those are separate layers; the verifier's job is to produce decision-grade evidence that those layers can consume.
```

The handoff should name the destination subsection, not only its section number:

```markdown
Full issuance choreography remains in OID4VCI Issuance Flow for SCA Attestations (§15.4).
```

---

## Detail Pacing

A chapter can be very detailed without feeling dense if the detail is paced.

Preferred pacing:

- introduce the concept in prose
- show the model or flow
- walk a representative case
- then generalize into tables and matrices
- close with implementation consequences

Avoid:

- opening with a long matrix before the reader knows the model
- stacking many small subsections that each contain only a table
- moving between standards, product behavior, operational policy, and payload syntax without transitions
- dumping every error case before explaining the normal path
- treating all details as equally important

When adding depth, ask whether the new material belongs in:

- the main story
- a diagram or walkthrough
- a reference table
- a callout
- a neighboring chapter
- an appendix

---

## Walkthroughs and Details Blocks

Use walkthroughs when a flow has meaningful ordered steps. The best walkthroughs do not paraphrase arrows; they explain the ceremony.

Each step should usually include:

- the actor and concrete action
- why the step matters
- the artifact, check, or decision produced if one exists
- payload examples only when they clarify the protocol

Avoid formulaic details blocks where every step has the same template regardless of importance. `Artifact Produced:` is useful only when the step creates a durable or decision-relevant artifact.

For sequence diagrams, also follow `SEQUENCE_DIAGRAM_HOUSE_STYLE.md`.

---

## Callouts

Use directives to sharpen the story, not decorate it.

Good uses:

- scope boundaries that prevent a common implementation mistake
- regulatory precision that changes architecture
- security warnings where a wrong assumption creates a real risk
- important distinctions that the rest of the chapter depends on

Poor uses:

- routine summaries
- ordinary recommendations
- every emphasized sentence
- content that already has enough structural emphasis

Follow `DIRECTIVES.md` for directive type selection.

---

## Cross-References

Cross-references should help the reader continue the story.

Prefer:

```markdown
Wallet Unit Attestation (WUA): RP Perspective (§5.4)
```

Avoid:

```markdown
§5.4
```

Use bare section ids only in indexes, coverage matrices, or places where the section number itself is the key.

When several references are needed, separate them with semicolons:

```markdown
Same-Device Remote Presentation (§9); Cross-Device Remote Presentation (§10); RP Verification Architecture Patterns (§26)
```

---

## Style Smells

Treat these as signs that a chapter needs narrative work:

| Smell | Likely fix |
|:------|:-----------|
| The section opens with a table before explaining the problem. | Add thesis, boundary, and mental-model prose before the table. |
| Multiple dense tables appear back to back. | Insert transitions, split the section, or move some material into a reference subsection. |
| The chapter has many diagrams but no story between them. | Add stage narratives explaining why each diagram exists and what changed. |
| The chapter has many tables but no representative flow. | Add a normal-path walkthrough before enumerating error cases. |
| Every subsection is a checklist. | Rebuild the chapter around phases, actors, or decision boundaries. |
| Cross-reference cells are bare section-number blobs. | Replace with subsection names followed by section ids in parentheses. |
| The chapter shifts abstraction level abruptly. | Add transition paragraphs or separate mechanics, policy, and architecture into clearer subsections. |
| Failure cases appear before the normal path. | Explain the normal path first, then classify failures by boundary. |
| A result or decision is named without evidence. | Add the artifact, field, signal, audit event, or check result that proves it. |
| The chapter or major section ends with a generic checklist. | Convert it into decision-oriented closing prose: named gates, blocking conditions, evidence artifacts, and rollback/audit consequences. |

---

## Rewrite Checklist

Before considering a chapter rewrite style-complete, verify:

- The first 2-4 paragraphs establish the chapter's thesis, actor, and scope boundary.
- The chapter has a clear narrative spine that determines section order.
- Complex systems get a diagram or representative flow before dense tables where practical.
- Every large table has setup prose and follow-up consequence prose.
- Back-to-back tables are avoided or explicitly connected by transitions.
- Normal path appears before exhaustive failure catalogs.
- Error cases are grouped by boundary, not dumped as an undifferentiated list.
- Each major distinction follows flow -> consequence -> evidence.
- Closing sections and release gates explain what blocks approval, what evidence proves readiness, and what happens if the decision is wrong.
- Cross-references use subsection names plus section ids where the reader benefits.
- Callouts are high-signal and follow `DIRECTIVES.md`.
- Sequence walkthroughs follow `SEQUENCE_DIAGRAM_HOUSE_STYLE.md`.
- The chapter can be read top to bottom without using search as the primary navigation method.

---

## Applying This To Existing Chapters

When applying this guide to an existing chapter:

1. Read the full target chapter first.
2. Pick 2-3 gold-standard sections from the same document.
3. Identify the target chapter's current narrative spine, or write the one it should have.
4. Mark which tables are core reference surfaces and which tables are compensating for missing prose.
5. Decide where diagrams or walkthroughs should carry the first explanation.
6. Reorder before polishing sentences.
7. Only then edit prose, tables, diagrams, and cross-references.

Do not "style polish" a structurally incoherent chapter. If the order is wrong, fix the order first.
