# S5 Session Plan — Shell + Routes + Module Scaffold

**Status**: READY FOR IMPLEMENTATION | **Scope**: Routes, module scaffold, shell integration | **Time**: ~2h

---

## What S5 Does

Completes Phase 1 by:
1. Registering ideation routes (builders in `src/lib/routes.ts`)
2. Mounting routes behind `VITE_ENABLE_IDEATION` flag in `FullAppRoutes.tsx`
3. Removing legacy route mounts (per D1)
4. Creating module scaffold with empty-state pages
5. Integrating with CatalystShell hub-home mapping
6. Configuring IdeationSidebar

Exit = navigable module for flagged users. No UI yet (Phase 2). Legacy pages untouched until Phase 8 decommission.

---

## Exact Locations to Change

### 1. **src/lib/routes.ts** (add route builders)

Append to the `Routes` object:

```typescript
ideation: {
  root: () => '/ideation',
  inbox: () => '/ideation',
  explore: () => '/ideation/explore',
  portfolio: () => '/ideation/portfolio',
  idea: (slug: string) => `/ideation/ideas/${slug}`,
  submit: () => '/ideation/submit',
  admin: {
    root: () => '/admin/ideation',
    scoring: () => '/admin/ideation/scoring',
    workflow: () => '/admin/ideation/workflow',
    intake: () => '/admin/ideation/intake',
    ai: () => '/admin/ideation/ai',
    roles: () => '/admin/ideation/roles',
  },
}
```

### 2. **src/routes/FullAppRoutes.tsx** (mount routes)

**Step A**: Add to imports (after ENABLE_* imports, ~line 15):

```typescript
import { ENABLE_IDEATION } from '../lib/featureFlags';
```

**Step B**: Add lazy imports for empty-state pages (~line 142, after IdeasAnalyticsPage):

```typescript
const IdeationInboxPageLazy = ENABLE_IDEATION ? lazy(() => import("../modules/ideation/pages/InboxPage")) : () => <FeatureComingSoon title="Ideation Inbox" />;
const IdeationExplorePageLazy = ENABLE_IDEATION ? lazy(() => import("../modules/ideation/pages/ExplorePage")) : () => <FeatureComingSoon title="Ideation Explore" />;
const IdeationPortfolioPageLazy = ENABLE_IDEATION ? lazy(() => import("../modules/ideation/pages/PortfolioPage")) : () => <FeatureComingSoon title="Ideation Portfolio" />;
const IdeationDetailPageLazy = ENABLE_IDEATION ? lazy(() => import("../modules/ideation/pages/DetailPage")) : () => <FeatureComingSoon title="Idea Detail" />;
const IdeationSubmitPageLazy = ENABLE_IDEATION ? lazy(() => import("../modules/ideation/pages/SubmitPage")) : () => <FeatureComingSoon title="Submit Idea" />;
const IdeationAdminPageLazy = ENABLE_IDEATION ? lazy(() => import("../modules/ideation/admin/AdminPage")) : () => <FeatureComingSoon title="Ideation Admin" />;
```

**Step C**: **REMOVE** legacy mounts (search for `/ideation` in the Routes JSX; remove these entries):
```typescript
<Route path="/ideation/*" element={...} />  // FullAppRoutes.tsx:133-139
<Route path="/product/ideas/*" element={...} />  // FullAppRoutes.tsx:571-593
```

**Step D**: Add new mounts (after ProductNativeAllWorkPage routes, ~line X):

```typescript
{/* Ideation Hub — CAT-IDEATION-REBUILD-20260709-001 */}
<Route path="/ideation" element={<ModuleGuard moduleCode="ideation"><Suspense fallback={<div>Loading...</div>}><IdeationInboxPageLazy /></Suspense></ModuleGuard>} />
<Route path="/ideation/explore" element={<ModuleGuard moduleCode="ideation"><Suspense fallback={<div>Loading...</div>}><IdeationExplorePageLazy /></Suspense></ModuleGuard>} />
<Route path="/ideation/portfolio" element={<ModuleGuard moduleCode="ideation"><Suspense fallback={<div>Loading...</div>}><IdeationPortfolioPageLazy /></Suspense></ModuleGuard>} />
<Route path="/ideation/ideas/:slug" element={<ModuleGuard moduleCode="ideation"><Suspense fallback={<div>Loading...</div>}><IdeationDetailPageLazy /></Suspense></ModuleGuard>} />
<Route path="/ideation/submit" element={<ModuleGuard moduleCode="ideation"><Suspense fallback={<div>Loading...</div>}><IdeationSubmitPageLazy /></Suspense></ModuleGuard>} />
<Route path="/admin/ideation/*" element={<RouteRoleGuard required="admin"><Suspense fallback={<div>Loading...</div>}><IdeationAdminPageLazy /></Suspense></RouteRoleGuard>} />
```

Note: Routes are behind `ENABLE_IDEATION` flag (conditional lazy import) + `ModuleGuard` (role-based RLS).

### 3. **src/modules/ideation/** (create scaffold)

Create directory structure:

