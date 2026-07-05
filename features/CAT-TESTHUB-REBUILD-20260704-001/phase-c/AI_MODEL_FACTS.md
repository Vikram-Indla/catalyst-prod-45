
## ACTIVATION (Vikram shared a GEMINI key 2026-07-05 — NOT what the new fn needs)
- New generator ai-generate-test-artefacts = **Claude claude-opus-4-8** → needs supabase secret ANTHROPIC_API_KEY (not GEMINI_API_KEY).
- Gemini key powers legacy ~28 Gemini fns + old ai-generate-story-test-cases (superseded).
- Deploy: `supabase functions deploy ai-generate-test-artefacts --project-ref cyijbdeuehohvhnsywig` + set ANTHROPIC_API_KEY secret. Vikram sets secret (never in chat/code).
- OPEN: Vikram may prefer Gemini to reuse the key — if so, retarget edge fn to Gemini (lower quality). Recommendation stands: Claude.
- Frontend (Wave-2E) already rewired to call ai-generate-test-artefacts; will 500 until deployed + key set.
