# Catalyst AI Architecture Intake Summary

**Generated:** 2026-01-09  
**Status:** Ready for Implementation

---

## 📋 SECTION F — OUTPUT

### 1) INTAKE SUMMARY

| Section | Item | Answer |
|---------|------|--------|
| **A1** | Side Panel Component | `src/components/layout/SidebarBase.tsx` |
| **A2** | Design Tokens | `src/index.css`, `tailwind.config.ts`, `src/constants/brandColors.ts` |
| **A3** | Schema Approach | **Extend existing** (add AI tables alongside current schema) |
| **B1** | Edge Functions | ✅ **Yes** - Enabled |
| **B2** | Key Management | **Supabase Secrets** (Anthropic key in vault) |
| **B3** | PII Level | **Unknown** → requires data classification review |
| **B3** | Masking Policy | **Allow for admins only** |
| **C1** | Monthly Budget | TBD (owner to confirm) |
| **C2** | Expected Usage | TBD (users/month, queries/day) |
| **C3** | Environments | **All** (Prod + Staging + Dev) |
| **D1** | Model Strategy | **Speed/Cost priority** (gemini-flash default) |
| **D2** | Quality Triggers | **Never override** (cost-low always) |
| **E1** | Q&A Cache TTL | **30 days** |
| **E1** | Resource Cache TTL | **7 days** |
| **E2** | Cache Invalidation | **Real-time subscriptions** |
| **E3** | Rate Limits | **Conservative** (10/user/day, 100/org/day) |

---

### 2) COST-LOW DEFAULT ARCHITECTURE

#### Model Routing Plan
```
┌─────────────────────────────────────────────────────────┐
│                   ALL AI REQUESTS                        │
│                         ↓                                │
│    ┌─────────────────────────────────────────────┐      │
│    │     google/gemini-2.5-flash-lite            │      │
│    │     (cheapest, fastest)                     │      │
│    └─────────────────────────────────────────────┘      │
│                                                          │
│    NO quality routing - cost-low enforced always        │
└─────────────────────────────────────────────────────────┘
```

**Implementation:**
```typescript
// supabase/functions/ai-catalyst/index.ts
const MODEL = "google/gemini-2.5-flash-lite"; // Always use cheapest
```

#### Caching Plan + TTLs

| Cache Type | TTL | Invalidation |
|------------|-----|--------------|
| Q&A Summaries | 30 days | Real-time on source table change |
| Resource Lookups | 7 days | Real-time on admin change |
| Analytics Rollups | 7 days | Daily scheduled |

**Database Tables to Add:**
```sql
-- AI response cache
CREATE TABLE ai_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key TEXT UNIQUE NOT NULL,
  query_hash TEXT NOT NULL,
  response_json JSONB NOT NULL,
  model_used TEXT NOT NULL,
  tokens_used INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  invalidated_at TIMESTAMPTZ
);

-- AI usage tracking (for rate limits)
CREATE TABLE ai_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  org_id UUID,
  query_type TEXT NOT NULL,
  tokens_input INTEGER,
  tokens_output INTEGER,
  cost_estimate DECIMAL(10,6),
  cache_hit BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for rate limiting
CREATE INDEX idx_ai_usage_user_day ON ai_usage_logs (user_id, created_at);
CREATE INDEX idx_ai_usage_org_day ON ai_usage_logs (org_id, created_at);
```

#### Edge Function Plan

```
supabase/functions/
├── ai-catalyst/
│   └── index.ts          # Main AI gateway with caching + rate limits
├── ai-cache-invalidate/
│   └── index.ts          # Real-time cache invalidation webhook
└── ai-admin/
    └── index.ts          # Admin-only AI queries (PII access)
```

**Main Edge Function Structure:**
```typescript
// ai-catalyst/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RATE_LIMIT_USER = 10;  // per day
const RATE_LIMIT_ORG = 100;  // per day
const MODEL = "google/gemini-2.5-flash-lite";

serve(async (req) => {
  // 1. Check rate limits
  // 2. Check cache (30-day TTL)
  // 3. If miss, call Lovable AI Gateway
  // 4. Store in cache + log usage
  // 5. Return response
});
```

#### Security & Masking Plan

| Role | PII Access | Masking |
|------|-----------|---------|
| Regular Users | ❌ No | Full masking applied |
| Admins | ✅ Yes | Unmasked responses |
| System | ✅ Yes | Audit logged |

**Implementation:**
```typescript
// Before sending to AI
const sanitizedQuery = isAdmin ? rawQuery : maskPII(rawQuery);

function maskPII(text: string): string {
  return text
    .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[EMAIL]')
    .replace(/\b\d{10}\b/g, '[PHONE]')
    .replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[ID]');
}
```

---

### 3) GO/NO-GO CHECKLIST

#### ✅ Must-Have Before Production

| # | Item | Status | Owner | Due Date |
|---|------|--------|-------|----------|
| 1 | PII data classification completed | ⏳ Pending | Security Team | TBD |
| 2 | Monthly AI budget confirmed (SAR) | ⏳ Pending | Finance/PM | TBD |
| 3 | Edge Functions deployed | ⏳ Pending | Dev Team | TBD |
| 4 | `ai_cache` table migrated | ⏳ Pending | Dev Team | TBD |
| 5 | `ai_usage_logs` table migrated | ⏳ Pending | Dev Team | TBD |
| 6 | Rate limiting tested | ⏳ Pending | QA | TBD |
| 7 | Cache invalidation tested | ⏳ Pending | QA | TBD |
| 8 | Admin masking toggle tested | ⏳ Pending | QA | TBD |
| 9 | LOVABLE_API_KEY verified in secrets | ⏳ Pending | Dev Team | TBD |
| 10 | Cost monitoring dashboard setup | ⏳ Pending | Ops | TBD |

#### ⚠️ Blocking Issues

1. **PII Classification Unknown** → Cannot finalize masking rules
2. **Monthly Budget Not Set** → Cannot configure hard caps

---

## 📁 Recommended File Structure

```
src/
├── hooks/
│   └── useAICatalyst.ts          # Main AI hook with caching
├── lib/
│   └── ai/
│       ├── cache.ts              # Cache key generation
│       ├── masking.ts            # PII masking utilities
│       └── rateLimit.ts          # Rate limit checking
└── types/
    └── ai.ts                     # AI response types

supabase/
├── functions/
│   ├── ai-catalyst/index.ts      # Main AI endpoint
│   ├── ai-cache-invalidate/index.ts
│   └── ai-admin/index.ts
└── migrations/
    └── YYYYMMDD_ai_tables.sql    # Cache + usage tables
```

---

## 🎯 Next Steps

1. **Confirm PII classification** with Security Team
2. **Set monthly budget cap** with Finance
3. **Run migration** to create `ai_cache` and `ai_usage_logs` tables
4. **Deploy Edge Functions** using Lovable Cloud
5. **Test rate limiting** and cache invalidation
6. **Enable in production** after go/no-go checklist complete

---

*Document generated by Catalyst AI Architecture Intake Assistant*
