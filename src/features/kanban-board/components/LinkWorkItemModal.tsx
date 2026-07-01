/**
 * LinkWorkItemModal — Jira-parity "Select a work item to link" dialog.
 *
 *  Matches the Jira dialog exactly: header title + descriptive body,
 *  work-item line, link-type select, async work-item picker with
 *  "recently viewed" default options, secondary "+ Create linked work
 *  item" affordance (opens CreateStoryModal), and a "Give feedback"
 *  entry (opens the canonical ShareFeedbackModal from the release hub).
 *
 *  Width is the same 867px shell used by Add Flag and Add Labels.
 *
 *  Data reuse: link mutation reused from
 *    src/modules/project-work-hub/components/linked-work-items/hooks.ts
 *  so behaviour (dedupe, RLS, cache invalidation, toasts) is identical
 *  to the detail-view Linked Work Items panel.
 */
import React, { useMemo, useState } from 'react';
import ModalDialog, { ModalBody, ModalFooter, ModalHeader, ModalTitle } from '@atlaskit/modal-dialog';
import Button from '@atlaskit/button/new';
import Select, { AsyncSelect } from '@atlaskit/select';
import PlusIcon from '@atlaskit/icon/core/add';
import FeedbackIcon from '@atlaskit/icon/core/feedback';
import { token } from '@atlaskit/tokens';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';
import { LINK_TYPES, DEFAULT_LINK_TYPE } from '@/modules/project-work-hub/components/linked-work-items/constants';
import { useLinkedWorkItems, useLinkMutations } from '@/modules/project-work-hub/components/linked-work-items/hooks';
import { ShareFeedbackModal } from '@/components/releases/ShareFeedbackModal';
import CreateStoryModal from '@/components/workhub/create-story/CreateStoryModal';
import type { LinkTypeOption } from '@/modules/project-work-hub/components/linked-work-items/types';

type PickerOption = { value: string; label: string; summary: string; issue_type?: string };

interface Props {
  issueKey: string;
  issueTitle: string;
  issueType: string;
  projectId?: string | null;
  projectKey?: string | null;
  onClose: () => void;
}

