# Session 004 — Enterprise recovery audit + 50x bolster (Fable 5, 2026-07-05)
Covers BOTH CAT-DOCS-NOTION-20260704-001 and CAT-VOICE-FLOW-20260704-001.

## What happened
Vikram demanded an evidence-based recovery audit (plan mode first): CatyFlow injection map,
functional truth, every-page inventory, Notion parity %, 50x bolster plan. Plan approved →
implementation passes A–I began. Full plan: ~/.claude/plans/expressive-launching-petal.md.

## Audit verdicts (live-probed, signed-in staging)
- Notion parity: **≈37%** overall (core writing loop ≈65-70%).
- CatyFlow: PARTIAL — entry points live (CTA/hotkeys/capsule), batch lane auths OK, but
  catyflow-token + catyflow-clean returned **401 to VALID JWTs** (getUser() w/o token arg).
- @-mention work items queried `catalyst_issues` = **0 rows on staging** (spine is ph_issues).
- `uploadFile` never passed to WikiEditor → media uploads dead.
- client.ts fell back to PROD supabase URL when env missing.

## ⛔ CONCURRENT-SESSION INCIDENT (mid-session)
The main checkout was switched to `main` by another session WHILE this audit ran. My stray
client.ts edit on main's tree was reverted; work moved to worktree
`.claude/worktrees/catyflow-recovery` on feat/CAT-WIKI-CATYFLOW-20260704.
**RED FLAG raised: main now carries a COMPETING Wiki hub (8dfe54f03, CAT-WIKI-RESTORE-
20260705-001: /wiki articles/learning-paths/analytics + HubSwitcher entry + demo-seed
migration) that landed AFTER this branch was cut → /wiki route + HubSwitcher + migration
collision at merge. Vikram must decide which Wiki wins before rebase.** Main is 50 commits
ahead; branch has 31 commits main lacks.

## Implemented this session (worktree, all gated tsc=183 / colors 0=0)
Pass A: client.ts dev fail-loud on missing VITE_SUPABASE_URL; WikiSandboxPage lazy made
DEV-ternary (chunk stripped from prod); /knowledge-hub/* → redirects
(LegacyKnowledgeHubRedirect.tsx: UUID→slug via kb_doc_spaces/kb_documents; ENABLE_KNOWLEDGE_HUB
usage removed from routes).
Pass B: both edge fns now `sb.auth.getUser(jwt)` (explicit token); WikiEditor @-menu +
GenerateStoriesFromPage repointed catalyst_issues→ph_issues (column: summary, order:
jira_updated_at); wikiUpload.ts (wiki-media bucket, mirrors mediaUpload.ts) passed as
uploadFile from WikiPageSurface:676; migration 20260705150000_wiki_media_bucket.sql (bucket +
policies); cleanupTranscript surfaces lane failure via catalystToast.warning once/page-load.

## BLOCKED on permissions/user
1. `supabase functions deploy catyflow-clean && supabase functions deploy catyflow-token`
   (auto-mode classifier denied; run from the worktree, ref=cyijbdeuehohvhnsywig).
2. Apply migration 20260705150000 to staging + ledger row.
3. /wiki collision decision (above). 4. Human mic test. 5. Prod rollout runbook items.

## Verification evidence (pre-fix probes)
- catyflow-token/clean: 401 w/ valid JWT (same JWT → 200 on /auth/v1/user + PostgREST).
- voice-transcribe: 400 empty_audio (auth OK). ai-translate-field: 200 مرحباً أيها العالم.
- catalyst_issues count=0, ph_issues count=2429 (staging SQL).
- Slash menu + callout insert + DictationCTA: live DOM/screenshot on /wiki/_sandbox.

## Addendum — Docex rename + Passes C & D (same session, post-approval)
Vikram resolved the /wiki collision: OUR hub renamed **Docex** at **/docex**; /wiki stays
with main's restored knowledge-base hub.

Commits (worktree .claude/worktrees/catyflow-recovery, branch feat/CAT-WIKI-CATYFLOW-20260704):
- 12d52f4be Docex rename (HubKey 'docex' + icon registry, Routes.docex w/ deprecated
  Routes.wiki alias, HubSwitcher/hubs/hub-tone/tabIdentity/workspaceContext/HomeSidebar/
  SidebarBase/MobileNav/shell/wikiPath/breadcrumbs/home hero + HubSwitcher.test).
- d26896681 Pass C: WikiEditorBoundary (loud editor-crash recover UI), optimistic
  concurrency (guardUpdatedAt → WIKI_CONFLICT + Keep-mine/Load-theirs banner), autosave
  retry + warning banner, export retry toasts.
- 39f221232 Pass D: /docex/search (FTS websearch + ilike merge, workspace-grouped,
  snippets), home Favorites+Recents rails, favorite star, Draft/Published lozenge +
  toggle, Duplicate, version history (10-min autosnapshot + manual save point + restore
  w/ pre-restore snapshot) over kb_document_versions.

Infra notes: worktree now has its OWN node_modules (bun install, 21s) — the shared
symlink broke the build when the other session re-synced deps to main's lockfile
(atlaskit adf-schema export mismatch). vite.config.worktree.ts (uncommitted, git-excluded)
isolates the dep-optimizer cache; dev server on :8090. Sandbox chunk verified ABSENT from
dist after the DEV-ternary fix (0 matches in dist/assets).

STILL USER-BLOCKED: (1) sign in once at http://localhost:8090 (live verification +
screenshots — session tokens can't be transferred by Claude); (2) deploy catyflow-clean +
catyflow-token to staging; (3) apply migration 20260705150000_wiki_media_bucket.sql +
ledger row; (4) human mic test for end-to-end dictation.
