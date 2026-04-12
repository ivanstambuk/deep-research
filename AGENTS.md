# Agent Instructions — deep-research

## Web Search Failure — Immediate Stop and Escalate

**If web search returns zero results, times out, or produces errors, you MUST stop all work immediately — whether you are the orchestrator or a subagent — and escalate to the user.** Under no circumstances may you continue research, content generation, or subagent dispatch with a broken search tool.

### Rules

1. **Stop immediately.** Do not retry silently. Do not switch to a different tool. Do not continue with whatever you were doing.
2. **Escalate to the user.** Report: what query failed, what error was returned, and what you were trying to accomplish.
3. **Suggest remedies.** Examples:
   - Restart the SearXNG container: `docker restart searxng`
   - Check engine health: `curl -s "http://localhost:8880/search?q=test&format=json" | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'Results: {len(d.get(\"results\",[]))}'); print(d.get('unresponsive_engines',[]))"`
   - Add alternative engines to `/home/ivan/searxng/settings.yml` (e.g., Bing)
   - Wait for rate-limit cooldown (hours) and retry later
4. **Do not resume until the user confirms search is working.** A single successful test query after a fix is sufficient.
5. **After every subagent round**, test web search before proceeding to the next round. Catch failures early — do not discover them after 7 rounds of wasted work.

### Why this exists (DR-0005 lesson, 2026-04-08)

During DR-0005 content generation, SearXNG's upstream engines (Brave, DuckDuckGo, Google, Mojeek, Qwant, Startpage) all became rate-limited/blocked. The orchestrator continued dispatching sub-agents for 7+ rounds without noticing that search was returning zero results. This produced shallow, unresearched content and wasted significant effort. The fix was adding the Bing engine to the SearXNG config, but the failure to escalate was the real problem.

### Engine Rotation and SearXNG Configuration

**Never rely on a single search engine.** SearXNG upstream engines get rate-limited or blocked frequently during intensive research sessions. The configuration must include multiple engines to provide redundancy.

**Current configuration** (`/home/ivan/searxng/settings.yml`):

| Engine | Status (2026-04-08) | Notes |
|:-------|:--------------------:|:------|
| **Seznam** | ✅ Enabled | Best relevance for regulatory and technical queries |
| **Presearch** | ✅ Enabled | Excellent for legal/regulatory content |
| **Yandex** | ✅ Enabled | Good broad coverage |
| **Bing** | ✅ Enabled | Unreliable under load — returns irrelevant results when rate-limited |
| Brave | ❌ Disabled | Rate limited ("too many requests") |
| DuckDuckGo | ❌ Disabled | Timeout |
| Google | ❌ Disabled | Access denied |
| Mojeek | ❌ Disabled | Access denied |
| Qwant | ❌ Disabled | Access denied |
| Startpage | ❌ Disabled | CAPTCHA |

**How to rotate engines when search degrades:**

1. **Test each engine individually** to find which ones are still working:
   ```bash
   for engine in seznam presearch yandex bing; do
     curl -s --max-time 8 "http://localhost:8880/search?q=test+query&format=json&engines=$engine" \
       | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'$engine: {len(d.get(\"results\",[]))} results')"
   done
   ```

2. **Check relevance**, not just result count — an engine returning 10 irrelevant results (e.g., dictionary pages for a technical term) is effectively broken.

3. **Enable new engines** in `/home/ivan/searxng/settings.yml` by adding them to the `engines:` list with `disabled: false`. Available engines can be found by listing the container:
   ```bash
   docker exec searxng sh -c 'ls /usr/local/searxng/searx/engines/ | sed "s/.py$//" | sort'
   ```

4. **Disable broken engines** by setting `disabled: true` — prevents SearXNG from wasting time on them and keeps the `unresponsive_engines` output clean.

5. **Restart the container** after config changes: `docker restart searxng`

6. **Verify** with both a regulatory query and a technical query before resuming work.

**Other potentially useful engines** (available but not currently enabled): `marginalia`, `mwmbl`, `yahoo`, `seznam` (already enabled), `wikipedia` (for definitions only), `stackexchange` (for developer Q&A).

## Strict Prompt Boundaries (No Scope Creep)

**Never execute beyond the explicit boundary of the user's prompt.** If the user asks you to update "Diagram 35", you must update *only* Diagram 35 and then stop.
- **Do not auto-chain tasks:** Even if you see a master plan or a tracker with "next steps" (like continuing to the next diagram), you are **strictly forbidden** from continuing to the next unrequested task unless the user explicitly commands "continue the rest" or "proceed".
- **Halt and Report:** When the specific requested task is complete, stop immediately. Provide a completion summary and explicitly ask the user for the next instruction.
- **Cost control:** Executing unprompted tasks wastes tokens, time, and money. Never assume the user wants you to keep burning tokens just because a plan exists.

## When in Doubt, Ask — Never Assume

