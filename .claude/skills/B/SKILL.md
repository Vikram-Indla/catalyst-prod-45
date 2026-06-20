# /B — Design-Critique Shorthand

Audit and redesign Catalyst UI surfaces.

## HARD VISUAL WIDGET RULE (P0, Non-Negotiable)

`show_widget` / `mcp__visualize__show_widget` is **BANNED** except for one use:

✅ **ALLOWED:** A pixel-accurate HTML/SVG replica of actual Catalyst UI as it exists (or should exist) at localhost:8080 — real component structure: buttons at correct sizes, avatars with correct placement, text hierarchy, spacing, colors. Before/after side-by-side Catalyst component mockups are permitted.

❌ **BANNED (no exceptions, zero tolerance):**
- Heuristic scorecard widgets (scores, percentage bars, violation counts in a widget)
- Violation tables rendered as widgets
- Metric dashboards, radar charts, bar charts, progress rings, any data visualization
- Any widget whose content is commentary ABOUT the UI rather than a REPLICA of the UI
- Any widget produced before probing localhost:8080 via Chrome MCP

**Scores, findings, and violation lists go in plain prose only — one line per finding — never in a widget.**

## Invocation steps
1. Probe the live page at localhost:8080 via Chrome MCP DOM probe
2. Research the reference pattern (Jira, or canonical Catalyst Storybook component)
3. Write findings as plain prose (one line each: issue, severity, fix)
4. If a before/after UI mockup adds clarity: render ONE `show_widget` of the actual Catalyst component layout — not a scorecard

Delegates to `/design-critique`.
