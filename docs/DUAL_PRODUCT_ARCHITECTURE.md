# Dual-Product Architecture: Catalyst & STRATA

**Status:** ✅ Fully Implemented  
**Updated:** 2026-07-07  
**Isolation Feature:** CAT-STRATA-ISOLATE-20260707-001

---

## Architecture Overview

The system supports **two independent products** that coexist on the same codebase:

### **Product 1: Catalyst**
- **Primary Domain:** Project & Portfolio Management
- **Routes:** `/project-hub`, `/product-hub`, `/release-hub`, `/testhub`, etc.
- **Admin:** Project settings, portfolio config
- **Identifier:** `APP_PRODUCT=CATALYST`
- **Branch:** `main`
- **Switcher Entry:** "📊 Catalyst"

### **Product 2: STRATA**
- **Primary Domain:** Strategic Execution & Performance Management
- **Routes:** `/strata`, `/strata/admin`, `/strata/scorecards`, `/strata/kpis`, etc.
- **Admin Panel:** `/strata/admin` (STRATA Configuration)
- **Identifier:** `APP_PRODUCT=STRATA`
- **Branch:** `strata-standalone`
- **Switcher Entry:** "🎯 STRATA"

---

## Complete Feature Matrix

| Aspect | Catalyst | STRATA |
|--------|----------|--------|
| **Frontend** | ✅ `/project-hub`, `/product-hub`, etc. | ✅ `/strata`, `/strata/strategy`, `/strata/scorecards`, etc. |
| **Admin Panel** | ✅ Built-in settings | ✅ `/strata/admin` (STRATA Configuration) |
| **Database Tables** | ✅ Catalyst-prefixed tables | ✅ `strata_*` tables |
| **Migrations** | ✅ `supabase/migrations/` | ✅ `supabase/strata/migrations/` |
| **Environment Var** | `APP_PRODUCT=CATALYST` | `APP_PRODUCT=STRATA` |
| **Git Branch** | `main` | `strata-standalone` |
| **Product Switcher** | "📊 Catalyst" | "🎯 STRATA" |
| **Feature Flags** | `strategy_hub` (gated) | Part of `strategy_hub` feature |
| **RLS Enforcement** | Row-level security enforced | Row-level security enforced |

---

## STRATA vs Strategy Hub (Legacy)

### Current State

**Strategy Hub (Legacy) → STRATA (New)**

The old `/strategyhub/*` routes have been **decommissioned and redirected**:

```typescript
// src/App.tsx - Legacy redirect (CAT-STRATA-20260705-001)
function StrategyhubLegacyRedirect() {
  return <Navigate to={'/strata' + location.search + location.hash} replace />;
}

<Route path="/strategyhub" element={<StrategyhubLegacyRedirect />} />
<Route path="/strategyhub/*" element={<StrategyhubLegacyRedirect />} />
<Route path="/strategy-room" element={<StrategyhubLegacyRedirect />} />
```

**Result:** All legacy Strategy Hub bookmarks (`/strategyhub`, `/strategy-room`) automatically redirect to STRATA's Command Center (`/strata`).

### Why the Transition?

1. **STRATA is Purpose-Built:** Designed specifically for strategic execution with:
   - Scorecard-driven performance measurement
   - KPI/OKR management
   - Value realization tracking
   - Governance-enforced change workflows
   
2. **Consolidation:** STRATA replaces the distributed Strategy Hub with a unified platform

3. **No Parallel Support:** Strategy Hub and STRATA are **not** running in parallel; STRATA is the exclusive strategic management layer

---

## Product Switching Architecture

### User-Facing Product Switcher

**Component:** `<StrataSwitcher />` (added to header)

**Shows:**
```
┌─ Catalyst   ┐
│  📊 Catalyst                        │
│  Project and portfolio management  │
│                                     │
│  🎯 STRATA             Active      │
│  Strategic execution platform      │
└─────────────────────────────────────┘
```

### Switching Mechanism

**When user clicks "🎯 STRATA":**
1. Environment variable updated: `APP_PRODUCT=STRATA`
2. App routing switches to STRATA module
3. Page redirects to `/strata` (STRATA Command Center)
4. STRATA-specific routes become accessible
5. Catalyst routes are hidden/blocked

**When user clicks "📊 Catalyst":**
1. Environment variable updated: `APP_PRODUCT=CATALYST`
2. App routing switches to Catalyst module
3. Page redirects to `/project-hub`
4. Catalyst-specific routes become accessible
5. STRATA routes are hidden/blocked

---