**If the user's message is ambiguous — could be a question, an observation, a complaint, or a command — do not act. Ask a short clarification question first.** The cost of a clarifying round-trip is zero; the cost of acting on a wrong assumption is hours of lost work.

This is the highest-priority rule in this document. It overrides all other rules. When unsure whether to act, or if you suspect you might be stepping outside the strict prompt boundary, always default to asking.

## Never Argue Cost or Effort Against Correctness

**The cost of doing things right is never a valid argument against doing them.** Do not discourage the user from a structurally correct action (moving a chapter, renumbering sections, refactoring a document) by citing token cost, time, effort, or risk of breakage. The user decides what is worth doing; your job is to **plan and execute**, not to second-guess priorities.

When a large structural change is needed:
1. **Communicate what needs to happen** — create a detailed transition plan: what moves, what renumbers, what back-references break, what validators must pass.
2. **Execute the plan** once the user confirms.
3. **Never say** "this is a non-trivial refactoring task" or "the cost of moving it is significant" as a reason to avoid it.

## Process Adherence — No Shortcutting

When the user specifies an explicit process (e.g., "sequentially," "one at a time," "audit then fix"), you must follow it exactly as stated. Do not switch to batch processing, scripted automation, or parallel execution — even if you detect a consistent pattern across items that makes the process seem redundant. The user's process IS the requirement.

**Correct:** Audit diagram 1 → fix diagram 1 → audit diagram 2 → fix diagram 2 → ...
**Wrong:** Audit diagram 1, notice all diagrams have the same issue, write a Python script to fix all at once.

The same principle applies to any user-specified workflow: editing order, review gates, approval checkpoints, or sequential task execution. Respect the process even when it feels inefficient.

## Planning Documents for Multi-Step Tasks (10+ Steps)

When a user request involves **more than 10 discrete steps** (e.g., auditing 15 diagrams, integrating 12 chapters, fixing 20 files), you **must** create a planning document before starting execution.

### Mandatory Structure

Create the planning document in `.scratch/` following this template:

```markdown
# Plan: [Brief Task Description]

**Created:** YYYY-MM-DD
**Status:** In Progress

## Task Tracker

| # | Step | Status | Notes |
|:-:|:-----|:------:|:------|
| 1 | [Self-contained step description] | ⬜ Not started | |
| 2 | [Self-contained step description] | ⬜ Not started | |
| ... | ... | ... | ... |

## Process

[Explicit process to follow: sequential, audit-then-fix, etc.]

## Verification

[How completion of the overall task will be verified]
```

### Rules

1. **Create before executing.** Write the plan to `.scratch/plan-[brief-name].md` before making any edits. Identify all steps upfront — do not discover steps as you go.

2. **Each step must be self-contained.** A step entry must specify:
   - **What** to do (specific action)
   - **How** to do it (use subagent? which tool? what prompt?)
   - **Verification** (how to confirm the step succeeded before moving on)

3. **Update the tracker live.** After completing each step, immediately update its status to ✅ Done (or ⚠️ Partial with explanation). Do not batch status updates.

4. **No shortcuts.** Each step in the tracker must be executed individually. You may not skip steps, batch them, or replace a multi-step sequence with a single scripted operation — even if a pattern is detected. This rule works together with "Process Adherence — No Shortcutting" above.

5. **Use subagents appropriately.** For audit, research, or fix operations where a subagent would be the right tool, the step must specify the subagent prompt. The orchestrator dispatches and verifies; the subagent executes.

6. **Delete only after full completion.** The planning document may only be deleted after **all** steps are marked ✅ Done **and** the final verification passes. If the task is interrupted, the plan persists in `.scratch/` for the next session to pick up.

7. **Count threshold.** The 10-step threshold applies to the number of discrete actions the user requested — not to internal substeps. If the user says "audit all diagrams," count the diagrams. If the user says "fix the walkthrough," count the walkthrough steps.

## Repository Purpose

This repository contains **Deep Research (DR)** documents — exhaustive, long-form Markdown articles (5,000–30,000+ lines) with rich Unicode content including section signs (§), em/en dashes (—/–), arrows (→/←/↔), check/cross marks (✅/❌), warning signs (⚠️), and emoji.

## Editing Large Documents

DR documents are very large. When editing:

