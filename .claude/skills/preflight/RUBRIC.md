# /preflight — Task Classification Rubric

The classification tier drives whether Phase 1 (council deliberation) runs and how aggressive the gates are. Without this rubric the skill is undefined behavior — every other phase depends on which tier applies.

## The three tiers

| Tier | Definition | Phase 1 council |
|---|---|---|
| **Trivial** | Single-file scope. Fully reversible with one revert commit. No UI surface visible to end users. No schema/migration impact. No new architectural pattern. | Skip. |
| **Standard** | Multi-file but bounded. No add/remove of user-visible fields/components. No schema/migration impact. Follows an established Catalyst pattern. | Skip by default. Run `--council` (3-advisor abridged) if invoked explicitly. |
| **High-stake** | One or more of: adds/removes a user-visible field/component; touches Supabase schema, RLS, or migrations; introduces a new architectural pattern; reverses a prior in-code directive (e.g., reverses a "BANNED" or "DO NOT" lesson in CLAUDE.md). | Mandatory full 5-advisor + peer review + chairman. |

## Three-question classifier

Walk in order, top to bottom. First "yes" wins the tier.

1. **High-stake markers (any of):**
   - Does the task add or remove a field/component a user would see?
   - Does it touch Supabase tables, RLS policies, or screen-scheme fields?
   - Is it the first instance of a new architectural pattern in Catalyst (e.g., a new state primitive, a new test harness, a new MCP integration)?
   - Does it reverse a CLAUDE.md `BANNED` / `DO NOT` / `DEPRECATED` directive?

   → If any yes: **high-stake**.

2. **Trivial markers (all of):**
   - Single file change?
   - Reversible with one `git revert`?
   - No UI surface visible to end users (e.g., comment, internal helper, type-only)?
   - No schema or test-harness impact?

   → If all yes: **trivial**.

3. **Otherwise:** **standard**.

When in doubt, classify higher. Council ceremony is cheaper than shipping a regression.

## Concrete examples (from Catalyst history)

| Task | Tier | Why |
|---|---|---|
| Bump HubSwitcher tile token from `subtler` to `subtle` | **Trivial** | One line. Reverts cleanly. UI but ADS-canonical change, no field add/remove. |
| Fix raw hex in FilterDropdown to `--ds-*` tokens | **Trivial** | Same file, ADS-token swap, no semantic change. |
| Replace stock @atlaskit/icon glyph with bespoke SVG | **Trivial** | Single file, swappable, behavior identical. |
| Add a Recent section to HubSwitcher (Step 7.3) | **Standard** | Multi-file (component + hook + test), bounded, follows existing localStorage pattern in Catalyst. |
| Add ⌘1–⌘0 keyboard shortcut layer | **Standard** | New hook + wiring, but follows useCommandK precedent. |
| Replace HubSwitcher popover with grid-icon-opens-palette (Council Step 1) | **High-stake** | Removes a user-visible UX. CLAUDE.md "ask before remove" requires the council. |
| Add Caty AI inline action invocation in palette | **High-stake** | New architectural pattern (LLM-driven side-effects from a search surface), schema-adjacent, multi-week build. |
| Migrate sidebar accent color to per-hub tone | **Standard** | Multi-file but no new pattern; inherits from HubSwitcher tone system. |
| Drop Plan from the hub list | **High-stake** | Removes a user-visible component. Ask Vikram explicitly. |
| Add a new column to ph_issues | **High-stake** | Schema migration. Lovable SQL execution path. |
| Add a unit test for an existing helper | **Trivial** | Single file. No surface change. |

## When the classification is wrong

If a task is mid-execution and a high-stake marker emerges (e.g., "this 'standard' refactor turns out to need a schema change"), halt the plan, re-classify as high-stake, re-run Phase 1 council, regenerate Phase 2.

The cost of re-planning is bounded. The cost of shipping a high-stake change without the council is unbounded.
