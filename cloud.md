# Cloud Constraints

## Preview Tool Ban — ENFORCED 2026-05-12
**Do NOT use inbuilt preview tools** (`preview_*` tools like `preview_start`, `preview_screenshot`, `preview_eval`, etc.)
**All browser automation must use `mcp__claude-in-chrome__*` tools (Chrome MCP) or `mcp__computer-use__*` for native apps**

### Allowed Alternatives
- **Probe agents** — Use Agent tool with probe-focused personas
- **Computer use** — Use `mcp__computer-use__*` tools for browser automation and screenshots
- **MCP classes** — Use available MCP server classes and integrations

### Why
Preview tools are banned to encourage proper tool discipline and leverage the full MCP toolkit available.

---

## Current Session Notes
- Ask CATY button implementation verified via computer-use MCP
- Navigation to `/caty` route successful with conversation ID passing
- Conversation creation in Supabase working with corrected enum type (`type: 'chat'`)