- **Make targeted, surgical edits using `replace_string_in_file`.** This tool is the correct way to modify existing content — it replaces exactly the text you specify without re-emitting surrounding content.
- **Never read-then-rewrite the whole file** — this is the most common cause of encoding corruption. "Re-emit" means writing back content that you read verbatim. Using replacement tools to *change* specific text is fine and expected.
- **You MAY edit existing content** when fixes are needed. The prohibition is on wholesale re-emission, not on modification. If a sentence has an error, use `replace_string_in_file` to fix that sentence — don't re-write the entire paragraph.
- **NO AUTOMATED TEXT REPLACEMENT SCRIPTS ON THE ORIGINAL FILE.** You are strictly forbidden from writing and executing Python, Bash, awk, or `sed` scripts to globally manipulate or inject Markdown text **directly on DR documents**. All edits to the original file must be done thoughtfully, reading the context, and manually using specific file replacement tools (`multi_replace_string_in_file` or `replace_string_in_file`). **Exception — Extract-Transform-Insert pattern**: For large content moves (e.g., moving a 200-line section and renumbering its headings), you MAY extract the block to a temporary file (`/tmp/` or `.scratch/`), run transformation scripts on the temp file, verify the result, and then insert the transformed content back into the original using file replacement tools. This keeps the original file safe from scripted corruption while enabling efficient bulk renumbering.
- **Verify the file renders correctly after edits** by spot-checking lines containing Unicode characters near your edit locations.

## Sequential Execution of Independent Tasks

When a request involves multiple independent edits (e.g., "add three diagrams", "update five sections"), **do NOT plan all of them in one thinking pass**. Instead:

1. **Think about task 1 → implement task 1.**
2. **Think about task 2 → implement task 2.**
3. **Repeat for each subsequent task.**

Each task gets its own short thinking pass immediately before implementation. This prevents wasting tokens on over-analysis of tasks that have no dependencies on each other. Batching independent work into a single `multi_replace_file_content` call is fine — what is forbidden is spending a long thinking pass designing all of them before touching any file.

## Subagent Orchestration Rules (GitHub Copilot / Cline Only)

> **Scope**: The rules in this section (**No Concurrent Write Subagents**, **Maximum 2 Concurrent Subagents**, **Incremental Edits** subagent delegation points, and **Large Artifact Creation**) apply exclusively to harnesses that have a native `runSubagent` dispatch mechanism — primarily **GitHub Copilot** and **Cline**. They do **not** apply to **Google Antigravity** (Opus/Claude running in the Antigravity harness), which does not have subagent dispatch. In Antigravity, use `search_web` and `read_url_content` for research tasks — do **not** use `browser_subagent` for documentation research or vendor investigation.

## No Concurrent Write Subagents

**Never dispatch multiple subagents that edit the same file concurrently.** If two or more subagents write to the same target file at the same time, they will corrupt each other's edits — line numbers shift after one insertion, causing subsequent insertions to land at wrong positions, overwrite content, or produce malformed Markdown.

This rule applies regardless of whether the subagents edit different sections of the file. The file is a single mutable resource — only one writer at a time.

**Correct pattern:**
- ❌ Dispatch subagent A, B, and C simultaneously — all three edit `DR-0003.md`
- ✅ Dispatch subagent A → verify A's edit → dispatch subagent B → verify B's edit → dispatch subagent C

**Safe for concurrent dispatch:**
- Multiple subagents writing to **different files** (e.g., each writes to its own `.scratch/` research file)
- Multiple subagents performing **read-only operations** (research, validation, exploration)
- One subagent writing while others are reading the same file

### Maximum 2 Concurrent Subagents

**Never dispatch more than 2 subagents simultaneously**, even if they target different files. Dispatching 3+ subagents in parallel causes a high failure rate: subagents report success but produce empty or truncated output files. The failure mode is silent — the subagent appears to complete but the generated content is lost due to a generation ceiling.

**Correct pattern:**
- ❌ Dispatch subagents A, B, C, D, and E simultaneously — most will fail silently
- ✅ Dispatch subagents A and B → verify both outputs → dispatch C and D → verify → dispatch E

**Why:** Subagents share the same generation budget as the orchestrator. Running 3+ in parallel exhausts available capacity, causing late-joining subagents to produce truncated or empty output. The 2-concurrent limit provides a safety margin while maintaining reasonable throughput.

**Lesson from DR-0003 gap analysis (2026-04):** Dispatching 5-6 research subagents in parallel resulted in ~80% silent failure rate. Reducing to 2 concurrent brought the success rate to ~60-70% per subagent — still imperfect, but workable with verification and retry.

## Incremental Edits: One Small Change at a Time

When performing edits in large DR documents, **always make incremental, single-focus edits rather than complex multi-step operations**. This applies to both the orchestrator agent and subagents:

1. **One edit per tool call.** When instructing a subagent (or yourself), specify exactly ONE small edit to make. Do not bundle multiple logical changes into a single instruction.
   - ❌ "Fix the phantom notes, add autonumber, and update step counts in all three diagrams"
   - ✅ "Add autonumber directive to the diagram at line 14378"
   - ✅ "Split walkthrough step 5 into two steps: step 5 and step 6"

2. **Why this matters.** Complex multi-step edits overwhelm the context window, cause tool failures, and make error recovery difficult. When an edit fails, you cannot determine which part of the complex operation caused the issue.

