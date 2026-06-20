# /C — Systematic-Debugging Shorthand

Diagnose root causes, trace bugs through multiple layers, and generate RCA reports.

## HARD VISUAL WIDGET RULE (P0, Non-Negotiable)

`show_widget` / `mcp__visualize__show_widget` is **BANNED** in this skill, with ONE exception:

✅ **ALLOWED:** A pixel-accurate HTML/SVG replica of real Catalyst UI — only when the bug is visual and a before/after component mockup makes the fix unambiguous.

❌ **BANNED (no exceptions):**
- RCA summary scorecard widgets
- Bug count dashboards or metric charts
- Any widget that shows findings, scores, or data ABOUT the bug rather than Catalyst UI itself
- Any widget that is conversational or explanatory in nature

**All RCA findings, root causes, fix steps, and conclusions go in plain prose only — never in a widget.**

Delegates to `/systematic-debugging`.