export const LinkWorkItemModal: React.FC<Props> = ({
  issueKey, issueTitle, issueType, projectId, projectKey, onClose,
}) => {
  const [linkType, setLinkType] = useState<LinkTypeOption>(
    LINK_TYPES.find((lt) => lt.value === DEFAULT_LINK_TYPE) ?? LINK_TYPES[0],
  );
  const [selected, setSelected] = useState<PickerOption[]>([]);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  const { data: links = [] } = useLinkedWorkItems(issueKey);
  const existingLinkedKeys = useMemo(
    () => new Set(links.map((l: any) => l.target?.issue_key).filter(Boolean) as string[]),
    [links],
  );

  const linkMutation = useLinkMutations(issueKey).linkMutation;

  // Scope the default suggestions to the SOURCE issue's project so different
  // tickets don't all see the same 8 globally-most-recent items. Derive the
  // project prefix from the issue key (e.g. "BAU-123" → "BAU"). Fallback to
  // the projectKey prop; if neither is available, fall back to a global
  // recent list so the picker still has something to show.
  const sourceProjectKey = useMemo(() => {
    const fromKey = issueKey?.includes('-') ? issueKey.split('-')[0] : null;
    return fromKey || projectKey || null;
  }, [issueKey, projectKey]);

  const { data: defaultOptions = [] } = useQuery<PickerOption[]>({
    queryKey: ['kb-link-modal:recent', sourceProjectKey ?? '_global'],
    queryFn: async () => {
      const buildPh = () => {
        let q = supabase
          .from('ph_issues')
          .select('issue_key, summary, issue_type, jira_updated_at, project_key')
          .neq('issue_key', issueKey)
          .is('jira_removed_at', null);
        if (sourceProjectKey) q = q.eq('project_key', sourceProjectKey);
        return q.order('jira_updated_at', { ascending: false }).limit(8);
      };
      const buildCat = () => {
        let q = supabase
          .from('catalyst_issues')
          .select('issue_key, title, issue_type, updated_at, project_key')
          .neq('issue_key', issueKey);
        if (sourceProjectKey) q = q.eq('project_key', sourceProjectKey);
        return q.order('updated_at', { ascending: false }).limit(8);
      };

      const [phRes, catRes] = await Promise.all([buildPh(), buildCat()]);
      const ph = (phRes.data ?? []).map((r: any) => ({
        value: r.issue_key,
        label: `${r.issue_key} ${r.summary}`,
        summary: r.summary,
        issue_type: r.issue_type,
        _ts: r.jira_updated_at,
      }));
      const seen = new Set(ph.map((o) => o.value));
      const cat = (catRes.data ?? [])
        .filter((r: any) => r.issue_key && !seen.has(r.issue_key))
        .map((r: any) => ({
          value: r.issue_key,
          label: `${r.issue_key} ${r.title}`,
          summary: r.title,
          issue_type: r.issue_type,
          _ts: r.updated_at,
        }));
      return [...ph, ...cat]
        .sort((a, b) => (b._ts ?? '').localeCompare(a._ts ?? ''))
        .slice(0, 8)
        .map(({ _ts, ...rest }) => rest as PickerOption);
    },
    staleTime: 60_000,
  });

  const filterRow = (r: PickerOption) =>
    r.value !== issueKey && !existingLinkedKeys.has(r.value) && !selected.some((s) => s.value === r.value);

  const loadOptions = async (input: string): Promise<PickerOption[]> => {
    const q = input.trim();
    if (!q) return defaultOptions.filter(filterRow);
    const [phRes, catRes] = await Promise.all([
      supabase
        .from('ph_issues')
        .select('issue_key, summary, issue_type')
        .or(`issue_key.ilike.${q}%,summary.ilike.%${q}%`)
        .is('jira_removed_at', null)
        .limit(10),
      supabase
        .from('catalyst_issues')
        .select('issue_key, title, issue_type')
        .or(`issue_key.ilike.${q}%,title.ilike.%${q}%`)
        .limit(10),
    ]);
    const ph: PickerOption[] = (phRes.data ?? []).map((r: any) => ({
      value: r.issue_key,
      label: `${r.issue_key} ${r.summary}`,
      summary: r.summary,
      issue_type: r.issue_type,
    }));
    const seen = new Set(ph.map((o) => o.value));
    const cat: PickerOption[] = (catRes.data ?? [])
      .filter((r: any) => r.issue_key && !seen.has(r.issue_key))
      .map((r: any) => ({
        value: r.issue_key,
        label: `${r.issue_key} ${r.title}`,
        summary: r.title,
        issue_type: r.issue_type,
      }));
    return [...ph, ...cat].filter(filterRow).slice(0, 15);
  };

  const canSubmit = selected.length > 0 && !linkMutation.isPending;

  const handleLink = async () => {
    if (!canSubmit) return;
    await linkMutation.mutateAsync({
      linkType: linkType.value,
      targetKeys: selected.map((s) => s.value),
    });
    onClose();
  };

  // Hide the Link modal chrome while the Create modal is open — otherwise
  // ADS stacks a second overlay behind the Create dialog and the user can't
  // reach the form fields underneath (bug from Screenshot 2026-07-01 193830).
  if (createOpen && projectId && projectKey) {
    return (
      <CreateStoryModal
        open={createOpen}
        onClose={() => { setCreateOpen(false); onClose(); }}
        projectId={projectId}
        projectKey={projectKey}
        linkedSource={{ issueKey, linkType: linkType.value, locked: true }}
        onSuccess={() => { setCreateOpen(false); onClose(); }}
      />
    );
  }

  return (
    <>
      <ModalDialog onClose={onClose} width={867}>
        <ModalHeader hasCloseButton>
          <ModalTitle>Select a work item to link</ModalTitle>
        </ModalHeader>
        <ModalBody>
          <p style={{
            margin: '0 0 12px', fontSize: 'var(--ds-font-size-300)',
            color: token('color.text.subtle', 'var(--ds-text-subtle)'),
          }}>
            Link work items to connect work between software and business spaces, and other spaces in Catalyst.
          </p>

          {/* Source work item row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, overflow: 'hidden' }}>
            <JiraIssueTypeIcon type={issueType} size={16} />
            <span style={{ fontSize: 'var(--ds-font-size-400)', color: token('color.text.subtle', 'var(--ds-text-subtle)'), overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {issueKey}{issueTitle ? ` ${issueTitle}` : ''}
            </span>
          </div>

          {/* Link-type + picker row */}
          <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: 12 }}>
            <div>
              <label
                htmlFor="kb-link-modal-type"
                style={{ display: 'block', marginBottom: 4, fontSize: 'var(--ds-font-size-200)', fontWeight: 600, color: token('color.text', 'var(--ds-text)') }}
              >
                Select link type
              </label>
              <Select<LinkTypeOption>
                inputId="kb-link-modal-type"
                aria-label="Link type"
                value={linkType}
                onChange={(v) => v && setLinkType(v)}
                options={LINK_TYPES}
                isSearchable={false}
                menuPortalTarget={typeof document !== 'undefined' ? document.body : undefined}
                styles={{
                  menuPortal: (base) => ({ ...base, zIndex: 10000 }),
                  option:      (base) => ({ ...base, fontSize: 'var(--ds-font-size-300)' }),
                  singleValue: (base) => ({ ...base, fontSize: 'var(--ds-font-size-300)' }),
                  input:       (base) => ({ ...base, fontSize: 'var(--ds-font-size-300)' }),
                  placeholder: (base) => ({ ...base, fontSize: 'var(--ds-font-size-300)' }),
                }}
              />
            </div>
            <div>
              <label
                htmlFor="kb-link-modal-picker"
                style={{ display: 'block', marginBottom: 4, fontSize: 'var(--ds-font-size-200)', fontWeight: 600, color: token('color.text', 'var(--ds-text)') }}
              >
                Select work items
              </label>
              <AsyncSelect<PickerOption, true>
                inputId="kb-link-modal-picker"
                aria-label="Search or paste issue key"
                placeholder="Type, search or paste URL"
                isMulti
                cacheOptions
                // defaultOptions is captured on the first mount; when the
                // useLinkedWorkItems query later resolves, previously-linked
                // rows would otherwise stay in the list. Re-key on the size
                // + issueKey so the AsyncSelect remounts with a fresh
                // filtered list once the linked-items query settles.
                key={`link-picker-${issueKey}-${existingLinkedKeys.size}`}
                defaultOptions={defaultOptions.filter(filterRow)}
                loadOptions={loadOptions}
                filterOption={(candidate) => {
                  // react-select's built-in filter uses substring on label
                  // (already handled by loadOptions server-side); we ONLY
                  // add the self-and-linked exclusion so any cached menu
                  // option from a previous render stays hidden if it
                  // becomes stale.
                  const v = candidate.value;
                  if (v === issueKey) return false;
                  if (existingLinkedKeys.has(v)) return false;
                  return true;
                }}
                value={selected}
                onChange={(v) => setSelected((v as PickerOption[]) ?? [])}
                noOptionsMessage={({ inputValue }) =>
                  inputValue ? `No matches for "${inputValue}"` : 'No recent items'
                }
                menuPortalTarget={typeof document !== 'undefined' ? document.body : undefined}
                formatOptionLabel={(opt, meta) => {
                  const p = opt as PickerOption;
                  // Menu: issue type icon + key + summary. Selected chip: key only.
                  if (meta.context === 'menu') {
                    return (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                        <JiraIssueTypeIcon type={p.issue_type ?? ''} size={16} />
                        <span style={{ fontSize: 'var(--ds-font-size-300)', fontWeight: 400, color: token('color.text', 'var(--ds-text)'), flexShrink: 0 }}>{p.value}</span>
                        <span style={{ fontSize: 'var(--ds-font-size-300)', color: token('color.text', 'var(--ds-text)'), overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.summary}</span>
                      </div>
                    );
                  }
                  return p.value;
                }}
                styles={{
                  menuPortal:  (base) => ({ ...base, zIndex: 10000 }),
                  option:      (base) => ({ ...base, fontSize: 'var(--ds-font-size-300)', padding: '6px 10px' }),
                  input:       (base) => ({ ...base, fontSize: 'var(--ds-font-size-300)' }),
                  placeholder: (base) => ({ ...base, fontSize: 'var(--ds-font-size-300)' }),
                  multiValueLabel: (base) => ({ ...base, fontSize: 'var(--ds-font-size-300)' }),
                  noOptionsMessage: (base) => ({ ...base, fontSize: 'var(--ds-font-size-300)' }),
                }}
              />
            </div>
          </div>

          {/* + Create linked work item — grey subtle affordance (Jira parity). */}
          <div style={{ marginTop: 12 }}>
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              disabled={!projectId || !projectKey}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                padding: '4px 6px', border: 'none', background: 'transparent',
                color: token('color.text.subtle', 'var(--ds-text-subtle)'),
                fontSize: 'var(--ds-font-size-300)', fontFamily: 'inherit',
                cursor: (!projectId || !projectKey) ? 'not-allowed' : 'pointer',
                opacity: (!projectId || !projectKey) ? 0.55 : 1,
              }}
            >
              <PlusIcon label="" size="small" /> Create linked work item
            </button>
          </div>
        </ModalBody>
        <ModalFooter>
          <button
            type="button"
            onClick={() => setFeedbackOpen(true)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '4px 6px', border: 'none', background: 'transparent',
              color: token('color.text.subtle', 'var(--ds-text-subtle)'),
              fontSize: 'var(--ds-font-size-300)', fontFamily: 'inherit', cursor: 'pointer',
              marginRight: 'auto',
            }}
          >
            <FeedbackIcon label="" color={token('color.icon.subtle', 'var(--ds-icon-subtle)')} />
            Give feedback
          </button>
          <Button appearance="subtle" onClick={onClose}>Cancel</Button>
          <Button
            appearance="primary"
            isDisabled={!canSubmit}
            onClick={handleLink}
          >
            Link
          </Button>
        </ModalFooter>
      </ModalDialog>

      {feedbackOpen && (
        <ShareFeedbackModal isOpen={feedbackOpen} onClose={() => setFeedbackOpen(false)} />
      )}

    </>
  );
};
