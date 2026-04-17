/**
 * LinkToolbar — inline link flow for the LinkedWorkItems molecule.
 *
 * Replaces the legacy hand-rolled dropdown + textfield pair with
 * Atlassian Design primitives:
 *   - @atlaskit/select  — link type picker (single) + issue picker (multi, async)
 *   - @atlaskit/button  — Link / Cancel primary/subtle actions
 *
 * Business rules preserved from the legacy AddLinkRow:
 *   - excludes the source issue itself from picker results (no self-linking)
 *   - excludes already-linked keys from picker results (no duplicates)
 *   - respects `ph_issues.jira_removed_at IS NULL` (active items only)
 *   - empty / bare search returns 8 most-recently-updated items
 *   - keyed search uses case-insensitive substring on issue_key + summary
 *   - submit disabled when no items selected or mutation is pending
 *
 * Accessibility:
 *   - form region wraps the entire toolbar so screen readers announce it
 *   - each Select has an explicit aria-label via the `inputId` + `aria-label`
 *   - the "Create linked work item" affordance is a proper <button>
 */
import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import AsyncSelect from '@atlaskit/select/async';
import Select from '@atlaskit/select';
import Button from '@atlaskit/button/new';
import { Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { WORK_ITEM_ICONS } from '../dialogs/story-detail-modules/constants';
import { LINK_TYPES, DEFAULT_LINK_TYPE } from './constants';
import type { LinkTypeOption } from './types';

type PickerOption = {
  value: string;
  label: string;
  issue_type?: string;
  summary: string;
};

type OptionRenderArgs = {
  label: string;
  value: string;
  issue_type?: string;
  summary: string;
};

function renderIssueOption({ value, summary, issue_type }: OptionRenderArgs) {
  const icon =
    WORK_ITEM_ICONS[issue_type ?? ''] ??
    WORK_ITEM_ICONS[issue_type?.toLowerCase?.() ?? ''] ??
    WORK_ITEM_ICONS.Task;
  return (
    <div className="lwi-option">
      <span
        className="lwi-option__icon"
        aria-hidden
        dangerouslySetInnerHTML={{ __html: icon }}
      />
      <span className="lwi-option__key">{value}</span>
      <span className="lwi-option__summary">{summary}</span>
    </div>
  );
}

export interface LinkToolbarProps {
  sourceIssueKey: string;
  existingLinkedKeys: Set<string>;
  onLink: (linkType: string, targetKeys: string[]) => void | Promise<void>;
  onCreateNew?: (linkType: string) => void;
  onCancel: () => void;
  isPending?: boolean;
}

export function LinkToolbar({
  sourceIssueKey,
  existingLinkedKeys,
  onLink,
  onCreateNew,
  onCancel,
  isPending,
}: LinkToolbarProps) {
  const [linkType, setLinkType] = useState<LinkTypeOption>(
    LINK_TYPES.find((lt) => lt.value === DEFAULT_LINK_TYPE) ?? LINK_TYPES[0],
  );
  const [selected, setSelected] = useState<PickerOption[]>([]);

  // Default options = 8 most-recent active issues (same contract as legacy)
  const { data: defaultOptions = [] } = useQuery<PickerOption[]>({
    queryKey: ['lwi:default-options'],
    queryFn: async () => {
      const { data } = await supabase
        .from('ph_issues')
        .select('issue_key, summary, issue_type')
        .is('jira_removed_at', null)
        .order('jira_updated_at', { ascending: false })
        .limit(8);
      return (data ?? []).map((r: any) => ({
        value: r.issue_key,
        label: `${r.issue_key} ${r.summary}`,
        summary: r.summary,
        issue_type: r.issue_type,
      }));
    },
    staleTime: 60_000,
  });

  const filterRow = useMemo(
    () => (r: PickerOption) =>
      r.value !== sourceIssueKey &&
      !existingLinkedKeys.has(r.value) &&
      !selected.some((s) => s.value === r.value),
    [sourceIssueKey, existingLinkedKeys, selected],
  );

  const loadOptions = async (input: string): Promise<PickerOption[]> => {
    const q = input.trim();
    if (!q) {
      return defaultOptions.filter(filterRow);
    }
    const { data } = await supabase
      .from('ph_issues')
      .select('issue_key, summary, issue_type')
      .or(`issue_key.ilike.${q}%,summary.ilike.%${q}%`)
      .is('jira_removed_at', null)
      .limit(10);
    const options: PickerOption[] = (data ?? []).map((r: any) => ({
      value: r.issue_key,
      label: `${r.issue_key} ${r.summary}`,
      summary: r.summary,
      issue_type: r.issue_type,
    }));
    return options.filter(filterRow);
  };

  const canSubmit = selected.length > 0 && !isPending;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    await onLink(
      linkType.value,
      selected.map((s) => s.value),
    );
    setSelected([]);
  };

  return (
    <div className="lwi-toolbar" role="group" aria-label="Link work items">
      <div className="lwi-toolbar__row">
        <div className="lwi-toolbar__type">
          <Select<LinkTypeOption>
            inputId="lwi-link-type"
            aria-label="Link type"
            value={linkType}
            onChange={(v) => v && setLinkType(v)}
            options={LINK_TYPES}
            isSearchable={false}
            spacing="compact"
          />
        </div>
        <div className="lwi-toolbar__picker">
          <AsyncSelect<PickerOption, true>
            inputId="lwi-issue-picker"
            aria-label="Search or paste issue key"
            placeholder="Type, search or paste URL"
            isMulti
            cacheOptions
            defaultOptions={defaultOptions.filter(filterRow)}
            loadOptions={loadOptions}
            value={selected}
            onChange={(v) => setSelected((v as PickerOption[]) ?? [])}
            formatOptionLabel={(opt, meta) =>
              meta.context === 'menu'
                ? renderIssueOption(opt as OptionRenderArgs)
                : (opt as OptionRenderArgs).value
            }
            noOptionsMessage={({ inputValue }) =>
              inputValue ? `No matches for "${inputValue}"` : 'No recent items'
            }
            spacing="compact"
          />
        </div>
      </div>

      <div className="lwi-toolbar__actions">
        <button
          type="button"
          className="lwi-toolbar__create"
          onClick={() => onCreateNew?.(linkType.value)}
          disabled={!onCreateNew}
        >
          <Plus size={14} strokeWidth={1.75} /> Create linked work item
        </button>
        <div className="lwi-toolbar__buttons">
          <Button
            appearance="primary"
            isDisabled={!canSubmit}
            onClick={handleSubmit}
          >
            Link
          </Button>
          <Button appearance="subtle" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
