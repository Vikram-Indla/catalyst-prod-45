
## ACTIVATION (Vikram shared a GEMINI key 2026-07-05 — NOT what the new fn needs)
- New generator ai-generate-test-artefacts = **Claude claude-opus-4-8** → needs supabase secret ANTHROPIC_API_KEY (not GEMINI_API_KEY).
- Gemini key powers legacy ~28 Gemini fns + old ai-generate-story-test-cases (superseded).
- **DEPLOYED 2026-07-05** to cyij via MCP deploy_edge_function — status ACTIVE, version 2, verify_jwt true. Function is live; returns `config_error` (500) until ANTHROPIC_API_KEY secret is set. That secret is the ONLY remaining activation step. Vikram sets it (never in chat/code).
- OPEN: Vikram may prefer Gemini to reuse the key — if so, retarget edge fn to Gemini (lower quality). Recommendation stands: Claude.
- Frontend (Wave-2E) already rewired to call ai-generate-test-artefacts; live once key set.
