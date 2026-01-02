# In-Jira Module — Definition of Done (DOD)

**Module**: Project Execution ("In-Jira")  
**Version**: 1.0  
**Last Updated**: January 2026  
**Parent System**: Catalyst Enterprise Platform  

---

## Purpose

This document defines the **Definition of Done (DOD)** criteria for the In-Jira module. Every feature, user story, and deliverable MUST meet ALL criteria before being marked as complete.

---

## Non-Negotiable Constraints

| Constraint | Description | Verification |
|------------|-------------|--------------|
| **Catalyst Shell Reuse** | Use global sidebar, top nav, breadcrumbs, theming, auth, tenancy | Visual inspection + code review |
| **No Parallel UI** | Do NOT create separate navigation or theming systems | Code review |
| **Catalyst Routing** | Use existing router configuration in `/src/routes/` | Code review |
| **Permission Model** | Use Catalyst's existing RBAC from `/src/contexts/` | Integration test |
| **Audit Framework** | All mutations logged via existing audit infrastructure | Audit log verification |
| **DB Conventions** | Follow Supabase schema patterns from `/src/integrations/supabase/` | Schema review |

---

## Canonical Hierarchy (Strictly Enforced)

```
PRODUCT
└── Business Request (Catalyst-native, NOT imported from Jira)

PROGRAM
└── Epic (Catalyst-native; Jira Epic → Program Epic reference)

PROJECT
├── Feature
│   └── Story
│       └── Sub-task
├── Defect (first-class, independent)
└── Incident (first-class, independent)
```

### Hierarchy Rules

| Rule | Verification Method |
|------|---------------------|
| Jira Epics NEVER exist inside Project | Database constraint + import validation |
| Jira Epic Link maps to Program Epic reference | Import mapping tests |
| Defects & Incidents are first-class, not children | Schema verification |
| Business Requests are NEVER imported from Jira | Import filter + UI gate |

---

## DOD Criteria by Category

### 1. Code Quality

| Criterion | Requirement | Verification |
|-----------|-------------|--------------|
| **TypeScript** | Strict mode, no `any` types | `tsc --noEmit` passes |
| **ESLint** | Zero errors, max 5 warnings | `npm run lint` |
| **Component Size** | Max 300 lines per component | Automated check |
| **Hooks Extraction** | Complex logic in custom hooks | Code review |
| **Design Tokens** | All colors/spacing from `index.css` | No hardcoded values |
| **Semantic HTML** | Proper ARIA attributes | Accessibility audit |

### 2. Functional Completeness

| Criterion | Requirement | Verification |
|-----------|-------------|--------------|
| **User Story Complete** | All acceptance criteria met | Manual QA pass |
| **Edge Cases Handled** | Empty states, errors, loading | Visual QA |
| **Keyboard Navigation** | All interactive elements focusable | Tab-through test |
| **Mobile Responsive** | Works on 375px+ screens | Device testing |
| **Dark Mode** | Correct theming in both modes | Visual inspection |

### 3. Data Integrity

| Criterion | Requirement | Verification |
|-----------|-------------|--------------|
| **RLS Policies** | All tables have Row Level Security | `supabase--linter` |
| **Foreign Keys** | Proper relationships enforced | Schema review |
| **Soft Delete** | No hard deletes without audit | Code review |
| **Optimistic Updates** | UI reflects changes immediately | UX test |
| **Conflict Resolution** | Concurrent edits handled gracefully | Stress test |

### 4. Jira Import (One-Time, Deterministic)

| Criterion | Requirement | Verification |
|-----------|-------------|--------------|
| **Idempotent** | Re-running import produces same result | Integration test |
| **No Bidirectional Sync** | Changes do NOT flow back to Jira | Code review |
| **Mapping Accuracy** | All field mappings documented and tested | Mapping matrix |
| **Error Handling** | Failed imports show clear error messages | QA test |
| **Audit Trail** | All imports logged with source reference | Audit log check |

### 5. Performance

