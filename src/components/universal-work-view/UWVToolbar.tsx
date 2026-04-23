// @ts-nocheck
/**
 * UWVToolbar — two-row toolbar:
 *   Row 1 (52px): close button + title + count + export + column picker
 *   Row 2 (48px): search + assignee avatars + filter button + group + columns + more
 *
 * When selectedIds.size > 0, Row 2 is replaced with UWVBulkActions.
 */

import React, { useMemo, useState } from 'react';
import Button, { IconButton } from '@atlaskit/button/new';
import TextField from '@atlaskit/textfield';
import Popup from '@atlaskit/popup';
import Checkbox from '@atlaskit/checkbox';
import AvatarGroup from '@atlaskit/avatar-group';
import { token } from '@atlaskit/tokens';
import { UWVExport } from './UWVExport';
import { UWVColumnPicker } from './UWVColumnPicker';
import { UWVBulkActions } from './UWVBulkActions';
import { useUWVStatuses, useUWVAssignees } from './useUWVData';
import type { UWVColumn, UWVItem, UWVPrefs } from './uwv.types';

interface Props {
  title: string;
  filteredCount: number;
  totalCount: number;
  searchText: string;
  onSearchChange: (s: string) => void;
  statusFilter: string[];
  onStatusFilterChange: (s: string[]) => void;
  selectedIds: Set<string>;
  onSelectChange: (s: Set<string>) => void;
  allItems: UWVItem[];
  columns: UWVColumn[];
  prefs: UWVPrefs;
  onSavePrefs: (p: UWVPrefs) => void;
  project: string;
  onClose: () => void;
}

// Inline icons — keep toolbar fully Atlaskit otherwise.
function CloseIcon({ label }: { label?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-label={label} role="img">
      <path d="M6 6l12 12M18 6L6 18" stroke="#42526E" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="11" cy="11" r="6" stroke="#6B778C" strokeWidth="1.6" />
      <path d="M20 20l-4-4" stroke="#6B778C" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
function ChevronDown() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M6 9l6 6 6-6" stroke="#42526E" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function MoreIcon({ label }: { label?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-label={label} role="img">
      <circle cx="5" cy="12" r="1.6" fill="#42526E" />
      <circle cx="12" cy="12" r="1.6" fill="#42526E" />
      <circle cx="19" cy="12" r="1.6" fill="#42526E" />
    </svg>
  );
}

export function UWVToolbar({
  title,
  filteredCount,
  totalCount,
  searchText,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  selectedIds,
  onSelectChange,
  allItems,
  columns,
  prefs,
  onSavePrefs,
  project,
  onClose,
}: Props) {
  const [filterOpen, setFilterOpen] = useState(false);
  const { data: statusGroups = [] } = useUWVStatuses(project);
  const { data: assignees = [] } = useUWVAssignees(project);

  const avatarData = useMemo(
    () =>
      assignees.slice(0, 12).map((a: any) => ({
        key: a.id,
        name: a.name,
        src: a.avatar,
      })),
    [assignees],
  );

  const toggleStatus = (s: string) => {
    if (statusFilter.includes(s)) {
      onStatusFilterChange(statusFilter.filter((v) => v !== s));
    } else {
      onStatusFilterChange([...statusFilter, s]);
    }
  };

  const FilterContent = () => (
    <div
      style={{
        width: 280,
        maxHeight: 420,
        overflowY: 'auto',
        padding: 12,
        background: '#FFFFFF',
        border: '1px solid #DFE1E6',
        borderRadius: 6,
        boxShadow: '0 8px 24px rgba(9,30,66,0.16)',
      }}
    >
      {statusGroups.length === 0 ? (
        <div style={{ fontSize: 13, color: '#6B778C' }}>No statuses available</div>
      ) : (
        statusGroups.map((group: any) => (
          <div key={group.label} style={{ marginBottom: 12 }}>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: '#5E6C84',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                marginBottom: 6,
              }}
            >
              {group.label}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {group.options.map((opt: any) => (
                <Checkbox
                  key={opt.value}
                  isChecked={statusFilter.includes(opt.value)}
                  onChange={() => toggleStatus(opt.value)}
                  label={opt.label}
                />
              ))}
            </div>
          </div>
        ))
      )}
      {statusFilter.length > 0 && (
        <div style={{ paddingTop: 8, borderTop: '1px solid #EBECF0', marginTop: 4 }}>
          <Button appearance="subtle" spacing="compact" onClick={() => onStatusFilterChange([])}>
            Clear all
          </Button>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* ROW 1 — title bar */}
      <div
        style={{
          height: 52,
          display: 'flex',
          alignItems: 'center',
          padding: '0 16px',
          borderBottom: '1px solid #DFE1E6',
          background: '#FFFFFF',
          flexShrink: 0,
        }}
      >
        <IconButton icon={CloseIcon as any} label="Close" appearance="subtle" onClick={onClose} />
        <span
          style={{
            fontSize: 15,
            fontWeight: 600,
            color: '#172B4D',
            marginLeft: 8,
            fontFamily: '"Atlassian Sans", -apple-system, sans-serif',
          }}
        >
          {title}
        </span>
        <span
          style={{
            fontSize: 12,
            background: '#F1F2F4',
            color: '#626F86',
            padding: '2px 8px',
            borderRadius: 10,
            marginLeft: 8,
            fontWeight: 500,
          }}
        >
          {filteredCount}
        </span>

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4 }}>
          <UWVExport items={allItems} columns={columns} title={title} />
          <UWVColumnPicker columns={columns} prefs={prefs} onSave={onSavePrefs} />
        </div>
      </div>

      {/* ROW 2 — bulk actions or filter bar */}
      {selectedIds.size > 0 ? (
        <UWVBulkActions
          selectedIds={selectedIds}
          allItems={allItems}
          project={project}
          onClear={() => onSelectChange(new Set())}
        />
      ) : (
        <div
          style={{
            height: 48,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '0 16px',
            background: '#F7F8F9',
            borderBottom: '1px solid #DFE1E6',
            flexShrink: 0,
          }}
        >
          <div style={{ width: 220 }}>
            <TextField
              elemBeforeInput={
                <span style={{ paddingLeft: 8, display: 'flex', alignItems: 'center' }}>
                  <SearchIcon />
                </span>
              }
              placeholder="Search list"
              value={searchText}
              onChange={(e: any) => onSearchChange(e.currentTarget.value)}
              isCompact
            />
          </div>

          {avatarData.length > 0 && (
            <AvatarGroup appearance="stack" maxCount={4} size="small" data={avatarData as any} />
          )}

          <Popup
            isOpen={filterOpen}
            onClose={() => setFilterOpen(false)}
            placement="bottom-start"
            content={FilterContent}
            trigger={(triggerProps) => (
              <Button
                {...triggerProps}
                appearance="subtle"
                iconAfter={ChevronDown as any}
                onClick={() => setFilterOpen((v) => !v)}
              >
                {statusFilter.length === 0 ? 'Filter' : `${statusFilter.length} filters applied`}
              </Button>
            )}
          />

          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4 }}>
            <Button appearance="subtle" iconAfter={ChevronDown as any}>
              Group
            </Button>
            <IconButton icon={MoreIcon as any} label="More actions" appearance="subtle" />
          </div>
        </div>
      )}
    </>
  );
}
