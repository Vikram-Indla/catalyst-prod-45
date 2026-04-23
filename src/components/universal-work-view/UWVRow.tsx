// @ts-nocheck
/**
 * UWVRow — single row in the Universal Work View virtualized grid.
 *
 * Renders all visible cells. Per CLAUDE.md §11, work-item icons come from the
 * canonical WorkItemIcon registry — never re-created here.
 *
 * Verified against Jira list DOM:
 *   - row height: 40px
 *   - key colour at rest: #505258 (dark grey, NOT blue, NOT underlined)
 *   - summary colour: #29292E
 *   - hover background: #F4F5F7
 */

import React from 'react';
import Lozenge from '@atlaskit/lozenge';
import Avatar from '@atlaskit/avatar';
import Tooltip from '@atlaskit/tooltip';
import Checkbox from '@atlaskit/checkbox';
import { token } from '@atlaskit/tokens';
import WorkItemIcon, { normalizeIconType } from '@/components/shared/WorkItemIcon';
import {
  lozengeAppearance,
  hubColour,
  hubLabel,
  formatDate,
  isOverdue,
  firstName,
  mapIssueTypeToIcon,
  JIRA_KEY_COLOR,
  JIRA_SUMMARY_COLOR,
  JIRA_ROW_HEIGHT,
} from './uwv.utils';
import { resolveAvatarUrl } from '@/lib/avatars';
import type { UWVColumn, UWVItem } from './uwv.types';

interface UWVRowProps {
  item: UWVItem;
  columns: UWVColumn[];
  gridTemplate: string;
  isSelected: boolean;
  isExpanded: boolean;
  hasChildren: boolean;
  onToggleSelect: () => void;
  onToggleExpand: () => void;
  onClick: () => void;
}

const CELL_BASE: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  height: JIRA_ROW_HEIGHT,
  padding: '0 12px',
  fontSize: 14,
  fontWeight: 400,
  color: JIRA_SUMMARY_COLOR,
  fontFamily:
    '"Atlassian Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  borderBottom: `1px solid ${token('color.border', '#EBECF0')}`,
  overflow: 'hidden',
  whiteSpace: 'nowrap',
  textOverflow: 'ellipsis',
  background: 'transparent',
};

