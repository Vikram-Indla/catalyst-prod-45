# 08 — OKF and Offline Knowledge Sync: Decision Options

> Written because an interactive clarifying question could not be delivered in this
> session (non-interactive/webhook-driven — no live user to answer a blocking
> prompt). This document replaces that question: pick an option (or tell me I've
> misread the intent) and the next pass implements it directly.

## OKF

"OKF" does not appear anywhere in this codebase (confirmed by repo-wide search)
and is not a term this session can resolve from context. Three candidate readings,
in order of how much new work each implies:

| Reading | What it would mean here | New work required |
|---|---|---|
| **A. Organizational Knowledge Framework** — the categorization/access layer around knowledge content | Already substantially exists: `kb_sources` (source registry, priority, scrape config), `kb_access_matrix` (role × module read/write flags), both now reachable again since `kb-sync`/`kb-train` were un-parked this session | Low — mostly exposing/using what's already there; maybe a small admin UI pass on `KBAdminSetup.tsx` to surface `kb_access_matrix` if it isn't already |
| **B. Knowledge Graph** — entity/relationship graph over documents and work items | Confirmed **"Not found in repository"** by the original audit (`05_capability_matrix.md`) | High — genuinely new infrastructure: a graph store or a relational approximation (edge table + traversal queries), a UI, and a decision on what counts as a node/edge (documents? work items? both?) |
| **C. Not a real term** | Drop it; nothing further needed | None |

**My default, if I don't hear back**: treat it as reading **A**, since it requires
no new speculative infrastructure and the un-parking work already done this session
moves it forward concretely. I will not build reading **B** (a knowledge graph)
without explicit confirmation — that's too large and too speculative to start
from an undefined acronym.

## Offline knowledge sync

The existing service worker (`public/sw.js`) is not a neutral extension point —
its header comment states a deliberate boundary: *"User data never hits the SW
cache"* and lists *"no offline fallback HTML"* as an intentional non-goal, to
avoid stale-content bugs and keep deploys instant. Any of the options below
means **adding a second, separate caching mechanism alongside it** (not
extending `sw.js` itself), because the existing one's whole design rests on
never touching anything editable.

| Option | Scope | New work | Risk |
|---|---|---|---|
| **A. Offline read cache for Folio** | Cache recently-viewed published pages (`content_text` + metadata) in IndexedDB; read-only, no offline edits | New: an IndexedDB layer, a cache-population hook on page view, an explicit invalidation policy (page edited/deleted while a stale copy sits in a user's cache) | Medium — the invalidation policy is the real design work; get it wrong and users read stale/deleted content while offline |
| **B. Cross-device sync** | Keep in-progress edits synced across a user's devices/sessions even through brief disconnects (local-first, Notion-style) | Large: conflict resolution beyond the existing optimistic-concurrency check in `useUpdateWikiPage` (`WIKI_CONFLICT`), a local write-ahead queue, replay-on-reconnect logic | High — touches the actual editing path, not just reads; a bug here can lose or corrupt user edits |
| **C. External system sync** | Periodic sync between Catalyst's KB and an external tool (Confluence, SharePoint, a file share) | Closer to `kb-sync`'s existing table-ingestion pattern than to "offline" in the browser sense — would likely be a new `kb-sync` action, not a frontend change at all | Medium — mostly a scoping question: which external system, which direction (import/export/both) |
| **D. Drop for this pass** | Explicitly defer; keep this session's remaining effort on RAG/search/retrieval consolidation | None | None |

**My default, if I don't hear back**: do **not** implement any of A/B/C
speculatively. Offline sync is the one item in this goal where guessing wrong
has a real, demonstrated cost (violating `sw.js`'s own documented safety
invariant, or — worse for B — a data-loss bug in the editing path). I'll treat
this as **D** (deferred) unless told otherwise, and the remaining consolidation
work stays scoped to what the audit and this session's un-parking work already
cover: RAG, keyword/hybrid search, and retrieval.

## What happens next

Absent a reply, subsequent passes in this session proceed on the defaults above
(OKF → reading A, offline sync → deferred) and continue hardening/consolidating
the RAG pipeline that's already been un-parked (kb-eval revival decision,
ra-jira-proxy's plaintext-credential question, live-schema verification once
Supabase access is available). Correcting either default at any point just
redirects the next slice — nothing here is a one-way door.