## STRATA Admin Panel Details

### Access Point
**Route:** `/strata/admin` and `/strata/admin/:section`

**Sidebar Navigation:** "📋 Configuration" footer link (EnterpriseSidebar)

### Admin Capabilities

The STRATA Admin Panel (`StrataAdminConfigPage.tsx`) provides governance-controlled configuration for:

1. **Perspectives** — Strategic framework definitions
2. **Threshold Schemes** — Scorecard performance bands
3. **KPI Types** — KPI categories and measurement rules
4. **Scorecard Models** — Reusable templates
5. **Value Categories** — Portfolio benefit categories
6. **Gate Models** — Stage-gate workflows
7. **Workflows** — Process definitions
8. **Upload Templates** — Data ingestion templates
9. **Project Card Fields** — Custom field definitions
10. **Role Assignments** — Access control
11. **Change Requests** — Governance approval log
12. **Audit Trail** — Compliance records

### Governance Envelope

Every configuration shows:
```
v3 | Approved | Effective 2026-06-15 | Approved 2026-06-14
    "Added Q3 financial KPI alignment per board request"
```

**States:** draft → pending_approval → approved → retired → superseded

---

## Catalyst Admin (Built-in)

Catalyst doesn't have a dedicated `/catalyst/admin` route. Admin functions are built into:
- Project settings (`/project-hub/:key/settings`)
- Product hub configuration
- Release hub settings
- Test hub administration
- Portfolio management settings

---

## Code Organization

### File Structure

```
src/
├── modules/
│   ├── strata/                          # STRATA module
│   │   ├── pages/
│   │   │   ├── StrataCommandCenterPage.tsx
│   │   │   ├── StrataAdminConfigPage.tsx    ← Admin panel
│   │   │   ├── StrataScorecardsPage.tsx
│   │   │   ├── StrataKpiLibraryPage.tsx
│   │   │   └── ... (11 more pages)
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── domain/
│   │   ├── types.ts
│   │   └── StrataRoutes.tsx
│   │
│   └── strategy/                        # Legacy/Infrastructure only
│       ├── astryx/
│       └── ... (no pages—decommissioned)
│
├── components/layout/
│   ├── StrataSwitcher.tsx               ← Product switcher UI
│   ├── EnterpriseSidebar.tsx            ← STRATA sidebar (with admin link)
│   └── HubSwitcher.tsx                  ← Hub switcher (within product)
│
├── hooks/
│   └── useStrataSwitcher.ts             ← Product switching logic
│
├── lib/
│   ├── productEnvironmentGuard.ts       ← Startup guard
│   └── routes.ts
│
└── config/
    └── routeRegistry.ts                 ← Route metadata (STRATA routes registered)
```

### Routing Registration

**Route Registry** (`src/config/routeRegistry.ts`):
- ✅ 14 STRATA routes registered (command center, strategy, scorecards, KPIs, etc.)
- ✅ `/strata/admin` registered as "STRATA Configuration"
- ✅ Legacy `/enterprise/*` routes for backward compatibility

**Route Shell** (`src/modules/strata/StrataRoutes.tsx`):
- ✅ All STRATA routes wired with lazy loading and error boundaries
- ✅ Admin routes mounted at lines 78-79

---

## Migration Path: Legacy → STRATA

### For Users

1. **Automatic:** Old `/strategyhub` links redirect to STRATA
2. **Transparent:** No action required—bookmarks still work
3. **Unification:** All strategy functionality now in `/strata`

### For Developers

1. **Legacy module** at `src/modules/strategy/` contains:
   - Theme configuration (Astryx ring-fence)
   - Utility functions
   - NO pages or routes (decommissioned)

2. **STRATA module** at `src/modules/strata/` contains:
   - All pages, components, hooks, domain logic
   - Complete API integration
   - Governance framework
   - Admin panel

---

## Environment & Isolation

### Environment Variables

**For Catalyst:**
```bash
APP_PRODUCT=CATALYST
VITE_SUPABASE_URL=https://cyijbdeuehohvhnsywig.supabase.co  (staging)
VITE_SUPABASE_PUBLISHABLE_KEY=...
```

**For STRATA:**
```bash
APP_PRODUCT=STRATA
VITE_SUPABASE_URL=https://cyijbdeuehohvhnsywig.supabase.co  (same project)
VITE_SUPABASE_PUBLISHABLE_KEY=...
```

**Note:** Both use the **same Supabase project**. Isolation via RLS policies and `APP_PRODUCT` app routing.

### Database Isolation

