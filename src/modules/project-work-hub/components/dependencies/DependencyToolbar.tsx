/**
 * DependencyToolbar — inline add-dependency flow for the DependenciesSection.
 *
 * Mirrors LinkedWorkItems' LinkToolbar (Jira-parity inline row, NOT a modal):
 *   - @atlaskit/select   — relationship picker (blocks / is blocked by)
 *   - @atlaskit/select AsyncSelect — same-project work-item picker (multi, async)
 *   - @atlaskit/button   — Add / Cancel
 *
 * Candidate rules (delegated to filterCandidateIssues — depSectionModel):
 *   - same project only (project_key = projectKey)
 *   - excludes the source issue itself, its direct children, sub-tasks,
 *     and any work item already in a live dependency with the source
 *   - active items only (jira_removed_at IS NULL)
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import Select, { AsyncSelect } from '@atlaskit/select';
import Button from '@atlaskit/button/new';
import { supabase } from '@/integrations/supabase/client';
import { WORK_ITEM_ICONS } from '../dialogs/story-detail-modules/constants';
import {
  getEntry,
  type DependencyIndex,
  type UiDirection,
} from '@/components/shared/Timeline/dependencies/normalize';
import {
  filterCandidateIssues,
  relatedKeysFor,
  type CandidateIssue,
} from './depSectionModel';
// NOTE: the `lwi-*` toolbar classes are defined in linked-work-items.css, which
// is loaded by the sibling LinkedWorkItemsSection mounted alongside this section
// on every detail view — so no direct CSS import here (audit: no per-file CSS import).

type DirectionOption = { label: string; value: UiDirection };

const DIRECTION_OPTIONS: DirectionOption[] = [
  { label: 'blocks', value: 'blocks' },
  { label: 'is blocked by', value: 'is_blocked_by' },
];

type PickerOption = {
  value: string;
  label: string;
  issue_type?: string;
  summary: string;
};

function renderIssueOption({ value, summary, issue_type }: PickerOption) {
  const icon =
    WORK_ITEM_ICONS[issue_type ?? ''] ??
    WORK_ITEM_ICONS[issue_type?.toLowerCase?.() ?? ''] ??
    WORK_ITEM_ICONS.Task;
  return (
    <div className="lwi-option">
      <span className="lwi-option__icon" aria-hidden dangerouslySetInnerHTML={{ __html: icon }} />
      <span className="lwi-option__key">{value}</span>
      <span className="lwi-option__summary">{summary}</span>
    </div>
  );
}

export interface DependencyToolbarProps {
  sourceIssueKey: string;
  projectKey: string;
  /** Live dependency index (for related-key exclusion). */
  index: DependencyIndex;
  /** Lowercased sub-task-family type names to exclude. */
  subtaskTypesLower: Set<string>;
  /** Create one edge per selected key. Returns after all inserts settle. */
  onAdd: (direction: UiDirection, targetKeys: string[]) => void | Promise<void>;
  onCancel: () => void;
  isPending?: boolean;
}

export function DependencyToolbar({
  sourceIssueKey,
  projectKey,
  index,
  subtaskTypesLower,
  onAdd,
  onCancel,
  isPending,
}: DependencyToolbarProps) {
  const [direction, setDirection] = useState<DirectionOption>(DIRECTION_OPTIONS[0]);
  const [selected, setSelected] = useState<PickerOption[]>([]);

  const relatedKeys = useMemo(
    () => relatedKeysFor(getEntry(index, sourceIssueKey)),
    [index, sourceIssueKey],
  );

  // Focus the picker without scrolling, then smooth-scroll the toolbar to
  // center one frame later (same recipe as LinkToolbar) so the section's
  // expand/show commits settle before the scroll animates.
  const toolbarRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const input = document.getElementById('dep-issue-picker') as HTMLInputElement | null;
    input?.focus({ preventScroll: true });
    requestAnimationFrame(() => {
      toolbarRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }, []);

  const loadOptions = async (input: string): Promise<PickerOption[]> => {
    if (!projectKey) return [];
    const q = input.trim();
    let query = supabase
      .from('ph_issues')
      .select('issue_key, summary, issue_type, parent_key')
      .eq('project_key', projectKey)
      .is('jira_removed_at', null);
    query = q
      ? query.or(`issue_key.ilike.${q}%,summary.ilike.%${q}%`).limit(15)
      : query.order('jira_updated_at', { ascending: false }).limit(8);
    const { data, error } = await query;
    if (error) {
      console.error('[DependencyToolbar] candidate load failed', error);
      return [];
    }
    const candidates: CandidateIssue[] = (data ?? []).map((r: any) => ({
      issue_key: r.issue_key,
      issue_type: r.issue_type ?? null,
      parent_key: r.parent_key ?? null,
    }));
    const summaryByKey = new Map<string, string>(
      (data ?? []).map((r: any) => [r.issue_key, r.summary ?? '']),
    );
    return filterCandidateIssues(candidates, { issueKey: sourceIssueKey, relatedKeys, subtaskTypesLower })
      .filter((r) => !selected.some((s) => s.value === r.issue_key))
      .map((r) => {
        const summary = summaryByKey.get(r.issue_key) ?? '';
        return {
          value: r.issue_key,
          label: `${r.issue_key} ${summary}`,
          summary,
          issue_type: r.issue_type ?? undefined,
        };
      });
  };

  const canSubmit = selected.length > 0 && !isPending;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    await onAdd(direction.value, selected.map((s) => s.value));
    setSelected([]);
  };

  return (
    <div ref={toolbarRef} className="lwi-toolbar" role="group" aria-label="Add dependency">
      <div className="lwi-toolbar__row">
        <div className="lwi-toolbar__type">
          <Select<DirectionOption>
            inputId="dep-direction"
            aria-label="Dependency type"
            value={direction}
            onChange={(v) => v && setDirection(v)}
            options={DIRECTION_OPTIONS}
            isSearchable={false}
            spacing="compact"
          />
        </div>
        <div className="lwi-toolbar__picker">
          <AsyncSelect<PickerOption, true>
            inputId="dep-issue-picker"
            aria-label="Search work items"
            placeholder="Type or search a work item"
            isMulti
            cacheOptions
            defaultOptions
            loadOptions={loadOptions}
            value={selected}
            onChange={(v) => setSelected((v as PickerOption[]) ?? [])}
            formatOptionLabel={(opt, meta) =>
              meta.context === 'menu'
                ? renderIssueOption(opt as PickerOption)
                : (opt as PickerOption).value
            }
            noOptionsMessage={({ inputValue }) =>
              inputValue ? `No matches for "${inputValue}"` : 'No items'
            }
            spacing="compact"
          />
        </div>
      </div>

      <div className="lwi-toolbar__actions">
        <div className="lwi-toolbar__buttons">
          <Button appearance="primary" isDisabled={!canSubmit} onClick={handleSubmit}>
            Add
          </Button>
          <Button appearance="subtle" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
