---
name: MEGA
description: "Unified skill combining live data probing (Obscura), multi-advisor council deliberation, and Idea Fencing output. Answers complex feature decisions with grounded analysis."
---

# `/MEGA` — Unified Probe-Council-Output Skill

You are running the MEGA skill orchestration. MEGA combines three capabilities into one command:

1. **PHASE 1: Obscura Probe** — Live data capture from target systems
2. **PHASE 2: Council Deliberation** — 5-advisor analysis with peer review
3. **PHASE 3: Idea Fencing Output** — Precisely constrained verdict format

---

## How MEGA Works

### **Input**
```
/MEGA "[question]" [target-url-1] [target-url-2]
```

Example:
```
/MEGA "Build a Kanban view in Catalyst from Jira screen" \
  https://jira.atlassian.com/board/BACKLOG \
  https://catalyst.local/sprint-board
```

### **Output**
A structured verdict in Idea Fencing format:
- Live Probe Summary (what Obscura found)
- Council Agreement (high-confidence convergence)
- Council Clashes (genuine disagreements)
- Blind Spots (things only peer review caught)
- Critical Risk (one thing that breaks this)
- Next Action (ONE clear step)
- Implementation Sequence (step-by-step path)

---

## PHASE 1: OBSCURA PROBE

### **What Obscura Captures**

For each target URL, Obscura will:

1. **Screenshot the page**
   - Visual state, layout, component placement
   - Colors, typography, spacing

2. **Extract DOM structure**
   - Element hierarchy (columns, cards, fields)
   - ClassNames, data-attributes, ARIA labels
   - Component library (Atlaskit, custom, third-party)

3. **Execute JavaScript**
   - Run `document.querySelectorAll()` probes
   - Test interactivity (click, drag, input)
   - Capture Network tab if available (API calls, status codes)
   - Check for anti-fingerprinting (stealth mode works)