| Operation | Target (P95) | Verification |
|-----------|--------------|--------------|
| Page load (list views) | < 200ms | Lighthouse |
| Create/Update entity | < 500ms | API timing |
| Bulk operations (100 items) | < 5s | Load test |
| Jira import (1000 items) | < 30s | Integration test |

### 6. UX DNA Compliance

| Principle | Source | Verification |
|-----------|--------|--------------|
| **Speed** | Linear | No unnecessary modals, instant feedback |
| **Typography Rhythm** | Figma | Consistent heading hierarchy |
| **Dense but Calm** | Notion | Progressive disclosure, no visual clutter |
| **Data Density** | Bloomberg | Maximum information, zero ambiguity |
| **Enterprise Trust** | Salesforce | Predictable patterns, familiar UX |

---

## Scrum + Kanban Parity

### Scrum Board DOD

| Feature | Jira Cloud Parity | Verification |
|---------|-------------------|--------------|
| Sprint planning | Backlog → Sprint drag-drop | Manual test |
| Sprint backlog view | Grouped by sprint with story points | Visual check |
| Velocity tracking | Sprint-over-sprint comparison | Report verification |
| Burndown chart | Real-time progress visualization | Chart accuracy |
| Sprint retrospective | Completed work summary | Data accuracy |

### Kanban Board DOD

| Feature | Jira Cloud Parity | Verification |
|---------|-------------------|--------------|
| Swimlanes | By assignee, priority, epic | Configuration test |
| WIP limits | Configurable per column | Enforcement test |
| Cycle time | Card age visualization | Calculation accuracy |
| Cumulative flow | Historical lane distribution | Report verification |
| Quick filters | JQL-style filtering | Filter accuracy |

---

## Audit & Compliance

### Every Mutation Must Log

| Event Type | Required Fields | Retention |
|------------|-----------------|-----------|
| CREATE | entity_id, entity_type, actor_id, timestamp, payload | 90 days |
| UPDATE | entity_id, before_state, after_state, actor_id | 90 days |
| DELETE | entity_id, entity_type, actor_id, reason | 90 days |
| IMPORT | source_system, item_count, mapping_version | Permanent |

### Silent AI Mutation Prevention

- NO AI-driven changes without explicit user confirmation
- All AI suggestions presented as drafts
- AI actions logged separately with confidence scores

---

## Definition of Done Checklist

Before marking any work item as DONE, verify:

```markdown
## Code
- [ ] TypeScript strict mode passes
- [ ] ESLint passes with max 5 warnings
- [ ] No hardcoded colors/spacing (use design tokens)
- [ ] Component under 300 lines
- [ ] Complex logic extracted to hooks

## Functionality
- [ ] All acceptance criteria met
- [ ] Empty states implemented
- [ ] Error states implemented
- [ ] Loading states implemented
- [ ] Keyboard navigation works
- [ ] Mobile responsive (375px+)
- [ ] Dark mode correct

## Data
- [ ] RLS policies in place
- [ ] Audit logging implemented
- [ ] Optimistic UI updates
- [ ] No dead CTAs (every button does something)

## Jira Import (if applicable)
- [ ] Import is idempotent
- [ ] No data flows back to Jira
- [ ] Errors clearly communicated
- [ ] All imports logged

## UX
- [ ] Follows Linear speed principle
- [ ] Figma typography rhythm
- [ ] Notion density with calm
- [ ] Bloomberg data density
- [ ] Salesforce enterprise trust

## Testing
- [ ] Unit tests for business logic
- [ ] Integration tests for API
- [ ] E2E tests for critical paths
- [ ] Accessibility audit passed
```

---

## Sign-Off Requirements

| Role | Responsibility |
|------|----------------|
| **Developer** | Self-certify code quality, tests passing |
| **QA** | Functional verification, edge cases |
| **UX** | Visual review, UX DNA compliance |
| **Security** | RLS review, audit logging verification |
| **Product** | Acceptance criteria sign-off |

---

## Version History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | Jan 2026 | Catalyst Team | Initial DOD for In-Jira module |
