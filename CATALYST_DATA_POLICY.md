# 🚨 CATALYST ZERO-MOCK DATA POLICY

**Effective: 2026-02-26 | Status: ENFORCED | Authority: Product Owner**

---

## Rule #1: NO MOCK DATA — EVER

All data displayed in Catalyst **MUST** come from the database (Lovable Cloud).  
Hardcoded arrays, fake names, sample objects, seed data, and mock generators are **BANNED**.

### What is banned:
- ❌ Hardcoded arrays of objects (e.g., `const mockData = [...]`)
- ❌ `generateMockEvents()`, `MOCK_TESTS`, `sampleData`, `fakeUsers`
- ❌ Inline seed data in hooks, components, or utility files
- ❌ Random data generators (`Math.random()` for producing fake records)
- ❌ `setTimeout()` simulating API delays with fake responses
- ❌ Any file in `src/data/mock*.ts`

### What is allowed:
- ✅ Empty arrays `[]` as default/fallback when DB returns nothing
- ✅ Loading skeletons / empty states saying "No data yet"
- ✅ The **Admin > Mock Data Generator** tool (admin-controlled, approved workflow)
- ✅ Static enum/option lists (e.g., status options, priority levels) — these are config, not data
- ✅ Test files (`*.test.ts`, `*.spec.ts`) — testing is exempt

### Exception process:
1. Developer must explicitly ask the Product Owner for approval
2. Approval must be documented in this file under "Approved Exceptions"
3. Mock data must be clearly labeled with `// APPROVED MOCK: [reason] [date] [approver]`

---

## Rule #2: JIRA DATA IS SACRED

All Jira-synced data is append-only. See `ph_jira_sync_log` for audit trail.
- Physical DELETEs are blocked by database triggers
- Only delta updates on re-sync
- Soft-delete via `jira_removed_at` timestamp

---

## Approved Exceptions

| File | Reason | Date | Approver |
|------|--------|------|----------|
| `src/pages/admin/MockDataGenerator.tsx` | Admin-controlled data generation tool | 2026-02-26 | System |
| `src/hooks/useMockDataRuns.ts` | Supports the admin mock data generator | 2026-02-26 | System |

---

## Known Violations (To Be Purged)

| File | Violation | Status |
|------|-----------|--------|
| `src/data/mockTestRepositoryData.ts` | 500-line mock data file | 🔴 PURGED |
| `src/hooks/test-cycles/useCalendarData.ts` | `generateMockEvents()` | 🔴 PURGED |
| `src/hooks/templates/useTemplatePreview.ts` | `MOCK_TESTS` array | 🔴 PURGED |
| `src/pages/admin/ChangesLog.tsx` | Hardcoded changes array | 🔴 PURGED |
| `src/components/skills-inventory/TeamMemberSkillsProfile.tsx` | Hardcoded member/skills | ⚠️ FLAGGED |
| `src/features/release-dashboard/utils/mockData.ts` | 233-line mock release data | ⚠️ FLAGGED |