3. **Subagent delegation — one chapter, one topic, one subagent.** When delegating content creation to a subagent, assign **exactly one chapter on a single topic** per subagent call. Never assign multiple chapters or multiple topics to a single subagent — this causes split failures, boundary errors, and content loss during integration.
   - ✅ "Write Chapter 5 (Privacy & Data Sovereignty, §17–22)" — one chapter, one topic, one subagent
   - ❌ "Write Privacy & Data Sovereignty + Security (§17–27)" — two chapters, one subagent
   - ❌ "Write Extensibility, Git, Enterprise, and Cost (§28–44)" — four chapters, one subagent
   - ❌ "Write MCP Ecosystem + Plugin Architectures + Tool Calling" — multiple topics, one subagent
   - The orchestrator focuses on WHAT needs to be done; the subagent receives a single, well-scoped task

4. **Pattern for successful edits (inside subagents):**
   - Identify the single smallest change needed
   - Make that one edit with `replace_string_in_file`
   - Verify success
   - Move to the next small change
   - Repeat until the complete task is done

5. **Lesson from DR-0002 session (2025-03):** Subagents fail when given instructions like "fix all three scenario diagrams in one operation". They succeed when they internally iterate: "split step 5 → verify → split step 9 → verify → add step 12 → verify". The key is incremental edits within the subagent, NOT calling a new subagent for each edit.

6. **MANDATORY: Always pass the incremental edit instruction to subagents.** Every subagent prompt that asks the subagent to write content (deep dives, drafts, multi-section files) MUST include the following block verbatim. This is non-negotiable — omitting it causes subagent failures:

   ```
   ## IMPORTANT: Incremental editing pattern
   You MUST follow this pattern when writing content:
   1. First, create the file using `create_file` with the FIRST section's content
   2. Then, for each subsequent section, use `replace_string_in_file` to APPEND content to the END of the file
   3. Verify each edit succeeds before moving to the next
   4. Do NOT try to write the entire chapter/document in one `create_file` call — break it into sections and write one at a time
   ```

   **Why this matters (DR-0004 lesson, 2026-03):** Subagents that receive "write a chapter" without this instruction attempt to generate the entire output in a single `create_file` call. This fails silently — the subagent reports success but produces no file. The fix is simple: include the incremental edit block in every subagent prompt that involves content creation. This applies to both `.scratch/` draft files AND direct edits to the main document.

## Large Artifact Creation (GitHub Copilot Orchestrator)

**This rule applies only when GitHub Copilot is acting as the orchestrator agent** (i.e., dispatching subagents or synthesising their results). Other harnesses (Claude Code, Cline, etc.) are not subject to this constraint.

When creating a **new file** whose content is synthesised from multiple research sources, terminal outputs, or subagent results — such as `.scratch/` analysis artifacts, draft documents, or critique files — **never attempt to generate the entire file in a single `create_file` call**. Use incremental creation instead:

1. Create the file with the first section only (heading + first major block).
2. Append each subsequent section using `replace_string_in_file` anchored to the last line of the file.
3. Verify each append succeeds before proceeding to the next.

**Trigger heuristic:** If you are synthesising content from 3+ research sources, terminal outputs, or subagent results, assume the output will be large and use incremental creation. When in doubt, start small — you can always append more.

**Why this rule exists (DR-0004 lesson, 2026-03):** GitHub Copilot's generation ceiling can silently truncate `create_file` calls that exceed ~200 lines of synthesised content. The failure mode is insidious: the tool reports success but the file is empty or incomplete, and the context consumed by the failed attempt is wasted. Incremental creation avoids this ceiling entirely.

## Document Status Changes

**NEVER change the `status` of a document (e.g., from `draft` to `published` or `archived`) without the user's explicit, direct permission.** You are strictly prohibited from altering a document's publication status on your own to bypass pre-commit hooks or for any other reason. You cannot infer readiness; the user must explicitly command you to change the status. This is a hard, override-proof rule.

## No Revision Baggage

When updating content in a DR document — adding new capabilities, correcting errors, or reflecting changed facts — **overwrite the content in-place**. The document must always read as a single, coherent, present-tense snapshot. Do NOT:

- Add "Updated March 2026" / "Added March 2026" annotations
- Write "The article originally marked X as ❌ — this is now outdated"
- Insert "Correction: the original version of this finding stated…"
- Reference "the initial investigation snapshot" or any prior version

If a product now supports A2A, update the section to say it supports A2A. If a misattribution is found, fix the text — don't leave a correction note explaining what the old text said. Nobody reads previous versions; the current text is the only truth.

## Guardrail-First Error Prevention

> **Principle: guardrails catch, error messages teach.**
>
> Do not memorize error-prevention rules. Instead, rely on automated guardrails (pre-commit hooks, linters, validators) to catch mistakes at commit time. When a guardrail blocks your commit, read its error output — it contains everything you need to diagnose and fix the issue.

**When you encounter a new class of recurring mistake** — whether it's a formatting error, a broken cross-reference pattern, a naming convention violation, or anything else that can be detected mechanically:

