-- ═══════════════════════════════════════════════════════════════════════════
-- projects.avatar_url — point existing rows at real Jira universal_avatar URLs
-- Author: Catalyst team (TurnQy) · April 2026
--
-- The schema for projects.avatar_url shipped in 20260424121523. This migration
-- populates real values for the 18 projects Vikram's Jira tenant exposes
-- (digital-transformation.atlassian.net) so the "Recommended projects" strip
-- on /for-you renders the same branded avatars Jira shows, matching the
-- /jira-compare 2026-04-24 audit.
--
-- Source of truth: the Atlassian MCP `getVisibleJiraProjects` response, which
-- returns `avatarUrls["48x48"]` per project. We map Catalyst's project key
-- (e.g. "BAU") → Jira's universal_avatar URL at medium size (32×32, what
-- @atlaskit/avatar size="medium" expects).
--
-- Idempotency: we only UPDATE rows that currently have a NULL avatar_url.
-- Hand-set avatars in Catalyst never get clobbered.
--
-- Parity note
-- ───────────
-- The tenant-hosted URL (digital-transformation.atlassian.net/rest/...) is
-- chosen over the api.atlassian.com gateway variant because:
--   1. Atlaskit's <Avatar src> uses a plain <img> under the hood, so browsers
--      render the image cross-origin without CORS (image display is not
--      subject to CORS — only canvas readback is).
--   2. When the user is signed into Jira, the tenant URL serves the avatar
--      with their session cookies (same-site for *.atlassian.net), no
--      preflight. This matches how Jira itself renders these avatars.
--
-- Future work (NOT in this migration)
-- ────────────────────────────────────
-- Mirror these 14 unique SVGs to Supabase Storage so Catalyst isn't
-- runtime-dependent on atlassian.net. When that lands, re-run this migration
-- against the Storage public URLs. Tracked under the For You / jira-compare
-- follow-up backlog.
-- ═══════════════════════════════════════════════════════════════════════════

-- Map from Jira project KEY → Jira avatar ID (from getVisibleJiraProjects).
-- Kept as a CTE so the seed list is greppable in one place.
WITH key_to_avatar (key, avatar_id) AS (
  VALUES
    ('BAU',  10413),  -- Senaei BAU
    ('DATA', 10401),  -- DATA Project
    ('DET',  10422),  -- Digital Experience Team
    ('ESS',  10402),  -- Enterprise Shared Services
    ('FSM',  10406),  -- Field Service Management
    ('ICP',  10411),  -- ICP Project
    ('IN',   10410),  -- Inspection Project
    ('INV',  10415),  -- Investor360
    ('IP',   10421),  -- IP Implementation
    ('IRP',  10415),  -- IR Platform
    ('ISA',  10417),  -- Industry.sa
    ('MDT',  10417),  -- MIM Digital Transformation Demand
    ('MIMI', 10414),  -- MIM Internal - Implementation
    ('MWR',  10401),  -- MIM Website Revamp
    ('SAPI', 10405),  -- SAP Implementation
    ('SIMP', 10400),  -- SS Implementation
    ('SS',   10418),  -- Sectorial Services
    ('TAH',  10421)   -- Tahommena
)
UPDATE public.projects AS p
SET avatar_url = 'https://digital-transformation.atlassian.net/rest/api/2/universal_avatar/view/type/project/avatar/' || k.avatar_id::text || '?size=medium'
FROM key_to_avatar AS k
WHERE p.key = k.key
  AND p.avatar_url IS NULL;

-- Sanity check: nothing to assert here that won't flag false positives on
-- partially-seeded tenants. The UPDATE is idempotent by the NULL guard.
