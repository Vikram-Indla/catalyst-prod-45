# Add Dependency on Work Item Detail — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an "Add Dependency" action to the detail-page "+" menu that creates blocks / is-blocked-by dependencies against same-project work items, renders them in a JiraTable section, and reflects on the project timeline.

**Architecture:** Reuse the canonical `ph_issue_dependencies` store + `useTimelineDependencies` hook (which already reads/writes that table and invalidates the timeline query key). Mirror the existing quickActionsBus + LinkedWorkItemsSection pattern. New code = one pure model file, one section component, one dialog, plus 6 small wiring edits. No timeline code is touched — writing to the shared table + query key makes the timeline update for free.

**Tech Stack:** React 18 + TypeScript, @tanstack/react-query, Supabase, @atlaskit/* (ADS), canonical `JiraTable`, vitest.

**Feature Work ID:** CAT-DEPS-ADDDEP-20260704-001
**Spec:** `docs/superpowers/specs/2026-07-04-add-dependency-detail-design.md`

## Global Constraints

- Slice 1 only: `ph_issues`-backed types (Epic / Feature / Story / Task). No Business Request / Gap / MTD (they use `br_dependencies`).
- Persist to `ph_issue_dependencies` ONLY. Never touch `Timeline/` code or the migration.
- ADS tokens only — no hex/rgb/hsl/Tailwind color utilities. Gates: `npm run lint:colors:gate`, `npm run audit:ads:gate` must pass before every commit.
- No hand-rolled table/menu/dialog — use JiraTable + @atlaskit primitives + the existing quickActionsBus.
- Zero-assumption rendering — unknown fields render blank (dash / null), never a fabricated default.
- Stage explicit files only. Never `git add -A` / `git add .`.
- Branch is `dependencies-migration`; unrelated modified files exist in the tree — do NOT stage them.
- `dependency_type` domain: `'blocks' | 'is_blocked_by'`. UI direction relative to current issue reuses `UiDirection` from `normalize.ts`.

## File Structure

- Create `src/modules/project-work-hub/components/dependencies/depSectionModel.ts` — pure helpers (row flatten, candidate filter, related-keys, labels). TDD.
- Create `src/modules/project-work-hub/components/dependencies/__tests__/depSectionModel.test.ts` — vitest.
- Create `src/modules/project-work-hub/components/dependencies/AddDependencyDialog.tsx` — type + same-project picker dialog.
- Create `src/modules/project-work-hub/components/dependencies/DependenciesSection.tsx` — collapsible section, JiraTable, hosts dialog, listens to bus.
- Create `src/modules/project-work-hub/components/dependencies/index.ts` — barrel export.
- Modify `src/components/catalyst-detail-views/shared/sections/quickActionsBus.ts` — add emit/listen pair.
- Modify `src/components/catalyst-detail-views/shared/sections/CatalystQuickActions.tsx` — add menu item + gating.
- Modify `CatalystView{Epic,Feature,Story,Task}.tsx` — mount the section.

---

### Task 1: Pure model helpers (TDD)

**Files:**
- Create: `src/modules/project-work-hub/components/dependencies/depSectionModel.ts`
- Test: `src/modules/project-work-hub/components/dependencies/__tests__/depSectionModel.test.ts`

**Interfaces:**
- Consumes: `DependencyEntry` from `@/components/shared/Timeline/dependencies/normalize` (shape: `{ blockedBy: {key,edgeId,createdAt}[]; blocks: {key,edgeId,createdAt}[] }`).
- Produces:
  - `type DepRelationship = 'blocks' | 'is_blocked_by'`
  - `interface DependencyRow { key: string; relationship: DepRelationship; edgeId: number | string; createdAt: string | null }`
  - `function toDependencyRows(entry: DependencyEntry): DependencyRow[]`
  - `function relatedKeysFor(entry: DependencyEntry): Set<string>`
  - `interface CandidateIssue { issue_key: string; issue_type: string | null; parent_key: string | null }`
  - `interface CandidateFilterArgs { issueKey: string; relatedKeys: Set<string>; subtaskTypesLower: Set<string> }`
  - `function filterCandidateIssues(candidates: CandidateIssue[], args: CandidateFilterArgs): CandidateIssue[]`
  - `const RELATIONSHIP_LABEL: Record<DepRelationship, string>`

- [ ] **Step 1: Write the failing test**

```ts
// src/modules/project-work-hub/components/dependencies/__tests__/depSectionModel.test.ts
import { describe, it, expect } from 'vitest';
import {
  toDependencyRows,
  relatedKeysFor,
  filterCandidateIssues,
  RELATIONSHIP_LABEL,
  type CandidateIssue,
} from '../depSectionModel';
import type { DependencyEntry } from '@/components/shared/Timeline/dependencies/normalize';

const entry: DependencyEntry = {
  blockedBy: [{ key: 'PROJ-2', edgeId: 10, createdAt: '2026-01-01' }],
  blocks: [{ key: 'PROJ-3', edgeId: 11, createdAt: '2026-01-02' }],
};

describe('toDependencyRows', () => {
  it('flattens blockedBy → is_blocked_by and blocks → blocks', () => {
    const rows = toDependencyRows(entry);
    expect(rows).toEqual([
      { key: 'PROJ-2', relationship: 'is_blocked_by', edgeId: 10, createdAt: '2026-01-01' },
      { key: 'PROJ-3', relationship: 'blocks', edgeId: 11, createdAt: '2026-01-02' },
    ]);
  });
  it('returns [] for an empty entry', () => {
    expect(toDependencyRows({ blockedBy: [], blocks: [] })).toEqual([]);
  });
});

describe('relatedKeysFor', () => {
  it('collects both directions', () => {
    expect(relatedKeysFor(entry)).toEqual(new Set(['PROJ-2', 'PROJ-3']));
  });
});

describe('RELATIONSHIP_LABEL', () => {
  it('maps to Jira-parity labels', () => {
    expect(RELATIONSHIP_LABEL.blocks).toBe('blocks');
    expect(RELATIONSHIP_LABEL.is_blocked_by).toBe('is blocked by');
  });
});

describe('filterCandidateIssues', () => {
  const candidates: CandidateIssue[] = [
    { issue_key: 'PROJ-1', issue_type: 'Story', parent_key: null },   // self
    { issue_key: 'PROJ-2', issue_type: 'Story', parent_key: null },   // already related
    { issue_key: 'PROJ-4', issue_type: 'Sub-task', parent_key: null },// subtask
    { issue_key: 'PROJ-5', issue_type: 'Story', parent_key: 'PROJ-1' },// direct child
    { issue_key: 'PROJ-6', issue_type: 'Epic', parent_key: null },    // OK
  ];
  it('excludes self, related, subtasks, and direct children', () => {
    const out = filterCandidateIssues(candidates, {
      issueKey: 'PROJ-1',
      relatedKeys: new Set(['PROJ-2']),
      subtaskTypesLower: new Set(['sub-task', 'subtask']),
    });
    expect(out.map((c) => c.issue_key)).toEqual(['PROJ-6']);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/modules/project-work-hub/components/dependencies/__tests__/depSectionModel.test.ts`
Expected: FAIL — cannot resolve `../depSectionModel`.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/modules/project-work-hub/components/dependencies/depSectionModel.ts
import type { DependencyEntry } from '@/components/shared/Timeline/dependencies/normalize';

export type DepRelationship = 'blocks' | 'is_blocked_by';

export interface DependencyRow {
  key: string;
  relationship: DepRelationship;
  edgeId: number | string;
  createdAt: string | null;
}

/** Flatten a per-issue entry: blockedBy → is_blocked_by, blocks → blocks. */
export function toDependencyRows(entry: DependencyEntry): DependencyRow[] {
  const rows: DependencyRow[] = [];
  for (const r of entry.blockedBy) {
    rows.push({ key: r.key, relationship: 'is_blocked_by', edgeId: r.edgeId, createdAt: r.createdAt });
  }
  for (const r of entry.blocks) {
    rows.push({ key: r.key, relationship: 'blocks', edgeId: r.edgeId, createdAt: r.createdAt });
  }
  return rows;
}