1. **Propose a new guardrail.** Write a validation script in `.githooks/` and wire it into the pre-commit hook. The script should detect the error class automatically.
2. **Make the error message self-sufficient.** The output must explain: what went wrong, why it's wrong, and exactly how to fix it — with copy-pasteable commands or suggestions where possible. An agent seeing the error for the first time should be able to resolve it without any prior context.
3. **Remove the corresponding rule from AGENTS.md** (if one exists). Once a guardrail catches an error class, there is no need to also document it as a rule agents must remember. The guardrail *is* the rule.

This keeps AGENTS.md small, avoids cognitive load, and ensures consistency through enforcement rather than convention.

**CRITICAL RULE:** You are not allowed to autonomously edit existing guardrail scripts (e.g., in `.githooks/`) to bypass or relax rules without explicitly discussing it with the user first. If a guardrail forces a bad outcome, bring it to the user's attention.

## Git Hooks

`.githooks/` validates commits and pushes (activate with `git config core.hooksPath .githooks`). If a hook blocks your commit or push, read its output — it explains what went wrong and how to fix it.


## Destructive Git Commands Require Explicit User Approval

The following git commands **destroy or revert work** and are **strictly forbidden without the user's explicit, direct request**. You must NEVER run these autonomously — not even as an intermediate step in a larger plan. If you think a destructive command is needed, stop and ask the user first.

**Banned commands (require explicit user approval):**
- `git restore <file>` — discards uncommitted changes to a file
- `git restore --staged <file>` — unstages a file (use only if user requests unstaging)
- `git checkout -- <file>` — discards uncommitted changes (legacy form of `git restore`)
- `git reset HEAD <file>` — unstages and may discard changes
- `git reset --hard` — discards all uncommitted changes across the entire working tree
- `git reset --soft HEAD~N` — removes commits from history
- `git revert` — creates a new commit that undoes a previous commit
- `git clean` — deletes untracked files
- `git stash drop` / `git stash clear` — permanently deletes stashed changes

**Allowed without approval (safe, non-destructive):**
- `git add <specific_file>` — staging
- `git commit -m "message"` — committing staged changes
- `git push` — pushing commits
- `git status` / `git diff` / `git log` / `git reflog` — read-only inspection
- `git branch` / `git checkout <branch>` — branch switching (does not discard work)
- `git stash` — temporarily shelves changes (recoverable)

**Rationale:** An AI session lost hours of multi-agent renumbering work because the orchestrator autonomously ran `git restore` on a DR document to "start fresh." The work was unrecoverable. This rule ensures destructive operations are always a deliberate, user-confirmed decision.

## Selective Staging and Committing

**Never use `git add -A`, `git add .`, or `git commit -a`.** You must only stage and commit the specific files you have modified during your session. There may be other AI agents working concurrently in this repository.
- **Always** use `git add <file_path>` explicitly for each file you intend to commit.

## Commit Messages: Diff-Driven, Not Context-Driven

Commit messages must describe **what the committed snapshot looks like relative to the previous commit** — not the intermediate steps taken during the working session, and **not what the agent remembers from chat context**.

### Mandatory Procedure

Before writing any commit message, you **must** run the following:

```bash
git diff main --stat <file>           # Overview: which files changed, insertions/deletions
git diff main -- <file> | head -300   # Structural changes: what was added/removed/renamed
```

If the diff is too large to read in full, use targeted analysis:

```bash
git diff main -- <file> | grep '^[+-]### \|^[+-]#### '   # Heading changes
git diff main -- <file> | grep '^[+-]' | grep -v '^[+-][+-][+-]' | head -80   # Content changes
```

**Construct the commit message from the diff output**, supplemented by your session context for intent and rationale. The diff is the **primary source**; chat context is **secondary**.

### Why This Rule Exists

Chat context is unreliable for commit messages because:

1. **Truncation** — Long sessions get compacted; early changes may be lost from context.
2. **Intermediate states** — The chat records every failed attempt, renamed variable, and abandoned approach. The diff shows only the final state.
3. **Multi-session work** — If a task spans multiple sessions, no single session's context captures the full picture. The diff always does.

### Rules

- **Describe the final structure.** List sections, features, and content as they exist in the committed state.
- **Do not reference intermediate states.** Temporary names, working numbers, failed approaches, or multi-step refactoring sequences that existed only in the working tree are invisible to the commit history.
- **Never write a commit message from memory alone.** Always run the diff commands above first. If you find yourself writing a commit message without having run `git diff` in the current turn, stop and run it.

## Completion Summaries

After executing a plan, batch of edits, or any multi-step task, present a **structured summary** to the user before calling `task_complete`. This gives the user immediate visibility into what changed without having to diff the file themselves.

**Required format — a summary table with these columns:**