function renderCell(col: UWVColumn, item: UWVItem, hasChildren: boolean, isExpanded: boolean,
                    onToggleExpand: () => void, onKeyClick: () => void): React.ReactNode {
  switch (col.fieldId) {
    case 'type': {
      const iconType = normalizeIconType(mapIssueTypeToIcon(item.issueType));
      const indent = (item.level ?? 0) * 18;
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, paddingLeft: indent }}>
          {hasChildren ? (
            <button
              type="button"
              aria-label={isExpanded ? 'Collapse' : 'Expand'}
              onClick={(e) => {
                e.stopPropagation();
                onToggleExpand();
              }}
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: '#6B778C',
                fontSize: 12,
                padding: '0 2px',
                display: 'flex',
                alignItems: 'center',
                lineHeight: 1,
              }}
            >
              {isExpanded ? '▾' : '›'}
            </button>
          ) : (
            <span style={{ width: 16, display: 'inline-block' }} />
          )}
          <WorkItemIcon type={iconType as any} size={16} />
        </div>
      );
    }
    case 'key':
      return (
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onKeyClick();
          }}
          style={{
            fontSize: 14,
            fontWeight: 400,
            color: JIRA_KEY_COLOR,
            textDecoration: 'none',
            fontFamily: 'inherit',
            whiteSpace: 'nowrap',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLAnchorElement).style.textDecoration = 'underline';
            (e.currentTarget as HTMLAnchorElement).style.color = '#0052CC';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLAnchorElement).style.textDecoration = 'none';
            (e.currentTarget as HTMLAnchorElement).style.color = JIRA_KEY_COLOR;
          }}
        >
          <bdi dir="ltr">{item.key}</bdi>
        </a>
      );
    case 'summary':
      return (
        <span
          dir="auto"
          style={{
            color: JIRA_SUMMARY_COLOR,
            fontSize: 14,
            fontWeight: 400,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
          title={item.summary}
        >
          {item.summary}
        </span>
      );
    case 'status':
      return item.status ? (
        <Lozenge appearance={lozengeAppearance(item.statusCategory, item.status)}>
          {item.status}
        </Lozenge>
      ) : (
        <span style={{ color: '#6B778C' }}>—</span>
      );
    case 'comments': {
      const c = item.commentCount ?? 0;
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#6B778C', fontSize: 13 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
              stroke="#6B778C"
              strokeWidth="1.6"
              strokeLinejoin="round"
            />
          </svg>
          {c > 0 ? <span>{c}</span> : <span style={{ color: '#9FADBC' }}>Add comment</span>}
        </div>
      );
    }
    case 'assignee': {
      const display = item.assigneeName ?? null;
      const url = item.assigneeAvatar ?? (display ? resolveAvatarUrl(display) ?? undefined : undefined);
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          <Avatar size="xsmall" name={display ?? 'Unassigned'} src={url} />
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {firstName(display)}
          </span>
        </div>
      );
    }
    case 'hubSource': {
      const c = hubColour(item.hubSource);
      return (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            background: c.bg,
            color: c.text,
            fontSize: 11,
            fontWeight: 600,
            padding: '2px 8px',
            borderRadius: 3,
            letterSpacing: '0.02em',
          }}
        >
          {hubLabel(item.hubSource)}
        </span>
      );
    }
    case 'dueDate': {
      const overdue = isOverdue(item.dueDate);
      return (
        <span style={{ color: overdue ? '#C9372C' : '#42526E', fontSize: 13 }}>
          {formatDate(item.dueDate)}
        </span>
      );
    }
    case 'created':
    case 'updated':
      return (
        <span style={{ color: '#42526E', fontSize: 13 }}>
          {formatDate((item as any)[col.fieldId])}
        </span>
      );
    case 'priority':
    case 'parentKey':
      return (
        <span style={{ color: '#42526E', fontSize: 13 }}>
          {(item as any)[col.fieldId] ?? '—'}
        </span>
      );
    default:
      return <span style={{ color: '#6B778C' }}>—</span>;
  }
}

export const UWVRow = React.memo(function UWVRow({
  item,
  columns,
  gridTemplate,
  isSelected,
  isExpanded,
  hasChildren,
  onToggleSelect,
  onToggleExpand,
  onClick,
}: UWVRowProps) {
  return (
    <div
      role="row"
      onClick={onClick}
      style={{
        display: 'grid',
        gridTemplateColumns: gridTemplate,
        background: isSelected ? token('color.background.selected', '#E9F2FF') : 'transparent',
        cursor: 'pointer',
      }}
      onMouseEnter={(e) => {
        if (!isSelected) (e.currentTarget as HTMLDivElement).style.background = '#F4F5F7';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.background = isSelected
          ? token('color.background.selected', '#E9F2FF')
          : 'transparent';
      }}
    >
      {/* Checkbox cell */}
      <div
        role="gridcell"
        onClick={(e) => {
          e.stopPropagation();
          onToggleSelect();
        }}
        style={{
          ...CELL_BASE,
          padding: '0 6px',
          justifyContent: 'center',
        }}
      >
        <Checkbox isChecked={isSelected} onChange={() => undefined} />
      </div>

      {columns.map((col) => (
        <div key={col.fieldId} role="gridcell" style={CELL_BASE}>
          {renderCell(col, item, hasChildren, isExpanded, onToggleExpand, onClick)}
        </div>
      ))}

      {/* Trailing "+ add column" placeholder cell */}
      <div role="gridcell" style={{ ...CELL_BASE, padding: 0 }} />
    </div>
  );
});
