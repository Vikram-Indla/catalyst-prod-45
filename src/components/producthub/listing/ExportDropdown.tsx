/**
 * ExportDropdown — CSV/Excel export for initiative data
 * Catalyst V5 Design System
 */

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { FileText, FileSpreadsheet } from 'lucide-react';
import { format } from 'date-fns';
import type { Initiative } from '@/types/initiative';
import { STATUS_DISPLAY } from '@/types/initiative';
import { catalystToast } from '@/lib/catalystToast';

interface ExportDropdownProps {
  data: Initiative[];
  anchorRef: React.RefObject<HTMLButtonElement | null>;
  isOpen: boolean;
  onClose: () => void;
}

function initiativeToRow(i: Initiative): Record<string, string | number> {
  return {
    ID: i.initiative_key,
    Title: i.title,
    Status: STATUS_DISPLAY[i.status]?.label ?? i.status,
    Score: i.computed_score?.toFixed(1) ?? '',
    Assignee: i.assignee_name ?? '',
    Department: i.department_name ?? '',
    Quarter: i.target_quarter ?? '',
    'Kickoff Date': i.kickoff_date ? format(new Date(i.kickoff_date), 'yyyy-MM-dd') : '',
    'Target Date': i.target_complete ? format(new Date(i.target_complete), 'yyyy-MM-dd') : '',
    Progress: i.progress,
  };
}

function exportCSV(data: Initiative[]) {
  const rows = data.map(initiativeToRow);
  if (rows.length === 0) return;
  const headers = Object.keys(rows[0]);
  const csvRows = [
    headers.join(','),
    ...rows.map(r => headers.map(h => {
      const val = String(r[h] ?? '');
      return val.includes(',') || val.includes('"') ? `"${val.replace(/"/g, '""')}"` : val;
    }).join(',')),
  ];
  const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `initiatives-export-${format(new Date(), 'yyyy-MM-dd')}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  catalystToast.success('CSV exported successfully');
}

async function exportExcel(data: Initiative[]) {
  try {
    const XLSX = await import('xlsx');
    const rows = data.map(initiativeToRow);
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Initiatives');
    XLSX.writeFile(wb, `initiatives-export-${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
    catalystToast.success('Excel exported successfully');
  } catch {
    // Fallback to CSV
    exportCSV(data);
  }
}

export function ExportDropdown({ data, anchorRef, isOpen, onClose }: ExportDropdownProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node) &&
          anchorRef.current && !anchorRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const keyHandler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('mousedown', handler);
    document.addEventListener('keydown', keyHandler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('keydown', keyHandler);
    };
  }, [isOpen, onClose, anchorRef]);

  if (!isOpen) return null;
  const anchorRect = anchorRef.current?.getBoundingClientRect();
  if (!anchorRect) return null;

  return createPortal(
    <div
      ref={panelRef}
      className="fixed bg-white border rounded-lg p-1 z-[300]"
      style={{
        top: anchorRect.bottom + 4,
        left: anchorRect.right - 160,
        width: 160,
        borderColor: '#e4e4e7',
        boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
      }}
    >
      <button
        type="button"
        onClick={() => { exportCSV(data); onClose(); }}
        className="w-full h-8 px-3 flex items-center gap-2 text-[13px] rounded-md hover:bg-zinc-50 transition-colors"
        style={{ color: '#3f3f46' }}
      >
        <FileText size={14} className="text-zinc-400" />
        Export as CSV
      </button>
      <button
        type="button"
        onClick={() => { exportExcel(data); onClose(); }}
        className="w-full h-8 px-3 flex items-center gap-2 text-[13px] rounded-md hover:bg-zinc-50 transition-colors"
        style={{ color: '#3f3f46' }}
      >
        <FileSpreadsheet size={14} className="text-zinc-400" />
        Export as Excel
      </button>
    </div>,
    document.body
  );
}
