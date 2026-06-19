-- ══════════════════════════════════════════════════════════════════
-- Fix rh_releases seed data: replace UUID names with proper release names
-- ══════════════════════════════════════════════════════════════════

-- Update releases with UUID names to use proper release names
UPDATE rh_releases
SET name = 'April Sprint'
WHERE name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  AND status = 'draft'
  AND name NOT IN ('July Beta', 'August Platform', 'June Production Release', 'Login Hotfix');

-- Ensure proper seed releases exist (idempotent insert)
INSERT INTO rh_releases (name, version, status, target_date, source)
VALUES
  ('May Release', 'v5.0', 'draft', '2026-05-31', 'catalyst'),
  ('April Sprint', 'v4.5', 'planned', '2026-04-30', 'catalyst')
ON CONFLICT DO NOTHING;
