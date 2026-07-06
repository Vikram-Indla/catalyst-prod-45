/**
 * DmSummarizePanel — dock DM "summarize" surface.
 *
 * Replaces the message list (composer stays) when the user taps the Summarize
 * icon in a 1:1 DM header. Shows work items COMMON to the logged-in user and
 * the DM partner (assignee/reporter pair = {me, other}) in the canonical
 * JiraTable, compacted for the ~380px dock: Key · Summary · Status · Assignee.
 *
 * Controls are search + a work-item-type dropdown (both client-side). A Skip
 * button dismisses the panel back to the normal DM. A shimmer skeleton shows
 * while the query is in flight.
 */
import React, { useMemo, useState } from 'react';
import Textfield from '@atlaskit/textfield';
import Select from '@atlaskit/select';
import SearchIcon from '@atlaskit/icon/core/search';
import {
  JiraTable,
  makeKeyCell,
  makeSummaryCell,
  makeStatusCell,
  makeAssigneeCell,
} from '@/components/shared/JiraTable';
import type { Column } from '@/components/shared/JiraTable';
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';
import { classifyType, jiraIconType, lozengeAppearance } from '@/components/universal-work-view/uwv.utils';
import type { ChatConversation } from '@/types/chat';
import { useSharedWorkItems, type SharedWorkItem } from '@/hooks/chat/useSharedWorkItems';

interface DmSummarizePanelProps {
  conversation: ChatConversation;
  onSkip: () => void;
}

type TypeFilter = 'all' | 'epic' | 'feature' | 'story' | 'bug' | 'task';

const TYPE_OPTIONS: { label: string; value: TypeFilter }[] = [
  { label: 'All types', value: 'all' },
  { label: 'Epics', value: 'epic' },
  { label: 'Features', value: 'feature' },
  { label: 'Stories', value: 'story' },
  { label: 'Bugs', value: 'bug' },
  { label: 'Tasks', value: 'task' },
];

/** Opens the Jira issue detail via the app-wide event (same as ConversationHeader). */
function openIssue(key: string) {
  window.dispatchEvent(new CustomEvent('catalyst:open-issue', { detail: { issueKey: key } }));
}

export function DmSummarizePanel({ conversation, onSkip }: DmSummarizePanelProps) {
  const otherUserId = conversation.dmMemberIds?.[0] ?? null;
  const { items, isLoading, noJiraLink } = useSharedWorkItems(otherUserId, true);

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((r) => {
      if (typeFilter !== 'all' && classifyType(r.issueType) !== typeFilter) return false;
      if (!q) return true;
      return (
        r.key.toLowerCase().includes(q) || r.summary.toLowerCase().includes(q)
      );
    });
  }, [items, search, typeFilter]);

  const columns = useMemo<Column<SharedWorkItem>[]>(
    () => [
      {
        id: 'key',
        label: 'Key',
        width: 20,
        accessor: (r) => r.key,
        cell: makeKeyCell(
          (r: SharedWorkItem) => r.key,
          (r: SharedWorkItem) => openIssue(r.key),
          undefined,
          (r: SharedWorkItem) =>
            r.issueType ? <JiraIssueTypeIcon type={jiraIconType(r.issueType)} size={16} /> : undefined,
        ),
      },
      {
        id: 'summary',
        label: 'Summary',
        flex: true,
        alwaysVisible: true,
        accessor: (r) => r.summary,
        cell: makeSummaryCell((r: SharedWorkItem) => r.summary),
      },
      {
        id: 'status',
        label: 'Status',
        width: 26,
        accessor: (r) => r.status,
        cell: makeStatusCell(
          (r: SharedWorkItem) => r.status || null,
          (s) => lozengeAppearance('', s ?? ''),
          undefined,
          (r: SharedWorkItem) => r.statusCategory || null,
        ),
      },
      {
        id: 'assignee',
        label: 'Assignee',
        width: 28,
        accessor: (r) => r.assigneeName,
        cell: makeAssigneeCell((r: SharedWorkItem) =>
          r.assigneeName ? { name: r.assigneeName, avatarUrl: null } : null,
        ),
      },
    ],
    [],
  );

  return (
    <div className="cc-sum-panel">
      <div className="cc-sum-panel__bar">
        <span className="cc-sum-panel__title">Shared work items</span>
        <button type="button" className="cc-sum-panel__skip" onClick={onSkip}>
          Skip
        </button>
      </div>

      <div className="cc-sum-panel__controls">
        <div className="cc-sum-panel__search">
          <Textfield
            isCompact
            value={search}
            onChange={(e) => setSearch((e.target as HTMLInputElement).value)}
            placeholder="Search"
            elemBeforeInput={
              <span style={{ display: 'inline-flex', paddingInlineStart: 6, color: 'var(--ds-icon-subtle)' }}>
                <SearchIcon label="" LEGACY_size="small" />
              </span>
            }
          />
        </div>
        <div className="cc-sum-panel__type">
          <Select<{ label: string; value: TypeFilter }>
            isSearchable={false}
            spacing="compact"
            value={TYPE_OPTIONS.find((o) => o.value === typeFilter)}
            options={TYPE_OPTIONS}
            onChange={(opt) => setTypeFilter(opt?.value ?? 'all')}
            styles={{ menu: (base) => ({ ...base, zIndex: 100 }) }}
          />
        </div>
      </div>

      <div className="cc-sum-panel__table">
        {isLoading ? (
          <div className="cc-sum-skel" aria-label="Loading shared work items" role="status">
            {Array.from({ length: 5 }).map((_, i) => (
              <div className="cc-sum-skel__row" key={i}>
                <span className="cc-sum-skel__bar" style={{ width: 40 }} />
                <span className="cc-sum-skel__bar" style={{ flex: 1 }} />
                <span className="cc-sum-skel__bar" style={{ width: 54 }} />
                <span className="cc-sum-skel__bar" style={{ width: 20 }} />
              </div>
            ))}
          </div>
        ) : (
          <JiraTable<SharedWorkItem>
            columns={columns}
            data={filtered}
            getRowId={(r) => r.id}
            onRowClick={(r) => openIssue(r.key)}
            density="compact"
            ariaLabel="Shared work items"
            showRowCount={false}
            emptyView={
              <div className="cc-sum-panel__empty">
                {noJiraLink
                  ? 'No Jira link for one of you, so shared items can’t be listed.'
                  : 'No shared work items with this person.'}
              </div>
            }
          />
        )}
      </div>
    </div>
  );
}

export default DmSummarizePanel;
