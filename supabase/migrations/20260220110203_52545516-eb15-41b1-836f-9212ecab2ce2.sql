
-- Recreate vw_alignment_map using es_initiatives (which has key_result_id FK)
-- and es_initiative_epics → epics for the full chain
DROP VIEW IF EXISTS vw_alignment_map;

CREATE VIEW vw_alignment_map AS
SELECT
  t.id AS theme_id,
  'ST-' || LPAD(t.sort_order::text, 3, '0') AS theme_key,
  t.title AS theme_name,
  t.color AS theme_color,
  t.status AS theme_status,
  t.progress_pct::numeric AS theme_progress,

  g.id AS goal_id,
  g.goal_key,
  g.title AS goal_title,
  g.status AS goal_status,
  g.progress_pct::numeric AS goal_progress,
  g.ai_health_score AS goal_health,

  kr.id AS kr_id,
  kr.kr_key,
  kr.title AS kr_title,
  kr.status AS kr_status,
  kr.progress_pct::numeric AS kr_progress,

  -- Initiative from es_initiatives (linked to KR via key_result_id)
  esi.id AS initiative_id,
  esi.title AS initiative_key,
  esi.title AS initiative_title,
  esi.status AS initiative_status,
  esi.progress_pct::numeric AS initiative_progress,

  ep.id AS epic_id,
  ep.epic_key AS epic_key,
  ep.name AS epic_title,
  ep.status AS epic_status

FROM es_strategic_themes t
LEFT JOIN es_goals g ON g.theme_id = t.id
LEFT JOIN es_key_results kr ON kr.goal_id = g.id
LEFT JOIN es_initiatives esi ON esi.key_result_id = kr.id
LEFT JOIN es_initiative_epics eie ON eie.initiative_id = esi.id
LEFT JOIN epics ep ON ep.id = eie.epic_id
ORDER BY t.sort_order, g.goal_key, kr.kr_key;

-- Seed initiative → epic links using es_initiatives IDs
DELETE FROM es_initiative_epics;

INSERT INTO es_initiative_epics (initiative_id, epic_id, link_type) VALUES
  ('f0000001-0000-0000-0000-000000000001', '08663fcf-4519-43f1-a282-1b1eedf0f532', 'epic'),
  ('f0000002-0000-0000-0000-000000000002', '38cab8d7-c255-43b7-9a8f-a2d6c8e52946', 'epic'),
  ('f0000003-0000-0000-0000-000000000003', '8ceb4243-e279-4e0c-a8d8-29aad76b0c7c', 'epic'),
  ('f0000004-0000-0000-0000-000000000004', '18269628-4427-4f0e-ba41-ff7f376cd50f', 'epic'),
  ('f0000005-0000-0000-0000-000000000005', '2172e3b1-930b-4f0c-b930-d788fcb3581b', 'epic'),
  ('f0000006-0000-0000-0000-000000000006', '1c9ae96b-2239-4042-9081-15cd9b1eff53', 'epic'),
  ('f0000007-0000-0000-0000-000000000007', '81283240-6d2b-4e35-871f-0435518bfa72', 'epic'),
  ('f0000008-0000-0000-0000-000000000008', '9f13fab7-0d5a-44d0-8dc4-549aba2d4565', 'epic'),
  ('f0000009-0000-0000-0000-000000000009', '7e1eafff-053a-44fa-9a5b-6b83deaa3e60', 'epic'),
  ('f0000010-0000-0000-0000-000000000010', '1c9ae96b-2239-4042-9081-15cd9b1eff53', 'epic');
