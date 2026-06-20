# /A — Start/Router Shorthand

Route requests to the appropriate skill.

## HARD VISUAL WIDGET RULE (P0, Non-Negotiable)

`show_widget` / `mcp__visualize__show_widget` is **BANNED** in this skill and in every skill it delegates to, with ONE exception:

✅ **ALLOWED:** A pixel-accurate HTML/SVG replica of real Catalyst UI — buttons, panels, avatars, toolbars, tables — exactly as they appear (or should appear) at localhost:8080. Before/after Catalyst component mockups are permitted.

❌ **BANNED (no exceptions):**
- Conversational scorecard widgets (heuristic scores, violation counts, metric dashboards)
- Information tables or data visualization charts
- Progress bars, radar charts, bar charts, any analytics widget
- Any widget that shows findings/scores/numbers rather than Catalyst UI itself
- Any widget generated without first probing the live page at localhost:8080

**Findings, scores, and violations go in plain prose only — never in a widget.**

Delegates to `/start`.