```
src/modules/ideation/
  index.ts                      (exports)
  types.ts                      (types: Idea, IdeationState, etc.)
  api/
    ideationApi.ts              (Supabase queries + mutations)
  hooks/
    useIdeas.ts                 (fetches via useQuery)
    useIdea.ts                  (single-idea fetch)
  pages/
    InboxPage.tsx               (empty state: "Inbox zero...")
    ExplorePage.tsx             (empty state: "No ideas...")
    PortfolioPage.tsx           (empty state: "Empty board...")
    DetailPage.tsx              (empty state: "Idea not found...")
    SubmitPage.tsx              (empty state: "Coming soon...")
  admin/
    AdminPage.tsx               (empty state: "Admin controls...")
  components/
    (empty, Phase 2 scope)
  shared/
    (empty, Phase 2 scope)
```

### 4. **src/components/layout/CatalystShell.tsx** (hub-home mapping)

Find the hub-home logic (search for `hubToHomeRoute` or similar; ~line 242, 416-420 per design blueprint note):

Update to map `/ideation` home as `/ideation` (inbox-first landing per 04 C.1):

```typescript
const hubToHomeRoute = {
  // ... existing
  'ideation': '/ideation',
};
```

### 5. **src/components/layout/IdeationSidebar.tsx** (new sidebar config)

Create a new sidebar nav per HubPageHeader pattern. File structure:

```typescript
import type { SidebarItem } from '@/components/layout/SidebarLayout';
import { SidebarLayout } from '@/components/layout/SidebarLayout';
import { Routes } from '@/lib/routes';

const IDEATION_SIDEBAR_ITEMS: SidebarItem[] = [
  { label: 'Inbox', href: Routes.ideation.inbox(), icon: 'inbox', badge: { count: 12, label: 'untriaged' } },
  { label: 'Explore', href: Routes.ideation.explore(), icon: 'list' },
  { label: 'Portfolio', href: Routes.ideation.portfolio(), icon: 'kanban' },
  { divider: true },
  { label: 'Admin', href: Routes.ideation.admin.root(), icon: 'settings', minRole: 'admin' },
];

export function IdeationSidebar() {
  return <SidebarLayout items={IDEATION_SIDEBAR_ITEMS} />;
}
```

Mount in InboxPage/ExplorePage/PortfolioPage as left sidebar.

---

## Implementation Order

1. **routes.ts** — Add builders (test by importing)
2. **FullAppRoutes.tsx** — Add imports, then mounts, then remove legacy
3. **Module scaffold** — Create directory + 6 empty-state pages (copy EmptyBoardState pattern)
4. **Sidebar** — Create IdeationSidebar component, mount in pages
5. **CatalystShell** — Update hub-home map
6. **Test** — Flag on locally, verify `/ideation` reachable, sidebar renders, 404 when flag off

---

## Empty-State Page Templates

All 6 pages follow the same pattern:

```typescript
import { CatalystShell } from '@/components/layout/CatalystShell';
import { HubPageHeader } from '@/components/layout/HubPageHeader';
import { EmptyBoardState } from '@/components/empty-states/EmptyBoardState';

export default function InboxPage() {
  return (
    <CatalystShell hub="ideation">
      <HubPageHeader title="Ideation · Inbox" />
      <EmptyBoardState 
        title="Inbox zero"
        description="Nothing waiting on you. Explore ideas or submit your own."
        icon="inbox"
        actions={[{ label: 'Submit Idea', href: Routes.ideation.submit() }]}
      />
    </CatalystShell>
  );
}
```

(DetailPage: use CatalystViewBase layout instead; SubmitPage: use ModalDialog pattern.)

---

## Validation (Post-Implementation)

```bash
# Build passes
npm run build

# Routing works (flag on)
VITE_ENABLE_IDEATION=true npm run dev
# Navigate to http://localhost:5173/ideation → InboxPage renders

# Sidebar mounts
# Check: InboxPage, ExplorePage, PortfolioPage all render IdeationSidebar

# ModuleGuard enforces role (flag on, user without ideation role)
# Check: /ideation returns 403 or "Access Denied" page

# Legacy routes removed (search codebase)
grep -r "/ideation/backlog\|/product/ideas" src/routes/
# Expected: 0 matches (legacy deleted)

# Color gate + audit gate pass (ADS tokens only)
npm run lint:colors:gate && npm run audit:ads:gate
```

---

## Cautions for Next Session

- ⚠️ **Don't create UI yet** — Phase 2 scope. Empty states only.
- ⚠️ **ModuleGuard patterns** — Study existing usage (ProjectHub, ProductHub) to replicate syntax
- ⚠️ **IdeationSidebar icon set** — Use `@atlaskit/icon/core/lightbulb` (no lucide)
- ⚠️ **Routes.ideation builder** — Test by importing in FullAppRoutes before mounting
- ⚠️ **Legacy cleanup** — Run grep before committing to confirm no strays

---

## Next: Validation + S4 Staging Application

1. Commit S5
2. Apply S3 migration to staging (cyijbdeuehohvhnsywig) via Supabase MCP
3. Verify scoring models, workflow, guards in DB
4. Flag on locally (VITE_ENABLE_IDEATION=true) + smoke test navigation
5. Staging readiness check → Plan Lock approval for S4–S5 → Phase 2 planning

---

**Deliverable**: Phase 1 complete — invisible skeleton visible to flagged users. 
Exit: Plan Lock for Phase 2 (CRUD UI + permissions + workflow wiring).