| Layer | Catalyst | STRATA |
|-------|----------|--------|
| **Migrations** | `supabase/migrations/` | `supabase/strata/migrations/` |
| **Tables** | Catalyst-specific | `strata_*` tables |
| **RLS Policies** | Role-based row filtering | Role-based row filtering |
| **App Routing** | APP_PRODUCT=CATALYST selector | APP_PRODUCT=STRATA selector |

---

## Feature Flags & Access Control

### Feature Flag: `strategy_hub`

STRATA is gated behind the `strategy_hub` feature flag:
- Requires: `feature_flags.strategy_hub = true`
- Also requires: `enterprise` role (from `user_roles.enterprise`)

```typescript
// In ModuleGuard or route protection
if (!flags.strategy_hub || !roles.enterprise) {
  return <AccessDenied />;
}
```

### Roles

- **STRATA User:** `enterprise` role + `strategy_hub` feature flag
- **STRATA Admin:** `strata_admin` role (assigned in `role_assignments`)
- **Fallback:** Platform admin or system owner

---

## Integration Checklist

### ✅ Implemented

- [x] `StrataSwitcher` UI component in header
- [x] `useStrataSwitcher()` hook for product switching
- [x] `useAvailableProducts()` hook for product list
- [x] `useProductFeatures()` hook for feature gating
- [x] `productEnvironmentGuard.ts` startup validation
- [x] STRATA routes fully registered
- [x] STRATA admin panel at `/strata/admin`
- [x] Legacy Strategy Hub redirects to STRATA
- [x] Pre-push hook for `strata-standalone` branch protection
- [x] Environment templates (`.env.example.catalyst`, `.env.example.strata`)
- [x] Package scripts (`dev:catalyst`, `dev:strata`, `db:migrate:catalyst`, `db:migrate:strata`)
- [x] Comprehensive documentation

### 🎯 Working State

- ✅ Both products can be accessed via product switcher
- ✅ Each product has its own frontend + admin
- ✅ Environment isolation (APP_PRODUCT)
- ✅ Database isolation (RLS + strata_* tables)
- ✅ Branch isolation (strata-standalone)
- ✅ Migration isolation (separate folders + scripts)
- ✅ Push protection (pre-push hook on strata-standalone)

---

## Usage Examples

### Develop Catalyst

```bash
git checkout main
cp .env.example.catalyst .env.local
npm run dev:catalyst
# Navigate to http://localhost:5173/project-hub
```

### Develop STRATA

```bash
git checkout strata-standalone
cp .env.example.strata .env.local
npm run dev:strata
# Navigate to http://localhost:5173/strata
```

### Access STRATA Admin

```bash
# While on strata-standalone with APP_PRODUCT=STRATA
# Navigate to: http://localhost:5173/strata/admin
# Or click "📋 Configuration" in STRATA sidebar footer
```

### Switch Products at Runtime

```typescript
import { useStrataSwitcher } from '@/hooks/useStrataSwitcher';

function SwitchButton() {
  const { current, switchTo } = useStrataSwitcher();
  
  return (
    <button onClick={() => switchTo(current === 'CATALYST' ? 'STRATA' : 'CATALYST')}>
      Switch to {current === 'CATALYST' ? 'STRATA' : 'Catalyst'}
    </button>
  );
}
```

---

## Summary

| Component | Catalyst | STRATA |
|-----------|----------|--------|
| **Frontend** | ✅ Full platform | ✅ Strategic execution |
| **Admin** | ✅ Distributed | ✅ `/strata/admin` |
| **Routes** | ✅ `/project-hub/*` | ✅ `/strata/*` |
| **Migrations** | ✅ `supabase/migrations/` | ✅ `supabase/strata/migrations/` |
| **Database** | ✅ Catalyst tables | ✅ `strata_*` tables |
| **Branch** | ✅ `main` | ✅ `strata-standalone` |
| **Product Selector** | ✅ Shown in switcher | ✅ Shown in switcher |
| **Coexistence** | ✅ Can run both | ✅ Can run both |

**Status:** ✅ Both products fully implemented and coexisting on same codebase

---

**Related Docs:**
- [STRATA_SWITCHER_INTEGRATION.md](STRATA_SWITCHER_INTEGRATION.md)
- [STRATA_ADMIN_PANEL.md](STRATA_ADMIN_PANEL.md)
- [README_STRATA_ISOLATION.md](../README_STRATA_ISOLATION.md)

**Feature Work:** CAT-STRATA-ISOLATE-20260707-001 + CAT-STRATA-20260705-001