| Column | Purpose |
|:-------|:--------|
| # | Change number or sequence |
| Change | Short description of what was added/modified |
| Location | Section reference and approximate line number (e.g., `§29.2.4 ~L28870`) |
| Lines | Approximate lines added or modified |
| Status | ✅ Done / ⚠️ Partial / ❌ Failed |

**Additional elements to include:**

1. **Grand total** — sum of all lines across all changes
2. **Files modified** — list of all files that were edited (not `.scratch/` files)
3. **Key decisions or deviations** — if any change diverged from the plan, note why
4. **Next steps** — if work remains, state what's pending and what's needed to proceed
5. **Verification** — confirm how changes were validated (grep search, subagent verification, etc.)

**Example:**

> | # | Change | Location | Lines | Status |
> |:-:|:-------|:---------|:-----:|:------:|
> | 1 | Agent token lifetime | §3.5.3 ~L3352 | ~15 | ✅ |
> | 2 | HTTP Message Signing | §29.2.4 ~L28870 | ~95 | ✅ |
> | | **Total** | | **~110** | |
>
> **Files modified:** `papers/DR-0003/DR-0003-authentication-and-session-management.md`
> **Verified:** grep search for all 2 insertions confirmed present.

**When to use:** Any time the orchestrator completes 2+ edits in a session. For single trivial edits, a one-sentence confirmation suffices.

## Research from GitHub Repositories

When researching specifications, standards, or reference implementations hosted on GitHub, **clone the repository locally** (shallow clone to `/tmp/` is fine) and search it with local tools (`grep_search`, `find_by_name`, `view_file`). Do **not** use `read_url_content` or browser tools to scrape GitHub pages — they are unreliable, slow, and often return incomplete content. The sibling directory `/home/ivan/dev/eIDAS20/` contains the eIDAS 2.0 reference material including technical specifications, OpenAPI definitions, and ARF documents.

## Transient Files

**Never create throwaway scripts or temporary files in the repository root or any tracked directory.** One-off Python/Bash scripts, scratch data files, downloaded PDFs, and other transient artifacts must go in one of:

- **`.scratch/`** — gitignored directory inside the repo (preferred for repo-related scratch work)
- **`/tmp/`** — system temp directory (preferred for cloned repos and truly ephemeral files)

This rule applies to any file that is not intended to be committed. If you are unsure whether a file belongs in the repo, it probably doesn't — put it in `.scratch/`.

**.scratch file safety.** `.scratch/` files are gitignored and unrecoverable. Never use `rm`, `mv`, or any shell command to delete, rename, or overwrite `.scratch/` files. Never use `run_in_terminal` to write to, truncate, or modify `.scratch/` files — only `create_file` (for new files) and `replace_string_in_file` (for existing files) may touch `.scratch/` content. To modify an existing `.scratch/` file, use `replace_string_in_file`. To supersede a `.scratch/` file, create a new versioned file (e.g., `plan-v2.md`) and leave the original intact. Never create a `.scratch/` file with the same filename as an existing one — this destroys the previous version irrecoverably. Only the user may delete `.scratch/` files.

**Spec / tracker refinement rule.** When the user asks to "refine", "improve", "make another pass", or otherwise iterate on an existing `.scratch/` specification, plan, tracker, or analysis document, you must update the existing file in place. Do **not** create `-v2`, `-v3`, `-final`, or similar variant files unless the user explicitly asks for parallel alternatives or versioned drafts. The default behavior is one evolving canonical document.

**Lightweight retro workflow.** Retrospectives are **not** automatic for every session. Use them only rarely, after costly debugging or architectural sessions — for example: multi-hour bug hunts, repeated regressions in the same subsystem, reader/runtime architecture changes, or when the user explicitly asks for a retro. In those cases:
- **Proactively propose** a short retro to the user; do not silently create one every session.
- If the user agrees, write **one** canonical `.scratch/` retro markdown file and keep refining that same file in place if the thread continues.
- Keep the retro thin and practical: `what broke`, `root cause`, `what would have prevented it`, `concrete follow-up items`.
- Promote only stable lessons:
  - to `AGENTS.md` if the lesson is process-level,
  - to tests/guardrails if it is mechanically enforceable,
  - otherwise leave it in the retro document.
- Do not let retros become bureaucracy. This repo is primarily content plus a thin reader wrapper; the workflow should stay lightweight.

**Tailnet-backed dev server freshness.** When the user is testing the reader through the Tailscale-served URL (`:4321 -> 127.0.0.1:4322`), do not assume the currently running Vite dev server reflects the latest local code. After reader/runtime fixes that affect the live route:
- verify which process is listening on `127.0.0.1:4322` and whether it predates the latest edits,
- if `npm run prepare:reader`, `scripts/build-reader-assets.js`, or generated `src/generated/**` / `src/generated/sections/**` assets changed, restart the dev server explicitly — Vite's `import.meta.glob` loader map can go stale across generated-asset changes,
- restart the dev server if there is any doubt,
- and re-check the exact user-reported URL against the refreshed server before telling the user to hard refresh.
Treat stale dev-server processes as a recurring failure mode, not as a one-off mistake.

