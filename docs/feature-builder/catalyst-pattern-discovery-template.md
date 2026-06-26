# Catalyst Pattern Discovery: <feature-slug>

> Copy to: docs/feature-builder/features/<feature-slug>/catalyst-pattern-discovery.md
> Run before any design or implementation.
> This is a research experiment — produces no code changes.

---

## Objective

Determine: what does Catalyst already have for this feature?

Answer before proceeding:
1. Does Catalyst already have this feature (fully or partially)?
2. Does Catalyst have a component this can be built on?
3. What canonical components MUST be reused?
4. What Atlaskit primitives apply?
5. What hooks or utils exist?

---

## Discovery Commands

```bash
# Search for feature concepts in components
grep -r "<concept>" src/components src/lib src/hooks --include="*.tsx" --include="*.ts" -l

# Search for specific UI patterns
grep -r "JiraTable\|CatalystViewBase\|CatalystSidebarDetails" src/pages/<area>/ -l

# List existing pages in a module
ls -la src/pages/<area>/

# Check routes registered
grep -n "<feature-path>" src/routes/FullAppRoutes.tsx

# Check sidebar navigation entries
grep -n "<feature-path>" src/components/layout/SidebarBase.tsx

# Search for existing hooks
ls src/hooks/ | grep -i "<concept>"
```

---

## Components Found

| Component | File | Size | Purpose | Reusable for this feature? |
|---|---|---|---|---|
| _fill after grep_ | | | | |

**Canonical components that MUST be reused** (per CLAUDE.md):
- [ ] JiraTable (for any work item / entity list)
- [ ] CatalystViewBase (for any detail drawer/page)
- [ ] CatalystSidebarDetails (for any right-rail fields)
- [ ] CatalystStatusPill (for any status display)
- [ ] JiraIssueTypeIcon or equivalent entity icon
- [ ] @atlaskit/dropdown-menu or portal pattern (for any menu)
- [ ] @atlaskit/flag (for toasts)
- [ ] @atlaskit/spinner (for loading)
- [ ] @atlaskit/modal-dialog (for modals)

---

## Hooks Found

| Hook | File | Purpose | Reusable? |
|---|---|---|---|
| _fill_ | | | |

---

## Existing Pages / Routes

| Route | Component file | State | Notes |
|---|---|---|---|
| _fill_ | | not-started/partial/exists | |

---

## Atlaskit Primitives That Apply

| Need | Atlaskit Component | Notes |
|---|---|---|
| _fill_ | | |

---

## DB Tables Suspected

| Table | Verified exists? | Notes |
|---|---|---|
| _fill_ | | Run: supabase db query --linked "SELECT table_name FROM information_schema.tables WHERE table_name LIKE '%<concept>%'" |

---

## Conclusion

**Does Catalyst already have this feature?**
- Full: _yes / no_
- Partial: _yes / no — what parts exist_

**Rebuild or extend decision:**
_mount existing canonical component with adapter | extend existing component | build new (requires human approval)_

**Canonical components this feature MUST reuse:**
1. _fill_

**New components that would need to be built (needs human approval):**
1. _fill_

---

## Next Step

- [ ] Proceed to current-state-audit.md
- [ ] Blocked: _reason_