4. **Generate Markdown output**
   - Raw DOM tree as code block
   - Computed styles for key elements
   - Interactivity matrix (what works, what doesn't)

5. **Apply Anti-SSRF protection**
   - Obscura blocks requests to private IP ranges
   - Will not access localhost, 10.x.x.x, 172.16.x.x, 192.168.x.x unless explicitly allowed
   - For internal/staging environments, ensure URLs are publicly routable or firewall-whitelisted

### **Fallback Strategy**

If Obscura cannot reach a target (firewall, auth, rate-limit):

**Fallback 1:** Use cached screenshot from CLAUDE.md or project docs
**Fallback 2:** Use manual description from user (if provided in command)
**Fallback 3:** Use codebase inspection (read component code, test files, design docs)

### **Probe Template for Each Target**

Run this logic for URL-1 and URL-2:

```
TARGET: [URL]

OBSCURA OUTPUT:
┌─────────────────────────────────────────┐
│ Screenshot (visual state)               │
├─────────────────────────────────────────┤
│ [Image will be captured and described]  │
└─────────────────────────────────────────┘

DOM STRUCTURE:
[Full DOM tree extracted]

COMPUTED STYLES (key elements):
[Colors, spacing, fonts]

INTERACTIVITY MATRIX:
[What can be clicked, dragged, typed]

JAVASCRIPT EXECUTION RESULTS:
[Network calls, state changes, validation]

RISK ASSESSMENT:
[SSRF blocked? Auth required? Rate-limited?]

COMPONENTS IDENTIFIED:
[Atlaskit, custom, third-party libraries]

REUSABLE ELEMENTS:
[What exists that could be adapted elsewhere]
```

---

## PHASE 2: COUNCIL DELIBERATION

### **Step 1: Frame the Question (with Probe Data)**

Take the user's raw question and add the Obscura findings:

```
FRAMED QUESTION FOR COUNCIL:

Core Question: "[user's question]"

PROBE FINDINGS (from Obscura):
- Target 1: [key findings from Jira probe]
- Target 2: [key findings from Catalyst probe]
- Comparison: [what's present, what's missing, what's reusable]

CONTEXT:
- This is for: [product/codebase]
- Constraints: [CLAUDE.md ways-of-working, team size, timeline if mentioned]
- What's at stake: [why this decision matters]
```

### **Step 2: Convene the Council (5 Sub-Agents in Parallel)**

Spawn all 5 advisors simultaneously. Each receives:
- The framed question (with Obscura probe data)
- Their advisor identity and thinking style
- Instruction: respond independently, lean into your angle, 150-300 words

**The 5 Advisors:**

1. **Contrarian** — Looks for what will fail, what's wrong, what's missing. Assumes fatal flaws exist.
2. **First Principles Thinker** — Strips assumptions, asks "what problem are we solving?" Reframes the question.
3. **Expansionist** — Looks for upside, adjacent opportunities, what could be bigger. Ignores risk.
4. **Outsider** — Zero context. Fresh eyes. Catches curse-of-knowledge blind spots.
5. **Executor** — Only cares about feasibility and fastest path to first working version.

### **Step 3: Peer Review (5 Sub-Agents in Parallel)**

Anonymize all 5 advisor responses as Response A through E (randomized). Spawn 5 reviewers:

Each reviewer sees all 5 anonymized responses and answers:

1. **Which response is strongest? Why?**
2. **Which has the biggest blind spot? What's it missing?**
3. **What did ALL five responses miss?** (the collective gap)

### **Step 4: Chairman Synthesis**

De-anonymize and synthesize. Chairman reads:
- Original framed question
- All 5 advisor responses (now identified)
- All 5 peer reviews

Chairman produces:

```
## Where the Council Agrees
[Points 3+ advisors converged on independently]

## Where the Council Clashes
[Genuine disagreements. Both sides. Why they disagree.]

## Blind Spots the Council Caught
[Things only peer review surfaced. Collective gaps.]

## The Recommendation
[Clear answer. Not "it depends." Real answer with reasoning.]

## The One Thing to Do First
[One concrete next step. Not a list. One thing.]
```

---

## PHASE 3: IDEA FENCING OUTPUT FORMAT

### **The NOT/NOT/BUT Framework**

The final verdict must use Idea Fencing to constrain output:

```
NOT: [What this is absolutely not]
NOT: [Another thing this is not]
BUT: [What it precisely is]
```

Examples:
- NOT: A bullet-list checklist
- NOT: A balanced "pros and cons" summary
- BUT: A structured development sequence with blockers identified

- NOT: A wireframe or design spec
- NOT: A full feature list with all bells and whistles
- BUT: A three-phase implementation plan with clear phase-1 boundary

### **Final Output Structure**

```markdown
## /MEGA Verdict: [Short Title]

### Live Probe Summary
[What Obscura found on both targets]
- Key findings from Target 1
- Key findings from Target 2
- Gap analysis (what's missing, what's reusable)

### Council Agreement (High-Confidence)
✅ [Point 1 that 3+ advisors converged on]
✅ [Point 2 that 3+ advisors converged on]
✅ [Point 3 that 3+ advisors converged on]

### Council Clash
| Advisor Type | Position | vs | Advisor Type | Position |
|---|---|---|---|---|
| [A] | [view] | vs | [B] | [opposing view] |
**Resolution:** [How to break the tie, or why both are valid]

### Blind Spots the Council Caught
❌ [Thing only peer review surfaced]
❌ [Collective gap all advisors missed]
❌ [Risk no individual advisor named]

### Critical Risk
[One thing that breaks this if not addressed first]

### The Recommendation
[Clear, actionable answer. Chairman can disagree with majority if reasoning supports it.]

### Next Action (One Thing)
[Exactly one concrete step. Not a list. One thing.]

### Implementation Sequence
**[Time period 1]:** [Step 1]
**[Time period 2]:** [Step 2]
**[Time period 3]:** [Step 3]
...

---

## Advisor Perspectives (Reference)
- **Contrarian:** [their quote or main concern]
- **First Principles:** [their reframe or core question]
- **Expansionist:** [their upside or adjacent opportunity]
- **Outsider:** [their fresh-eyes insight]
- **Executor:** [their first-step or feasibility]
```

---

## EXECUTION CHECKLIST

Follow these steps in order:

- [ ] **Parse user input** — Extract question and target URLs
- [ ] **Run Obscura probes** (parallel) — Capture live data from both targets
- [ ] **Fallback handling** — If Obscura blocked, use cached data or codebase inspection
- [ ] **Frame the question** — Combine user question with Obscura findings
- [ ] **Spawn 5 advisors** (parallel) — Each gets framed question + their thinking style
- [ ] **Wait for advisor responses** — Collect all 5 (150-300 words each)
- [ ] **Anonymize responses** (A through E, randomized)
- [ ] **Spawn 5 reviewers** (parallel) — Each reviews all 5 anon responses
- [ ] **Collect peer reviews** — Each reviewer answers 3 questions
- [ ] **De-anonymize** — Map Response A-E back to advisor identities
- [ ] **Chairman synthesis** — Produce verdict with all components
- [ ] **Apply Idea Fencing** — Verify output uses NOT/NOT/BUT constraints
- [ ] **Format final output** — Markdown-ready, scannable, actionable
- [ ] **Present in chat** — Return to user with full verdict

---

## CONSTRAINTS & GUARDRAILS

1. **Obscura timeouts:** If Obscura takes >30s on a target, fallback to cached/manual
2. **Council parallelization:** All 5 advisors must be spawned in ONE batch (not sequential)
3. **Peer review anonymization:** NO positional bias — randomize A-E mapping
4. **Chairman must decide:** No "on the other hand" hedging. Real answer.
5. **One thing only:** Next Action must be exactly one step, not a list
6. **Idea Fencing mandatory:** All outputs must use NOT/NOT/BUT constraints

---

## EXPECTED USER EXPERIENCE

```
USER: /MEGA "Build a Kanban view in Catalyst from Jira screen" \
      https://jira.atlassian.com/board/BACKLOG \
      https://catalyst.local/sprint-board

[20-30 seconds of probing, deliberation, synthesis]

MEGA RETURNS:

## /MEGA Verdict: Kanban Feature in Catalyst

### Live Probe Summary
**Jira Kanban Found:**
- 3 columns (Backlog, Todo, Done)
- 8 cards with drag-drop enabled
- Status auto-syncs on drop

**Catalyst Current State:**
- No /sprint-board page exists
- List view exists with reusable components

**Gap:** Missing column layout, drag-drop wiring, PATCH endpoint

### Council Agreement (High-Confidence)
✅ Three-feature Phase 1: columns, drag-drop, status persist
✅ Skip Phase 1: resize, WIP counters, filters
✅ Blocker: PATCH /sprint-board/card/{id} endpoint must exist first

### Critical Risk
Status enum mismatch. If Catalyst's statuses don't match Jira's, 
every drag-drop fails silently on backend.

### Next Action (One Thing)
Create the /sprint-board page route and render three empty columns 
(Backlog, Todo, Done) with hardcoded labels.

Commit: `feat: create sprint-board page with 3-column layout skeleton`

### Implementation Sequence
**Day 1:** Page route + empty columns
**Day 2:** Wire PATCH endpoint (backend)
**Day 3:** Render cards + react-beautiful-dnd
**Day 4:** Test happy-path drag, visual polish
**Day 5:** Handle all three columns, fix edge cases

---
[Full Council Perspectives included below for reference]
```

---

## READY

The `/MEGA` skill is now defined. Execute according to the checklist above. Your role is orchestration:

1. Accept the user's question and target URLs
2. Coordinate Obscura probes (parallel)
3. Frame the question with probe data
4. Spawn and coordinate the 5 advisors (parallel)
5. Collect peer reviews (parallel)
6. Synthesize via chairman
7. Format output with Idea Fencing constraints
8. Return final verdict

No speculation. No generic advice. Real data. Real deliberation. Real answer.