**Reader debugging workflow.** For reader/runtime bugs (deep links, TOC jumps, command-palette navigation, progressive loading, Mermaid rendering), follow the canonical workflow in [reader-debugging-workflow.md](/home/ivan/dev/deep-research/.scratch/reader-debugging-workflow.md:1). In particular:
- start with the built-in debug URL (`?debug=reader,target_navigation,mermaid&debug_ui=panel`),
- inspect the hidden debug state and navigation event buffer before ad-hoc probing,
- run `npm run test:reader:all` or the relevant serialized reader smoke before writing custom Playwright scripts,
- and only then fall back to one-off probes if the built-in traceability is insufficient.

**Subagent output persistence.** All subagent output that may be needed later must be written to a `.scratch/` file with a descriptive name following the pattern `<document-id>-<purpose>-<descriptor>.md` (see WORKFLOW.md). Subagents must never rely on the orchestrator retaining their output in conversation context — it will be lost on compaction.

**User-requested artifacts.** When the user asks you to produce an analysis, audit, review, plan, or any other document for their review, **always write it to `.scratch/` as a markdown file**. Never write it to the harness-internal artifact directory (e.g., `~/.gemini/antigravity/brain/...`). The `.scratch/` file can be opened directly in the user's editor for proper reading; harness artifacts render as pop-ups and are unusable for real review.

**GitHub Copilot / VS Code: Explore subagent is FORBIDDEN.** The built-in `Explore` agent is read-only — it cannot create or edit files. It MUST NOT be used. Instead, use the `runSubagent` tool **without specifying `agentName`**. This spawns a full-capability agent that can read files, write files, create files, run terminal commands, and use all orchestrator tools. Specify only `prompt` and `description` — omit `agentName` entirely.

**GitHub Copilot / VS Code: cache_control artifacts in tool output.** VS Code may append `{"$mid":...}` JSON blobs (cache_control metadata) to `read_file`, `run_in_terminal`, and `grep_search` output lines. These artifacts are **not present in the actual file** — they are VS Code's internal cache decorations injected into the response stream. When inspecting file content, use byte-level verification (`python3 -c "repr(open(...).read())"`) or `grep_search` to confirm whether content is real or an artifact. Do not attempt to strip these from files — the file is clean; only the display layer is affected.

## Mermaid Diagram Best Practices

While programmatic errors are caught by git hooks, aesthetic consistency across DR documents requires adhering to the following structural patterns when crafting Mermaid diagrams:

1. **Flowchart & State Diagram Typography**: Do not use generic `<br/>` tags for multi-line nodes. Instead, wrap the node text in **Markdown strings** (``"`...`"``) and apply `text-align: left` to the node's style. This enables native left-aligned typography within the boundaries of the bounding box.
   ```mermaid
   A["`**Bold Header**
   Left-Aligned descriptive text`"]
   style A text-align:left
   ```
2. **Horizontal Layouts in Top-Down Charts**: To force horizontal structuring within a top-down diagram (`flowchart TD`), chain the target nodes together using the invisible link syntax (`~~~`) within a subgraph. This binds them in a single row without disrupting the vertical flow.
3. **Conserving Vertical Space**: To prevent awkward wrapping and reduce vertical bloat in large graphs, force inline titles or long descriptive phrases onto a single line by replacing standard spaces with a non-breaking space (`&nbsp;`).
4. **Code Blocks in Nodes**: Avoid using HTML tags (`<pre>`, `<code>`) for code blocks inside Mermaid nodes, as GitHub's native parser may strip them or format them incorrectly. Instead, use non-breaking spaces (`&nbsp;`) for manual indentation within Markdown strings. *Warning*: Do not use HTML entity hyphens (`&#8209;`) to prevent wrapping, as Mermaid has a known parser bug that renders them incorrectly (e.g., `&-`). Use standard hyphens.
5. **Phase Styling in Sequence Diagrams**: `sequenceDiagram` does not natively support background colors for individual `Note` statements. To style distinct background phases, wrap the steps in `rect rgba(...)` blocks and use `themeVariables` (`noteBkgColor: "transparent"`, `noteBorderColor: "transparent"`) in the YAML frontmatter to allow notes to seamlessly inherit the bounding box's background color without rendering ugly borders. Phase rects **MUST** use `rgba()` with low alpha (≈ 0.14) for dark-theme compatibility:
   - *Grey phase*: `rect rgba(148, 163, 184, 0.14)`
   - *Green phase*: `rect rgba(46, 204, 113, 0.14)`
   - *Yellow phase*: `rect rgba(241, 196, 15, 0.14)`
   - *Red phase*: `rect rgba(231, 76, 60, 0.14)`
   - *Blue phase*: `rect rgba(52, 152, 219, 0.14)`
   - Never use `rect rgb()` — the opaque backgrounds are unreadable on dark theme.
