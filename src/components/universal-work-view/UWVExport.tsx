// @ts-nocheck
/**
 * UWVExport — popup with CSV (visible / all) + XLSX (with hierarchy sheet).
 */

import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import Popup from '@atlaskit/popup';
import Button from '@atlaskit/button/new';
import { token } from '@atlaskit/tokens';
import {
  formatDate,
  hubLabel,
  DEFAULT_COLUMNS,
} from './uwv.utils';
import type { UWVColumn, UWVItem } from './uwv.types';

interface Props {
  items: UWVItem[];
  columns: UWVColumn[];
  title: string;
}

function getCellValue(item: UWVItem, fieldId: string): string {
  switch (fieldId) {
    case 'type':
      return item.issueType ?? '';
    case 'key':
      return item.key ?? '';
    case 'summary':
      return item.summary ?? '';
    case 'status':
      return item.status ?? '';
    case 'comments':
      return String(item.commentCount ?? 0);
    case 'assignee':
      return item.assigneeName ?? '';
    case 'hubSource':
      return hubLabel(item.hubSource);
    case 'dueDate':
      return formatDate(item.dueDate);
    case 'created':
      return formatDate(item.created);
    case 'updated':
      return formatDate(item.updated);
    case 'priority':
      return item.priority ?? '';
    case 'parentKey':
      return item.parentKey ?? '';
    default:
      return String((item as any)[fieldId] ?? '');
  }
}

function downloadFile(name: string, content: BlobPart, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function exportCSV(items: UWVItem[], cols: UWVColumn[], title: string) {
  const headers = cols.map((c) => c.label);
  const rows = items.map((i) =>
    cols.map((c) => `"${getCellValue(i, c.fieldId).replace(/"/g, '""')}"`).join(','),
  );
  const csv = [headers.join(','), ...rows].join('\n');
  downloadFile(`${title || 'work-items'}.csv`, csv, 'text/csv');
}

function exportXLSX(items: UWVItem[], cols: UWVColumn[], title: string) {
  const wb = XLSX.utils.book_new();

  // Sheet 1 — visible columns
  const sheet1Data = [
    cols.map((c) => c.label),
    ...items.map((i) => cols.map((c) => getCellValue(i, c.fieldId))),
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(sheet1Data), 'Work Items');

  // Sheet 2 — hierarchy view (parent → child sorted)
  const sorted = [...items].sort((a, b) => {
    const aParent = a.parentKey ?? a.key;
    const bParent = b.parentKey ?? b.key;
    if (aParent !== bParent) return aParent.localeCompare(bParent);
    return (a.level ?? 0) - (b.level ?? 0);
  });
  const sheet2Data = [
    ['Level', 'Parent', 'Key', 'Summary', 'Type', 'Status', 'Assignee', 'Hub', 'Due', 'Created', 'Updated'],
    ...sorted.map((i) => [
      i.level ?? 0,
      i.parentKey ?? '',
      i.key,
      i.summary,
      i.issueType,
      i.status,
      i.assigneeName ?? '',
      hubLabel(i.hubSource),
      formatDate(i.dueDate),
      formatDate(i.created),
      formatDate(i.updated),
    ]),
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(sheet2Data), 'Hierarchy');

  XLSX.writeFile(wb, `${title || 'work-items'}.xlsx`);
}

// Inline download icon
function DownloadIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 4v12m0 0l-4-4m4 4l4-4M4 20h16"
        stroke="#42526E"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function UWVExport({ items, columns, title }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const visibleCols = columns.filter((c) => c.visible);

  return (
    <Popup
      isOpen={isOpen}
      onClose={() => setIsOpen(false)}
      placement="bottom-end"
      content={() => (
        <div
          style={{
            width: 240,
            padding: 8,
            background: '#FFFFFF',
            border: '1px solid #DFE1E6',
            borderRadius: 6,
            boxShadow: '0 8px 24px rgba(9,30,66,0.16)',
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
          }}
        >
          <Button
            appearance="subtle"
            shouldFitContainer
            onClick={() => {
              exportCSV(items, visibleCols, title);
              setIsOpen(false);
            }}
          >
            CSV — visible columns
          </Button>
          <Button
            appearance="subtle"
            shouldFitContainer
            onClick={() => {
              exportCSV(items, DEFAULT_COLUMNS, title);
              setIsOpen(false);
            }}
          >
            CSV — all fields
          </Button>
          <Button
            appearance="subtle"
            shouldFitContainer
            onClick={() => {
              exportXLSX(items, visibleCols, title);
              setIsOpen(false);
            }}
          >
            Excel (.xlsx)
          </Button>
        </div>
      )}
      trigger={(triggerProps) => (
        <Button
          {...triggerProps}
          appearance="subtle"
          iconBefore={DownloadIcon as any}
          onClick={() => setIsOpen((v) => !v)}
        >
          Export
        </Button>
      )}
    />
  );
}
