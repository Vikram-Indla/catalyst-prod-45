-- ════════════════════════════════════════════════════════════════════════════
-- Business Requests — drop arabic_title column
-- 2026-06-01 | Vikram directive: deprecate Arabic title field entirely.
--
-- After today's slim from 108→22 columns, the BR canonical surface is now
-- single-language English. The TitleTranslateWrapper bilingual pattern in
-- the Create modal collapses back to a single Title field; the view's
-- BrArabicTitleSection is removed; the product backlog Arabic title column
-- is removed from the registry.
-- ════════════════════════════════════════════════════════════════════════════

ALTER TABLE business_requests DROP COLUMN IF EXISTS arabic_title CASCADE;