6. **Self-Referential Logic**: Avoid placing large logic pseudo-code in standalone or floating `Note` boxes. Instead, represent logic processing as a self-referential arrow (e.g., `Agent->>Agent: Validate Token`) with the pseudocode attached directly to the message string using `<br/>` tags, rather than using a separate `Note right of` (which causes visual floating).
7. **Backticks in Sequence Diagrams**: Avoid using Markdown backticks (`` ` ``) for URLs, code blocks, or endpoints inside `sequenceDiagram` elements (messages or notes). The mermaid sequence parser treats them as literal characters; use standard text instead.

### Diagram Approval Workflow (Docker Rendering)

When the user asks to review, redesign, or approve a specific Mermaid diagram, use the local Docker image to render alternatives:

1. **Render the current diagram** to `/tmp/` so the user can see the baseline:
   ```bash
   docker run --rm -v /tmp:/data minlag/mermaid-cli \
     -i /data/diagram.mmd -o /data/diagram.png -b white --scale 2
   ```
2. **Create 3–5 alternative `.mmd` files** in `/tmp/`, each exploring a different layout or diagram type (e.g., `flowchart LR`, `flowchart TD` with subgraphs, `sequenceDiagram`, compact labels with edge annotations).
3. **Batch-render all alternatives** using the same Docker command.
4. **Write a comparison artifact** (to `.scratch/`) with each option's rendered PNG embedded inline, its Mermaid source in a fenced code block, and a short pros/cons note. End with a summary comparison table.
5. **Let the user pick.** Do not choose on the user's behalf — present all options and ask which to apply. If the user asks for a recommendation, provide one with rationale but still let them decide.

**Docker image**: `minlag/mermaid-cli` (aliased as `ghcr.io/mermaid-js/mermaid-cli/mermaid-cli`). Always use `-b white --scale 2` for readable output. Do **not** use `browser_subagent` or mermaid.live for diagram rendering.

## DR Document Structure

DR documents use the hierarchy `## Group → ### Chapter → #### Section`. Follow these rules when structuring content:

1. **Prefer fewer, larger chapters.** Do not proactively create separate `### Chapter` headings for small topics. Start with `#### Section` headings under one chapter; only split into a new chapter when a section grows large enough (~100+ lines) to warrant standalone treatment.
2. **Remove single-chapter groups.** If a `## Group` heading contains only one `### Chapter`, the group heading is redundant — remove it. The chapter stands alone.
3. **Never merge Findings, Recommendations, or Open Questions.** These three chapters (`### Findings`, `### Recommendations`, `### Open Questions`) must always remain as separate `###`-level chapters. This is a cross-document convention.

## Sequence Diagram Step-by-Step Walkthroughs
The following **content quality** rules cannot be mechanically enforced and must be followed manually:

1. **Actor-first naming.** Every step title must begin with the **actor** (participant) performing the action, followed by the verb and target. Generic titles like "Submit application" or "Issue certificate" are not acceptable.
   - ❌ `1. Submit registration application`
   - ✅ `1. Relying Party submits registration application to Registrar`
   - ❌ `13. Issue WRPRC`
   - ✅ `13. Registration Cert Provider issues WRPRC`
2. **Rich descriptions.** Each step body must provide substantive explanation — not a single sentence restating the title. Include context on *why* the step matters, reference the relevant spec/article, and embed payload examples (JSON, CBOR, HTTP, X.509) where the protocol defines one.
3. **Payload embedding.** If a step involves a protocol message with a defined payload structure (e.g., a JSON request body, a CBOR DeviceRequest, an HTTP API call), embed a representative code block inside the collapsible step.

## Manual of Style

### Inline References

All DR documents use **narrative-style inline references** — not numbered citations. Standards, RFCs, regulations, and specifications are referenced inline in parentheses with the document identifier and, where relevant, the specific section:

- `(RFC 9449)` — RFC by number
- `(NIST SP 800-63B, §7.1)` — NIST publication with section reference
- `(ISO 18013-5 §10.1.1.5)` — ISO standard with section
- `(eIDAS 2.0, Article 5)` — regulation with article/section
- `(OWASP ASVS v4.0.3, §2.1.1)` — OWASP standard
- `(CVE-2021-42287)` — vulnerability identifier

On **first mention** of a standard, include the full name as a hyperlink:

```markdown
The OAuth 2.0 Demonstrating Proof-of-Possession (DPoP) specification (RFC 9449) binds access tokens to a client-held key pair.
```

On **subsequent mentions**, use the short form:

```markdown
The resource server validates the DPoP proof (RFC 9449) against the token's `cnf.jkt` claim.
```

**Do not** use numbered citation styles like `[1]`, `[2]` or footnote references. **Do not** append a global reference list at the end of individual sections — references are woven into the narrative.