/** All keys already related to the current issue (both directions). */
export function relatedKeysFor(entry: DependencyEntry): Set<string> {
  const s = new Set<string>();
  for (const r of entry.blockedBy) s.add(r.key);
  for (const r of entry.blocks) s.add(r.key);
  return s;
}

export const RELATIONSHIP_LABEL: Record<DepRelationship, string> = {
  blocks: 'blocks',
  is_blocked_by: 'is blocked by',
};

export interface CandidateIssue {
  issue_key: string;
  issue_type: string | null;
  parent_key: string | null;
}

export interface CandidateFilterArgs {
  issueKey: string;
  /** keys already in a live dependency with issueKey (both directions) */
  relatedKeys: Set<string>;
  /** lowercased subtask-family type names to exclude */
  subtaskTypesLower: Set<string>;
}

/** Same-project candidate filter: excludes self, subtasks, direct children, already-related. */
export function filterCandidateIssues(
  candidates: CandidateIssue[],
  { issueKey, relatedKeys, subtaskTypesLower }: CandidateFilterArgs,
): CandidateIssue[] {
  return candidates.filter((c) => {
    if (!c.issue_key || c.issue_key === issueKey) return false;
    if (c.parent_key === issueKey) return false;
    if (relatedKeys.has(c.issue_key)) return false;
    const t = (c.issue_type ?? '').toLowerCase();
    if (subtaskTypesLower.has(t)) return false;
    return true;
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/modules/project-work-hub/components/dependencies/__tests__/depSectionModel.test.ts`
Expected: PASS — all cases green.

- [ ] **Step 5: Commit**

```bash
git add src/modules/project-work-hub/components/dependencies/depSectionModel.ts \
        src/modules/project-work-hub/components/dependencies/__tests__/depSectionModel.test.ts
git commit -m "feat(deps): pure model helpers for dependency section (CAT-DEPS-ADDDEP-20260704-001)"
```

---

### Task 2: quickActionsBus — add dependency channel

**Files:**
- Modify: `src/components/catalyst-detail-views/shared/sections/quickActionsBus.ts`

**Interfaces:**
- Produces: `emitAddDependency(): void`, `useAddDependencyListener(handler: () => void): void`.

- [ ] **Step 1: Add the channel (mirror the link channel)**

Add after the `emitLinkWorkItem` / `useLinkWorkItemListener` block (after line 72). First add the Set near the other Sets (after line 22):

```ts
const addDependencySubs = new Set<Handler>();
```

Then add the emit/listen pair:

```ts
// Mirror channel for "Add Dependency" — listened to by DependenciesSection.
// Opens the add-dependency dialog. Writes go to ph_issue_dependencies, the
// same table the project timeline reads, so the timeline reflects new edges.
export function emitAddDependency(): void {
  addDependencySubs.forEach((h) => h());
}

export function useAddDependencyListener(handler: Handler): void {
  useEffect(() => {
    addDependencySubs.add(handler);
    return () => {
      addDependencySubs.delete(handler);
    };
  }, [handler]);
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit -p tsconfig.json 2>&1 | grep quickActionsBus || echo "clean"`
Expected: `clean`.

- [ ] **Step 3: Commit**

```bash
git add src/components/catalyst-detail-views/shared/sections/quickActionsBus.ts
git commit -m "feat(deps): add emitAddDependency bus channel (CAT-DEPS-ADDDEP-20260704-001)"
```

---

### Task 3: CatalystQuickActions — "Add Dependency" menu item

**Files:**
- Modify: `src/components/catalyst-detail-views/shared/sections/CatalystQuickActions.tsx`

**Interfaces:**
- Consumes: `emitAddDependency` from `./quickActionsBus`.
- Produces: new optional prop `onAddDependency?: () => void`; new primary menu item `id: 'dependency'` shown only for Epic/Feature/Story/Task.

- [ ] **Step 1: Import the emitter**

Modify the import on line 27 to add `emitAddDependency`:

```ts
import { emitCreateChild, emitCreateChildWorkItem, emitLinkWorkItem, emitAddDependency, emitAddAttachment, emitAddWebLink, emitAddDesign } from './quickActionsBus';
```

- [ ] **Step 2: Add an icon import**

Add near the other icon imports (after line 25):

```ts
import BranchIcon from '@atlaskit/icon/core/branch';
```

(If `@atlaskit/icon/core/branch` is absent, use `import LinkIcon from '@atlaskit/icon/core/link';` — verify with `ls node_modules/@atlaskit/icon/core/branch* 2>/dev/null`.)

- [ ] **Step 3: Add the prop**

In `CatalystQuickActionsProps` (after line 37, `onLinkItem?`):

```ts
  onAddDependency?: () => void;
```

And destructure it in the component signature (after `onLinkItem,` on line 66):

```ts
  onAddDependency,
```

- [ ] **Step 4: Derive the gating flag**

After the `canHaveChildWorkItems` block (after line 87), add:

```ts
  // Dependencies are ph_issues-backed only (Epic/Feature/Story/Task). Hidden
  // on subtasks and on non-ph_issues types (e.g. Business Request) which use
  // a separate store. When itemType is omitted (legacy call sites), hide it.
  const DEP_TYPES = new Set(['epic', 'feature', 'story', 'task']);
  const canHaveDependencies = itemType ? DEP_TYPES.has(itemType.toLowerCase()) : false;
```

- [ ] **Step 5: Add the menu item after "Link work item"**

Insert this object into the `menuItems` array immediately AFTER the `link` item's closing `} },` (after line 172) and BEFORE the `attachment` item:

```ts
    canHaveDependencies
      ? { id: 'dependency', icon: <BranchIcon label="" color={textColor} />, label: 'Add Dependency', section: 'primary', action: () => {
          setShowMenu(false); setSearch('');
          // Caller override wins; else notify the mounted DependenciesSection.
          if (onAddDependency) onAddDependency();
          else emitAddDependency();
        } }
      : null,
```

(The existing `.filter((i): i is NonNullable<typeof i> => i != null)` on line 201 already drops the `null` when gated off — no other change needed.)

- [ ] **Step 6: Typecheck**

Run: `npx tsc --noEmit -p tsconfig.json 2>&1 | grep CatalystQuickActions || echo "clean"`
Expected: `clean`.

- [ ] **Step 7: Color/audit gate**

Run: `npm run lint:colors:gate && npm run audit:ads:gate`
Expected: both pass (item reuses `textColor = var(--ds-text)`; no new colors).

- [ ] **Step 8: Commit**

```bash
git add src/components/catalyst-detail-views/shared/sections/CatalystQuickActions.tsx
git commit -m "feat(deps): Add Dependency menu item after Link work item (CAT-DEPS-ADDDEP-20260704-001)"
```

---

### Task 4: AddDependencyDialog

**Files:**
- Create: `src/modules/project-work-hub/components/dependencies/AddDependencyDialog.tsx`

**Interfaces:**
- Consumes: `filterCandidateIssues`, `relatedKeysFor`, `CandidateIssue` from `./depSectionModel`; `getEntry` from `@/components/shared/Timeline/dependencies/normalize`; `DependencyIndex` type; `UiDirection` from normalize; `supabase`; ADS `@atlaskit/modal-dialog`, `@atlaskit/select`, `@atlaskit/button`.
- Produces: `interface AddDependencyDialogProps { isOpen: boolean; issueKey: string; projectKey: string; index: DependencyIndex; subtaskTypesLower: Set<string>; onClose: () => void; onSubmit: (direction: UiDirection, otherKey: string) => Promise<{ ok: boolean; error?: string }>; }` and `export function AddDependencyDialog(props): JSX.Element | null`.

**Notes for implementer:**
- The candidate query selects same-project issues then applies `filterCandidateIssues`. Do NOT filter subtasks in SQL by name guessing — pass `subtaskTypesLower` (derived by the section from `SUBTASK_FAMILY_CANONICAL_TYPES`) into the pure filter.
- All colors via ADS tokens only. `@atlaskit/select` and `@atlaskit/modal-dialog` own their colors — pass no color props.

- [ ] **Step 1: Implement the dialog**

```tsx
// src/modules/project-work-hub/components/dependencies/AddDependencyDialog.tsx
import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Modal, { ModalBody, ModalFooter, ModalHeader, ModalTitle, ModalTransition } from '@atlaskit/modal-dialog';
import Button from '@atlaskit/button/new';
import Select from '@atlaskit/select';
import { supabase } from '@/integrations/supabase/client';
import { getEntry, type DependencyIndex, type UiDirection } from '@/components/shared/Timeline/dependencies/normalize';
import { filterCandidateIssues, relatedKeysFor, type CandidateIssue } from './depSectionModel';

export interface AddDependencyDialogProps {
  isOpen: boolean;
  issueKey: string;
  projectKey: string;
  index: DependencyIndex;
  /** lowercased subtask-family type names to exclude from candidates */
  subtaskTypesLower: Set<string>;
  onClose: () => void;
  onSubmit: (direction: UiDirection, otherKey: string) => Promise<{ ok: boolean; error?: string }>;
}

const DIRECTION_OPTIONS: Array<{ label: string; value: UiDirection }> = [
  { label: 'blocks', value: 'blocks' },
  { label: 'is blocked by', value: 'is_blocked_by' },
];

export function AddDependencyDialog({
  isOpen, issueKey, projectKey, index, subtaskTypesLower, onClose, onSubmit,
}: AddDependencyDialogProps) {
  const [direction, setDirection] = useState<UiDirection>('blocks');
  const [target, setTarget] = useState<{ label: string; value: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const relatedKeys = useMemo(() => relatedKeysFor(getEntry(index, issueKey)), [index, issueKey]);

  const { data: options = [], isLoading } = useQuery({
    queryKey: ['dependency-candidates', projectKey, issueKey, Array.from(relatedKeys).sort().join(',')],
    queryFn: async () => {
      if (!projectKey) return [];
      const { data, error: qErr } = await (supabase as any)
        .from('ph_issues')
        .select('issue_key, issue_type, parent_key, summary')
        .eq('project_key', projectKey)
        .is('deleted_at', null)
        .limit(500);
      if (qErr) throw new Error(qErr.message ?? 'Failed to load work items');
      const rows = (data ?? []) as (CandidateIssue & { summary?: string })[];
      const filtered = filterCandidateIssues(rows, { issueKey, relatedKeys, subtaskTypesLower });
      return filtered.map((r) => ({ value: r.issue_key, label: `${r.issue_key} — ${r.summary ?? ''}`.trim() }));
    },
    enabled: isOpen && !!projectKey,
  });

  const canSubmit = !!target && !submitting;

  const handleSubmit = async () => {
    if (!target) return;
    setSubmitting(true);
    setError(null);
    const res = await onSubmit(direction, target.value);
    setSubmitting(false);
    if (!res.ok) { setError(res.error ?? 'Failed to add dependency'); return; }
    setTarget(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <ModalTransition>
      <Modal onClose={onClose}>
        <ModalHeader hasCloseButton>
          <ModalTitle>Add dependency</ModalTitle>
        </ModalHeader>
        <ModalBody>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label style={{ display: 'block', marginBottom: 4, fontSize: 'var(--ds-font-size-100)', color: 'var(--ds-text-subtle)' }}>
                {issueKey}
              </label>
              <Select
                inputId="dep-direction"
                options={DIRECTION_OPTIONS}
                value={DIRECTION_OPTIONS.find((o) => o.value === direction)}
                onChange={(o) => o && setDirection((o as { value: UiDirection }).value)}
                isDisabled={submitting}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 4, fontSize: 'var(--ds-font-size-100)', color: 'var(--ds-text-subtle)' }}>
                Work item
              </label>
              <Select
                inputId="dep-target"
                options={options}
                value={target}
                onChange={(o) => setTarget(o as { label: string; value: string } | null)}
                isLoading={isLoading}
                isClearable
                placeholder="Select a work item…"
                isDisabled={submitting}
              />
            </div>
            {error && (
              <div role="alert" style={{ fontSize: 'var(--ds-font-size-100)', color: 'var(--ds-text-danger)' }}>
                {error}
              </div>
            )}
          </div>
        </ModalBody>
        <ModalFooter>
          <Button appearance="subtle" onClick={onClose} isDisabled={submitting}>Cancel</Button>
          <Button appearance="primary" onClick={handleSubmit} isDisabled={!canSubmit}>Add</Button>
        </ModalFooter>
      </Modal>
    </ModalTransition>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit -p tsconfig.json 2>&1 | grep AddDependencyDialog || echo "clean"`
Expected: `clean`. If `@atlaskit/button/new` or `@atlaskit/select` import paths differ, match the paths used elsewhere in the repo (`grep -rn "@atlaskit/select" src | head`).

- [ ] **Step 3: Color/audit gate**

Run: `npm run lint:colors:gate && npm run audit:ads:gate`
Expected: pass (only ADS tokens used).

- [ ] **Step 4: Commit**

```bash
git add src/modules/project-work-hub/components/dependencies/AddDependencyDialog.tsx
git commit -m "feat(deps): AddDependencyDialog with same-project candidate picker (CAT-DEPS-ADDDEP-20260704-001)"
```

---

### Task 5: DependenciesSection + barrel

**Files:**
- Create: `src/modules/project-work-hub/components/dependencies/DependenciesSection.tsx`
- Create: `src/modules/project-work-hub/components/dependencies/index.ts`

**Interfaces:**
- Consumes: `useTimelineDependencies` + `AddDependencyArgs` from `@/components/shared/Timeline/dependencies/useTimelineDependencies`; `getEntry` from normalize; `toDependencyRows`, `RELATIONSHIP_LABEL`, `DependencyRow` from `./depSectionModel`; `AddDependencyDialog`; `useAddDependencyListener` from the bus; `JiraTable` + `Column` from `@/components/shared/JiraTable`; `SUBTASK_FAMILY_CANONICAL_TYPES` from `@/components/catalyst-detail-views/shared/parent-rules`; `supabase`.
- Produces: `interface DependenciesSectionProps { issueKey: string; projectKey: string }` and `export function DependenciesSection(props): JSX.Element | null`.

**Notes for implementer:**
- Read via `useTimelineDependencies([projectKey])`. Get `entry = getEntry(deps.index, issueKey)`, `rows = toDependencyRows(entry)`.
- Enrich display metadata (type/summary/status/status_category/assignee/priority) with a section-local query mirroring SubtasksPanel's select, keyed by the row keys — so the table matches the child work item table. Render blank for any unknown field (zero-assumption).
- **Cells MUST be canonical read-only factories** (CLAUDE.md: no hand-rolled badges/pills/icons; user decision: true parity with child table). Use the read-only variants exported from `@/components/shared/JiraTable`: `makeKeyCell`, `makeSummaryCell`, `makeStatusCell`, `makeAssigneeCell`, `makePriorityCell`, plus `JiraIssueTypeIcon` from `@/lib/jira-issue-type-icons`. **Reference template:** `src/modules/tasks/columns/tasksListColumns.ts` (buildTasksListColumns) — copy its Work-cell composition (key+icon+summary in one flex cell) but swap the *edit* cells for the *read-only* ones above (these are references, not editable). The Relationship column is a small custom cell (plain text via `RELATIONSHIP_LABEL`, styled `var(--ds-text-subtle)`).
- Add via `deps.addDependency({ rowKey: issueKey, direction, otherKey, projectKey })`; remove via `deps.removeDependency(edgeId)`. Both already invalidate the `['timeline-dependencies', projectKey]` query key → this section AND the timeline refresh.
- Header + collapse behavior mirror `LinkedWorkItemsSection` (title + count badge + "Add dependency" button). Keep it visible even when empty so the "+" menu action has a place to land.

**Canonical cell factory signatures (verified):**
- `makeKeyCell(getKey: (r)=>string|null, onOpen?: (r)=>void, getHref?: (r)=>string, getIcon?: (r)=>ReactNode)` → renders type-icon + key `<a>`.
- `makeSummaryCell(getSummary: (r)=>string)` → subtle truncated summary span.
- `makeStatusCell(getStatus: (r)=>string|null, appearanceFor: (s)=>LozengeAppearance, labelFor?: (s)=>string, getStatusCategory?: (r)=>string|null)` → read-only `StatusLozengeDropdown interactive={false}`; renders "—" when status null. `appearanceFor` is unused by the render body — pass `() => 'default'`; the lozenge colors itself from `getStatusCategory`.
- `makeAssigneeCell(getAssignee: (r)=>{name:string|null; avatarUrl?:string|null}|null)` → avatar+name, "Unassigned" fallback. Pass `{ name: assignee_display_name, avatarUrl: null }` (Avatar derives initials from name).
- `makePriorityCell(getPriority: (r)=>string|null)` → 4-bar priority glyph.

- [ ] **Step 1: Implement the section**

```tsx
// src/modules/project-work-hub/components/dependencies/DependenciesSection.tsx
import React, { useCallback, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import ChevronRightIcon from '@atlaskit/icon/core/chevron-right';
import ChevronDownIcon from '@atlaskit/icon/core/chevron-down';
import TrashIcon from '@atlaskit/icon/core/delete';
import { supabase } from '@/integrations/supabase/client';
import {
  JiraTable, type Column,
  makeKeyCell, makeSummaryCell, makeStatusCell, makeAssigneeCell, makePriorityCell,
} from '@/components/shared/JiraTable';
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';
import { getEntry } from '@/components/shared/Timeline/dependencies/normalize';
import { useTimelineDependencies } from '@/components/shared/Timeline/dependencies/useTimelineDependencies';
import { SUBTASK_FAMILY_CANONICAL_TYPES } from '@/components/catalyst-detail-views/shared/parent-rules';
import { useAddDependencyListener } from '@/components/catalyst-detail-views/shared/sections/quickActionsBus';
import { AddDependencyDialog } from './AddDependencyDialog';
import { toDependencyRows, RELATIONSHIP_LABEL, type DependencyRow } from './depSectionModel';

export interface DependenciesSectionProps {
  issueKey: string;
  projectKey: string;
}

interface DepMeta {
  issue_type: string | null;
  summary: string | null;
  status: string | null;
  status_category: string | null;
  assignee_display_name: string | null;
  priority: string | null;
}

type Row = DependencyRow & { meta: DepMeta | null };

export function DependenciesSection({ issueKey, projectKey }: DependenciesSectionProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  const deps = useTimelineDependencies(projectKey ? [projectKey] : []);
  useAddDependencyListener(useCallback(() => setDialogOpen(true), []));

  const baseRows = useMemo(
    () => (issueKey ? toDependencyRows(getEntry(deps.index, issueKey)) : []),
    [deps.index, issueKey],
  );

  const otherKeys = useMemo(() => Array.from(new Set(baseRows.map((r) => r.key))).sort(), [baseRows]);

  const { data: metaMap = new Map<string, DepMeta>() } = useQuery({
    queryKey: ['dependency-row-meta', otherKeys.join(',')],
    queryFn: async () => {
      const m = new Map<string, DepMeta>();
      if (otherKeys.length === 0) return m;
      const { data, error } = await (supabase as any)
        .from('ph_issues')
        .select('issue_key, issue_type, summary, status, status_category, assignee_display_name, priority')
        .in('issue_key', otherKeys);
      if (error) { console.error('[DependenciesSection] meta load failed', error); return m; }
      for (const r of (data ?? [])) {
        m.set(r.issue_key, {
          issue_type: r.issue_type ?? null,
          summary: r.summary ?? null,
          status: r.status ?? null,
          status_category: r.status_category ?? null,
          assignee_display_name: r.assignee_display_name ?? null,
          priority: r.priority ?? null,
        });
      }
      return m;
    },
    enabled: otherKeys.length > 0,
    staleTime: 30_000,
  });

  const rows: Row[] = useMemo(
    () => baseRows.map((r) => ({ ...r, meta: metaMap.get(r.key) ?? null })),
    [baseRows, metaMap],
  );

  const subtaskTypesLower = useMemo(
    () => new Set(SUBTASK_FAMILY_CANONICAL_TYPES.map((t) => t.toLowerCase())),
    [],
  );

  // Canonical read-only cells (parity with the child work item table).
  // Reference: src/modules/tasks/columns/tasksListColumns.ts (buildTasksListColumns).
  const columns: Column<Row>[] = useMemo(() => {
    const keyCell = makeKeyCell(
      (r: Row) => r.key,
      undefined,                                    // no inline open handler on this section
      undefined,
      (r: Row) => (r.meta?.issue_type ? <JiraIssueTypeIcon type={r.meta.issue_type} size={16} /> : null),
    );
    const summaryCell = makeSummaryCell((r: Row) => r.meta?.summary ?? '');
    const statusCell = makeStatusCell(
      (r: Row) => r.meta?.status ?? null,
      () => 'default',                              // unused by render body; lozenge colors from category
      undefined,
      (r: Row) => r.meta?.status_category ?? null,
    );
    const assigneeCell = makeAssigneeCell((r: Row) =>
      r.meta?.assignee_display_name ? { name: r.meta.assignee_display_name, avatarUrl: null } : null);
    const priorityCell = makePriorityCell((r: Row) => r.meta?.priority ?? null);

    return [
      {
        id: 'work', label: 'Work', flex: true, lockedPosition: true,
        cell: (props) => (
          <span style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', minWidth: 0 }}>
            {keyCell(props)}
            <span style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center' }}>
              {summaryCell(props)}
            </span>
          </span>
        ),
      },
      {
        id: 'relationship', label: 'Relationship', width: 16,
        cell: ({ row }) => <span style={{ color: 'var(--ds-text-subtle)' }}>{RELATIONSHIP_LABEL[row.relationship]}</span>,
      },
      { id: 'priority', label: 'Priority', width: 10, cell: priorityCell },
      { id: 'assignee', label: 'Assignee', width: 16, cell: assigneeCell },
      { id: 'status', label: 'Status', width: 14, cell: statusCell },
    ];
  }, []);

  if (!issueKey) return null;

  return (
    <section style={{ marginTop: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <button
          onClick={() => setCollapsed((c) => !c)}
          aria-expanded={!collapsed}
          style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 0, color: 'var(--ds-text)' }}
        >
          {collapsed ? <ChevronRightIcon label="" /> : <ChevronDownIcon label="" />}
          <span style={{ fontWeight: 600, marginLeft: 4 }}>Dependencies</span>
        </button>
        {rows.length > 0 && (
          <span style={{ color: 'var(--ds-text-subtle)', fontSize: 'var(--ds-font-size-100)' }}>{rows.length}</span>
        )}
        <button
          onClick={() => setDialogOpen(true)}
          style={{ marginLeft: 'auto', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--ds-text-brand)', fontSize: 'var(--ds-font-size-100)' }}
        >
          Add dependency
        </button>
      </div>

      {!collapsed && rows.length > 0 && (
        <JiraTable
          columns={columns}
          data={rows}
          getRowId={(r) => `${r.relationship}:${r.key}:${r.edgeId}`}
          ariaLabel="Dependencies"
          contextMenuActions={[{
            id: 'remove',
            label: 'Remove dependency',
            icon: <TrashIcon label="" />,
            danger: true,
            onClick: (r) => { void deps.removeDependency(r.edgeId); },
          }]}
        />
      )}

      <AddDependencyDialog
        isOpen={dialogOpen}
        issueKey={issueKey}
        projectKey={projectKey}
        index={deps.index}
        subtaskTypesLower={subtaskTypesLower}
        onClose={() => setDialogOpen(false)}
        onSubmit={(direction, otherKey) =>
          deps.addDependency({ rowKey: issueKey, direction, otherKey, projectKey })}
      />
    </section>
  );
}
```

- [ ] **Step 2: Barrel export**

```ts
// src/modules/project-work-hub/components/dependencies/index.ts
export { DependenciesSection } from './DependenciesSection';
export type { DependenciesSectionProps } from './DependenciesSection';
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit -p tsconfig.json 2>&1 | grep -i "dependenc" || echo "clean"`
Expected: `clean`. Verify the atlaskit icon import paths resolve (`ls node_modules/@atlaskit/icon/core/delete* node_modules/@atlaskit/icon/core/chevron-*`); swap to a present glyph if any are missing.

- [ ] **Step 4: Color/audit gate**

Run: `npm run lint:colors:gate && npm run audit:ads:gate`
Expected: pass.

- [ ] **Step 5: Commit**

```bash
git add src/modules/project-work-hub/components/dependencies/DependenciesSection.tsx \
        src/modules/project-work-hub/components/dependencies/index.ts
git commit -m "feat(deps): DependenciesSection with JiraTable + Relationship column (CAT-DEPS-ADDDEP-20260704-001)"
```

---

### Task 6: Mount the section in the 4 detail views

**Files:**
- Modify: `src/components/catalyst-detail-views/story/CatalystViewStory.tsx:178`
- Modify: `src/components/catalyst-detail-views/epic/CatalystViewEpic.tsx`
- Modify: `src/components/catalyst-detail-views/feature/CatalystViewFeature.tsx`
- Modify: `src/components/catalyst-detail-views/task/CatalystViewTask.tsx`

**Interfaces:**
- Consumes: `DependenciesSection` from `@/modules/project-work-hub/components/dependencies`.

- [ ] **Step 1: Story — import + mount**

Add the import near the `LinkedWorkItemsSection` import (line 34):

```ts
import { DependenciesSection } from '@/modules/project-work-hub/components/dependencies';
```

Mount immediately AFTER the `<LinkedWorkItemsSection ... />` block (after line 182):

```tsx
      <DependenciesSection
        issueKey={issue?.issue_key ?? ''}
        projectKey={issue?.project_key || projectKey}
      />
```

- [ ] **Step 2: Epic / Feature / Task — same edit**

In each of `CatalystViewEpic.tsx`, `CatalystViewFeature.tsx`, `CatalystViewTask.tsx`: add the same import, then mount `<DependenciesSection issueKey={issue?.issue_key ?? ''} projectKey={issue?.project_key || projectKey} />` directly after that file's `<LinkedWorkItemsSection ... />`. Confirm each file exposes `issue` and `projectKey` in scope (grep each file: `grep -n "LinkedWorkItemsSection\|projectKey\|issue?" <file>`); if a view names the project prop differently, use that view's own variable — do not invent one.

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit -p tsconfig.json 2>&1 | grep -i "CatalystView" || echo "clean"`
Expected: `clean`.

- [ ] **Step 4: Commit**

```bash
git add src/components/catalyst-detail-views/story/CatalystViewStory.tsx \
        src/components/catalyst-detail-views/epic/CatalystViewEpic.tsx \
        src/components/catalyst-detail-views/feature/CatalystViewFeature.tsx \
        src/components/catalyst-detail-views/task/CatalystViewTask.tsx
git commit -m "feat(deps): mount DependenciesSection on Epic/Feature/Story/Task detail (CAT-DEPS-ADDDEP-20260704-001)"
```

---

### Task 7: Live verification (DOM + DB + timeline)

**Files:** none (verification only).

- [ ] **Step 1: Start the dev server**

Use the preview tooling (`preview_start`) on the app's dev config. Open a Story detail page in a project that has ≥2 other non-subtask work items.

- [ ] **Step 2: Menu item presence (DOM probe)**

Open the "+" menu. Confirm "Add Dependency" appears directly after "Link work item". Open a Sub-task detail — confirm it is ABSENT. (`preview_snapshot` to read menu items.)

- [ ] **Step 3: Create a dependency**

Click "Add Dependency" → pick "blocks" + another work item → Add. Confirm the row appears in the Dependencies table with the Relationship column reading "blocks".

- [ ] **Step 4: DB probe (functionality proof)**

Query (staging): confirm the insert landed.
```sql
select id, source_issue_key, target_issue_key, dependency_type, deleted_at
from ph_issue_dependencies
where source_issue_key = '<ISSUE_KEY>' or target_issue_key = '<ISSUE_KEY>'
order by created_at desc limit 5;
```
Expected: one live row (deleted_at IS NULL) with the correct canonical direction.

- [ ] **Step 5: Timeline reflection**

Open the project timeline. Confirm the dependency count shows on BOTH endpoints' Blocked-by / Blocks columns without an app reload (same query key is invalidated).

- [ ] **Step 6: Remove**

Right-click the dependency row → "Remove dependency". Confirm it disappears and the DB row's `deleted_at` is set. Confirm the timeline count drops.

- [ ] **Step 7: Screenshot acceptance**

Capture: (a) the "+" menu showing "Add Dependency", (b) the dialog, (c) the populated Dependencies table, (d) the timeline showing the count. Attach to `06_VALIDATION_EVIDENCE.md` in the feature folder.

- [ ] **Step 8: Final gates**

Run: `npm run lint:colors:gate && npm run audit:ads:gate && npx vitest run src/modules/project-work-hub/components/dependencies`
Expected: all pass.

---

## Self-Review

- **Spec coverage:** D1 one-table+Relationship (Task 5 columns) ✓; D2 same-project dropdown excluding subtasks/children (Task 1 filter + Task 4 query) ✓; D3 Epic/Feature/Story/Task only (Task 3 gating + Task 6 mounts) ✓; D4 ph_issue_dependencies + timeline reflection (Task 5 reuse of useTimelineDependencies, Task 7 verify) ✓. Menu "after Link work item" (Task 3 Step 5) ✓. Remove (Task 5 contextMenuActions, Task 7 Step 6) ✓.
- **Placeholder scan:** none — every code step is complete; the only conditional instructions are icon/import-path fallbacks with exact verify commands.
- **Type consistency:** `UiDirection` ('blocks' | 'is_blocked_by') consistent across dialog + section + addDependency. `DependencyRow`/`DepRelationship` consistent between Task 1 and Task 5. `AddDependencyArgs` matches the hook signature verbatim.
- **Open risk:** atlaskit icon glyph names (`branch`, `delete`, `chevron-*`) — each has a verify+fallback step. `@atlaskit/select`/`modal-dialog`/`button/new` import paths — verify against existing repo usage in Task 4 Step 2.

## Out of scope (slice 2)
Business Request / Gap / MTD dependencies on `br_dependencies`; product/BR timeline reflection; MTD storage confirmation.
