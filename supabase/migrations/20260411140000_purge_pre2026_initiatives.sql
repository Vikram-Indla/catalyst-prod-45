-- ══════════════════════════════════════════════════════════════
-- PURGE PRE-2026 INITIATIVES
-- Removes ph_initiatives that have no 2026 activity
-- (neither created nor updated in 2026 or later).
-- FK-dependent tables (ph_initiative_scores, ph_user_favorites,
-- etc.) cascade-delete automatically.
-- ══════════════════════════════════════════════════════════════

DELETE FROM ph_initiatives
WHERE created_at < '2026-01-01'
  AND (updated_at IS NULL OR updated_at < '2026-01-01');
