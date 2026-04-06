/**
 * ExportWorkItems — Month-selection panel + ExcelJS generation
 * Replaces old CSV/JSON export dropdown on /project-hub/resources
 */
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Download, ChevronDown, Calendar, Loader2, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { loadExcelJS } from '@/lib/exportLoaders';
const loadFileSaver = () => import('file-saver').then(m => m.saveAs);
import { format, subMonths, addMonths, startOfMonth, endOfMonth } from 'date-fns';

/* ── Color Palette ── */
const C = {
  NAVY: '1B2A4A', DARK_BLUE: '2C3E6B', MID_BLUE: '3A5BA0',
  LIGHT_BLUE: 'D6E4F0', PALE_BLUE: 'EBF1F8', WHITE: 'FFFFFF',
  DARK_GRAY: '3C3C3C', MED_GRAY: '6B6B6B', BORDER: 'D0DCE8',
};

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  "Done": { bg: "E8F5E9", text: "1B5E20" }, "In Production": { bg: "E8F5E9", text: "1B5E20" },
  "Closed": { bg: "E8F5E9", text: "1B5E20" }, "Resolved": { bg: "E8F5E9", text: "1B5E20" },
  "In QA": { bg: "E3F2FD", text: "0D47A1" }, "Internal QA": { bg: "E3F2FD", text: "0D47A1" },
  "Ready for QA": { bg: "E3F2FD", text: "0D47A1" }, "Staging/QA": { bg: "E3F2FD", text: "0D47A1" },
  "End to End Testing": { bg: "E3F2FD", text: "0D47A1" },
  "In UAT": { bg: "E8EAF6", text: "283593" }, "UAT Ready": { bg: "E8EAF6", text: "283593" },
  "BETA READY": { bg: "E8EAF6", text: "283593" },
  "In Progress": { bg: "FFF3E0", text: "E65100" }, "In-Progress": { bg: "FFF3E0", text: "E65100" },
  "In Development": { bg: "FFF3E0", text: "E65100" }, "Under Implementation": { bg: "FFF3E0", text: "E65100" },
  "Ready for Development": { bg: "FFF8E1", text: "F57F17" }, "Ready for implementation": { bg: "FFF8E1", text: "F57F17" },
  "In Design": { bg: "FFF8E1", text: "F57F17" }, "In Requirements": { bg: "FFF8E1", text: "F57F17" },
  "BRD Preparation": { bg: "FFF8E1", text: "F57F17" }, "BRD Sign Off": { bg: "FFF8E1", text: "F57F17" },
  "Technical validation": { bg: "FFF8E1", text: "F57F17" }, "Review": { bg: "FFF8E1", text: "F57F17" },
  "Implementation Review": { bg: "FFF8E1", text: "F57F17" },
  "Backlog": { bg: "F3E5F5", text: "6A1B9A" }, "BRD Backlog": { bg: "F3E5F5", text: "6A1B9A" },
  "ToDo": { bg: "F3E5F5", text: "6A1B9A" },
  "Blocked": { bg: "FFEBEE", text: "B71C1C" }, "Canceled": { bg: "FFEBEE", text: "B71C1C" },
  "Rejected": { bg: "FFEBEE", text: "B71C1C" }, "Re-Open": { bg: "FFEBEE", text: "B71C1C" },
  "Retest": { bg: "FFEBEE", text: "B71C1C" },
  "In Support": { bg: "ECEFF1", text: "37474F" }, "Awaiting Info": { bg: "ECEFF1", text: "37474F" },
};

const PRIORITY_STYLE: Record<string, { color: string; bold: boolean }> = {
  "Highest": { color: "B71C1C", bold: true }, "High": { color: "E65100", bold: true },
  "Medium": { color: "455A64", bold: false }, "Low": { color: "78909C", bold: false },
  "Lowest": { color: "90A4AE", bold: false },
};

const DEFAULT_STATUS = { bg: "ECEFF1", text: "37474F" };

/* ── Helpers ── */
const argb = (hex: string) => `FF${hex}`;
const thinBorder = (): any => ({ style: 'thin', color: { argb: argb(C.BORDER) } });
const allThinBorders = () => ({ top: thinBorder(), bottom: thinBorder(), left: thinBorder(), right: thinBorder() });

const arialFont = (size: number, opts?: any): any => ({
  name: 'Arial', size, ...opts,
});

function fmtDate(d: string | null) {
  if (!d) return '—';
  try { return format(new Date(d), 'dd MMM yyyy'); } catch { return d; }
}

/* ── Month option builder ── */
function getMonthOptions() {
  const now = new Date();
  return [-3, -2, -1, 0, 1].map(offset => {
    const d = offset < 0 ? subMonths(now, Math.abs(offset)) : offset > 0 ? addMonths(now, offset) : now;
    return {
      offset,
      label: format(d, 'MMMM yyyy'),
      start: startOfMonth(d),
      end: endOfMonth(d),
      isCurrent: offset === 0,
      isFuture: offset > 0,
    };
  });
}

/* ── Excel generation ── */
async function generateExcel(selectedMonths: { label: string; start: Date; end: Date }[], deptFilter: string) {
  const ExcelJS = await loadExcelJS();
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Catalyst Platform';
  wb.created = new Date();

  // ── SHEET 1: Resources ──
  let query = supabase
    .from('resource_inventory')
    .select('rid, name, role_name, department_name, department_id, assignments, location_id, vendor_name, resource_type')
    .eq('is_active', true)
    .order('name', { ascending: true })
    .limit(5000);

  // Filter by department if not "All"
  if (deptFilter && deptFilter !== 'All') {
    // department_name matches the filter
    query = query.eq('department_name', deptFilter);
  }

  const { data: resData } = await query;

  const { data: locs } = await supabase.from('resource_locations').select('id, name');
  const locMap = new Map((locs || []).map((l: any) => [l.id, l.name]));

  const resources = (resData || []) as any[];
  const ws1 = wb.addWorksheet('Resources', {
    properties: { showGridLines: false },
    pageSetup: { orientation: 'landscape', paperSize: 9, fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  });
  (ws1 as any).tabColor = { argb: 'FF16A34A' };

  // Title row
  ws1.mergeCells('A1:H1');
  const titleCell = ws1.getCell('A1');
  titleCell.value = `${deptFilter && deptFilter !== 'All' ? deptFilter : 'All Departments'} — Resource Directory`;
  titleCell.font = arialFont(16, { bold: true, color: { argb: argb(C.WHITE) } });
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: argb(C.NAVY) } };
  titleCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  ws1.getRow(1).height = 40;

  // Subtitle row
  ws1.mergeCells('A2:D2');
  const sub1 = ws1.getCell('A2');
  sub1.value = `Generated: ${format(new Date(), 'dd MMMM yyyy, HH:mm')}`;
  sub1.font = arialFont(9, { italic: true, color: { argb: argb(C.MED_GRAY) } });
  sub1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: argb(C.PALE_BLUE) } };
  sub1.alignment = { vertical: 'middle', indent: 1 };

  ws1.mergeCells('E2:H2');
  const sub2 = ws1.getCell('E2');
  sub2.value = `Total: ${resources.length} resources`;
  sub2.font = arialFont(9, { bold: true, color: { argb: argb(C.DARK_BLUE) } });
  sub2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: argb(C.PALE_BLUE) } };
  sub2.alignment = { vertical: 'middle', horizontal: 'right' };
  ws1.getRow(2).height = 24;

  // Spacer
  ws1.getRow(3).height = 6;

  // Column headers
  const resCols = ['#', 'RID', 'Resource Name', 'Job Role', 'Department', 'Assignment', 'Location', 'Vendor'];
  const resWidths = [6, 10, 24, 20, 14, 24, 12, 14];
  const resCenter = [true, true, false, false, true, false, true, true];
  
  resCols.forEach((h, i) => {
    const cell = ws1.getCell(4, i + 1);
    cell.value = h;
    cell.font = arialFont(9, { bold: true, color: { argb: argb(C.NAVY) } });
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: argb(C.LIGHT_BLUE) } };
    cell.alignment = { vertical: 'middle', horizontal: resCenter[i] ? 'center' : 'left' };
    cell.border = {
      ...allThinBorders(),
      bottom: { style: 'medium', color: { argb: argb(C.MID_BLUE) } },
    };
  });
  ws1.getRow(4).height = 24;

  resWidths.forEach((w, i) => { ws1.getColumn(i + 1).width = w; });

  // Data rows
  resources.forEach((r: any, idx: number) => {
    const row = ws1.getRow(5 + idx);
    row.height = 22;
    const isEven = idx % 2 === 1;
    const bg = isEven ? C.PALE_BLUE : C.WHITE;
    const loc = locMap.get(r.location_id) || '';
    const vals = [idx + 1, r.rid, r.name, r.role_name || '—', r.department_name || '—', r.assignments || '—', loc || '—', r.vendor_name || '—'];

    vals.forEach((v, ci) => {
      const cell = row.getCell(ci + 1);
      cell.value = v;
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: argb(bg) } };
      cell.border = allThinBorders();
      cell.alignment = { vertical: 'middle', horizontal: resCenter[ci] ? 'center' : 'left' };

      if (ci === 0 || ci === 1) {
        cell.font = arialFont(9, { color: { argb: argb(C.MED_GRAY) } });
      } else if (ci === 2) {
        cell.font = arialFont(9, { bold: true, color: { argb: argb(C.DARK_GRAY) } });
      } else if (ci === 6) {
        const isOnsite = String(v).toLowerCase() === 'onsite';
        cell.font = arialFont(9, { bold: true, color: { argb: argb(isOnsite ? '16A34A' : v === '—' ? C.MED_GRAY : 'EA580C') } });
      } else if (ci === 7) {
        cell.font = arialFont(9, { color: { argb: argb(v === '—' ? C.MED_GRAY : C.DARK_GRAY) } });
      } else {
        cell.font = arialFont(9, { color: { argb: argb(C.DARK_GRAY) } });
      }
    });
  });

  ws1.views = [{ state: 'frozen', ySplit: 4, xSplit: 0 }];

  // ── SHEET 2+: Monthly Work Items ──
  const tabColors = [C.NAVY, C.MID_BLUE, '4A6FA5', C.MID_BLUE, C.NAVY];

  for (let mi = 0; mi < selectedMonths.length; mi++) {
    const m = selectedMonths[mi];
    const startISO = m.start.toISOString();
    const endISO = m.end.toISOString();

    // Build the list of resource names (lowercased) for department filtering
    const resourceNamesLower = new Set(
      resources.map((r: any) => (r.name || '').toLowerCase()).filter(Boolean)
    );

    let issueQuery = supabase
      .from('ph_issues')
      .select('issue_key, project_key, project_name, issue_type, summary, status, assignee_display_name, priority, jira_created_at, jira_updated_at, parent_key, parent_summary')
      .gte('jira_updated_at', startISO)
      .lte('jira_updated_at', endISO)
      .order('assignee_display_name', { ascending: true })
      .order('issue_key', { ascending: true })
      .limit(5000);

    const { data: items } = await issueQuery;

    // Case-insensitive department filtering on the client side
    let allItems = (items || []) as any[];
    if (deptFilter && deptFilter !== 'All' && resourceNamesLower.size > 0) {
      allItems = allItems.filter((item: any) =>
        resourceNamesLower.has((item.assignee_display_name || '').toLowerCase())
      );
    }

    // Group by assignee
    const grouped = new Map<string, any[]>();
    for (const item of allItems) {
      const name = item.assignee_display_name || 'Unassigned';
      if (!grouped.has(name)) grouped.set(name, []);
      grouped.get(name)!.push(item);
    }
    const sortedAssignees = [...grouped.keys()].sort((a, b) => {
      if (a === 'Unassigned') return 1;
      if (b === 'Unassigned') return -1;
      return a.localeCompare(b);
    });

    const ws = wb.addWorksheet(m.label, {
      properties: { showGridLines: false },
      pageSetup: { orientation: 'landscape', paperSize: 9, fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
    });
    (ws as any).tabColor = { argb: `FF${tabColors[mi % tabColors.length]}` };

    const wCols = [6, 14, 10, 16, 58, 22, 11, 14, 14, 52];
    wCols.forEach((w, i) => { ws.getColumn(i + 1).width = w; });

    // Title
    ws.mergeCells('A1:J1');
    const t = ws.getCell('A1');
    t.value = `${deptFilter && deptFilter !== 'All' ? deptFilter : 'All Departments'} — ${m.label}`;
    t.font = arialFont(16, { bold: true, color: { argb: argb(C.WHITE) } });
    t.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: argb(C.NAVY) } };
    t.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
    ws.getRow(1).height = 40;

    // Subtitle
    ws.mergeCells('A2:E2');
    const s1 = ws.getCell('A2');
    s1.value = `Generated: ${format(new Date(), 'dd MMMM yyyy, HH:mm')}`;
    s1.font = arialFont(9, { italic: true, color: { argb: argb(C.MED_GRAY) } });
    s1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: argb(C.PALE_BLUE) } };
    s1.alignment = { vertical: 'middle', indent: 1 };

    ws.mergeCells('F2:J2');
    const s2 = ws.getCell('F2');
    s2.value = `Total: ${allItems.length} items  |  ${sortedAssignees.length} assignees`;
    s2.font = arialFont(9, { bold: true, color: { argb: argb(C.DARK_BLUE) } });
    s2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: argb(C.PALE_BLUE) } };
    s2.alignment = { vertical: 'middle', horizontal: 'right' };
    ws.getRow(2).height = 24;

    ws.getRow(3).height = 6;

    let rowIdx = 4;
    let globalNum = 0;
    const colHeaders = ['#', 'Key', 'Project', 'Type', 'Title', 'Status', 'Priority', 'Created', 'Updated', 'Parent'];
    const colCenter = [true, false, true, true, false, true, true, true, true, false];

    for (const assignee of sortedAssignees) {
      const assigneeItems = grouped.get(assignee)!;

      // Spacer
      ws.getRow(rowIdx).height = 8;
      rowIdx++;

      // Group header
      ws.mergeCells(rowIdx, 1, rowIdx, 10);
      const gh = ws.getCell(rowIdx, 1);
      gh.value = `  ${assignee}  (${assigneeItems.length} items)`;
      gh.font = arialFont(11, { bold: true, color: { argb: argb(C.WHITE) } });
      gh.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: argb(C.DARK_BLUE) } };
      gh.alignment = { vertical: 'middle' };
      gh.border = { bottom: { style: 'medium', color: { argb: argb(C.NAVY) } } };
      ws.getRow(rowIdx).height = 30;
      rowIdx++;

      // Column headers
      colHeaders.forEach((h, ci) => {
        const cell = ws.getCell(rowIdx, ci + 1);
        cell.value = h;
        cell.font = arialFont(9, { bold: true, color: { argb: argb(C.NAVY) } });
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: argb(C.LIGHT_BLUE) } };
        cell.alignment = { vertical: 'middle', horizontal: colCenter[ci] ? 'center' : 'left' };
        cell.border = { ...allThinBorders(), bottom: { style: 'medium', color: { argb: argb(C.MID_BLUE) } } };
      });
      ws.getRow(rowIdx).height = 24;
      rowIdx++;

      // Data rows
      for (const item of assigneeItems) {
        globalNum++;
        const row = ws.getRow(rowIdx);
        row.height = 22;
        const isEven = globalNum % 2 === 0;
        const bg = isEven ? C.PALE_BLUE : C.WHITE;
        const parentDisplay = [item.parent_key, item.parent_summary].filter(Boolean).join(' — ') || '—';

        const vals = [
          globalNum,
          item.issue_key || '—',
          item.project_key || item.project_name || '—',
          item.issue_type || '—',
          item.summary || '—',
          item.status || '—',
          item.priority || '—',
          fmtDate(item.jira_created_at),
          fmtDate(item.jira_updated_at),
          parentDisplay,
        ];

        vals.forEach((v, ci) => {
          const cell = row.getCell(ci + 1);
          cell.value = v;
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: argb(bg) } };
          cell.border = allThinBorders();
          cell.alignment = {
            vertical: 'middle',
            horizontal: colCenter[ci] ? 'center' : 'left',
            wrapText: ci === 4 || ci === 9,
          };

          // Column-specific styling
          if (ci === 0) {
            cell.font = arialFont(9, { color: { argb: argb(C.MED_GRAY) } });
          } else if (ci === 1) {
            cell.font = arialFont(9, { bold: true, color: { argb: argb(C.MID_BLUE) } });
          } else if (ci === 5) {
            // Status color-coding
            const sc = STATUS_COLORS[String(v)] || DEFAULT_STATUS;
            cell.font = arialFont(9, { bold: true, color: { argb: argb(sc.text) } });
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: argb(sc.bg) } };
          } else if (ci === 6) {
            // Priority
            const ps = PRIORITY_STYLE[String(v)] || { color: C.DARK_GRAY, bold: false };
            cell.font = arialFont(9, { bold: ps.bold, color: { argb: argb(ps.color) } });
          } else if (ci === 7 || ci === 8) {
            cell.font = arialFont(9, { color: { argb: argb(C.MED_GRAY) } });
          } else if (ci === 9) {
            cell.font = arialFont(9, { color: { argb: argb(C.MED_GRAY) } });
          } else {
            cell.font = arialFont(9, { color: { argb: argb(C.DARK_GRAY) } });
          }
        });
        rowIdx++;
      }
    }

    ws.views = [{ state: 'frozen', ySplit: 3, xSplit: 0 }];
  }

  // Download
  const buffer = await wb.xlsx.writeBuffer();
  const today = format(new Date(), 'yyyy-MM-dd');
  const saveAs = await loadFileSaver();
  saveAs(new Blob([buffer as BlobPart]), `Delivery-Work-Items-${today}.xlsx`);
}

/* ── UI Component ── */
type GenState = 'idle' | 'generating' | 'done';

function useIsDark() {
  return typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
}

export default function ExportWorkItems({ deptFilter }: { deptFilter: string }) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [showCustom, setShowCustom] = useState(false);
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [genState, setGenState] = useState<GenState>('idle');
  const ref = useRef<HTMLDivElement>(null);
  const dk = useIsDark();

  const monthOptions = getMonthOptions();

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const toggleMonth = (offset: number) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(offset)) next.delete(offset); else next.add(offset);
      return next;
    });
    setGenState('idle');
  };

  const totalSelected = selected.size + (customFrom && customTo ? 1 : 0);
  const canGenerate = totalSelected > 0 && genState !== 'generating';

  const handleGenerate = useCallback(async () => {
    if (!canGenerate) return;
    setGenState('generating');
    try {
      toast.loading('Generating Excel report…', { id: 'export-xl' });

      const months: { label: string; start: Date; end: Date }[] = [];

      // Add selected predefined months
      for (const opt of monthOptions) {
        if (selected.has(opt.offset)) {
          months.push({ label: opt.label, start: opt.start, end: opt.end });
        }
      }

      // Add custom range if set
      if (customFrom && customTo) {
        const cfDate = new Date(customFrom + '-01');
        const ctDate = new Date(customTo + '-01');
        months.push({
          label: `${format(cfDate, 'MMM yyyy')} – ${format(ctDate, 'MMM yyyy')}`,
          start: startOfMonth(cfDate),
          end: endOfMonth(ctDate),
        });
      }

      // Sort most recent first
      months.sort((a, b) => b.start.getTime() - a.start.getTime());

      await generateExcel(months, deptFilter);
      setGenState('done');
      toast.success('Excel exported successfully', { id: 'export-xl' });

      setTimeout(() => setGenState('idle'), 3000);
    } catch (err: any) {
      setGenState('idle');
      toast.error(err.message || 'Export failed', { id: 'export-xl' });
    }
  }, [canGenerate, selected, customFrom, customTo, monthOptions, deptFilter]);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      {/* Trigger button */}
      <button
        onClick={() => { setOpen(o => !o); setGenState('idle'); }}
        style={{
          background: 'var(--bg-app)', color: 'var(--fg-2)',
          border: '1.5px solid var(--divider)', borderRadius: '8px',
          padding: '8px 14px', fontSize: '13px', fontWeight: 600,
          cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px',
          transition: 'border-color 150ms',
        }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = dk ? '#878787' : 'rgba(237,237,237,0.40)'; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = dk ? 'rgba(255,255,255,0.10)' : 'var(--bd-default, rgba(255,255,255,0.10))'; }}
      >
        <Download size={14} strokeWidth={2} />
        Export
        <ChevronDown size={13} style={{ transition: 'transform 150ms', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }} />
      </button>

      {/* Panel */}
      {open && (
        <div style={{
          position: 'absolute', top: '100%', right: 0, marginTop: 6,
          width: 330, borderRadius: 14,
          background: dk ? '#232019' : '#fff', border: `1px solid ${dk ? 'rgba(255,255,255,0.10)' : '#e5e7eb'}`,
          boxShadow: dk ? '0 12px 40px rgba(0,0,0,0.50), 0 2px 8px rgba(0,0,0,0.30)' : '0 12px 40px rgba(27,42,74,0.16), 0 2px 8px rgba(27,42,74,0.08)',
          zIndex: 50, overflow: 'hidden',
          animation: 'ewi-fadein 0.2s ease-out',
        }}>
          {/* Header */}
          <div style={{
            background: 'linear-gradient(135deg, #1d4ed8, var(--cp-blue))', padding: '14px 16px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="18" height="18" rx="2" stroke="#D6E4F0" strokeWidth="2" /><path d="M7 7h4v4H7zM13 7h4v4h-4zM7 13h4v4H7zM13 13h4v4h-4z" fill="#D6E4F0" /></svg>
              <span style={{ color: '#fff', fontSize: 14, fontWeight: 700 }}>Export Work Items</span>
            </div>
            <div style={{ color: '#D6E4F0', fontSize: 11, marginLeft: 26 }}>Select months · Sheet 1 = Resources</div>
          </div>

          {/* Month selection */}
          <div style={{ padding: '14px 16px 8px' }}>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: dk ? '#6B6560' : '#6B6B6B', letterSpacing: '0.06em', marginBottom: 10 }}>
              SELECT PERIOD
            </div>

            {monthOptions.map(opt => {
              const checked = selected.has(opt.offset);
              return (
                <label
                  key={opt.offset}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '8px 10px', borderRadius: 8, marginBottom: 4,
                    cursor: 'pointer', transition: 'background 100ms',
                    background: checked ? (dk ? 'rgba(74, 222, 128, 0.06)' : 'rgba(74,222,128,0.06)') : 'transparent',
                    border: `1.5px solid ${checked ? 'var(--sem-success)' : 'transparent'}`,
                  }}
                  onMouseEnter={e => { if (!checked) e.currentTarget.style.background = dk ? 'rgba(255,255,255,0.03)' : '#f8f9fa'; }}
                  onMouseLeave={e => { if (!checked) e.currentTarget.style.background = 'transparent'; }}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleMonth(opt.offset)}
                    style={{ display: 'none' }}
                  />
                  <div style={{
                    width: 18, height: 18, borderRadius: 4,
                    border: `2px solid ${checked ? 'var(--sem-success)' : (dk ? '#A1A1A1' : '#cbd5e1')}`,
                    background: checked ? (dk ? 'rgba(74, 222, 128, 0.15)' : '#DCFCE7') : (dk ? 'transparent' : '#fff'),
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0, transition: 'all 150ms',
                  }}>
                    {checked && <Check size={12} strokeWidth={3} color="#16A34A" />}
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 500, color: dk ? '#F5F3F0' : '#1e293b', flex: 1 }}>{opt.label}</span>
                  {opt.isCurrent && (
                    <span style={{
                      fontSize: 10, fontWeight: 700, color: '#fff',
                      background: 'var(--cp-blue)', borderRadius: 4, padding: '2px 7px',
                    }}>CURRENT</span>
                  )}
                  {opt.isFuture && (
                    <span style={{
                      fontSize: 10, fontWeight: 700, color: dk ? '#FB923C' : '#EA580C',
                      background: dk ? 'rgba(251, 191, 36, 0.10)' : '#FFF7ED', borderRadius: 4, padding: '2px 7px',
                    }}>UPCOMING</span>
                  )}
                </label>
              );
            })}

          </div>

          {/* Generate button */}
          <div style={{ padding: '8px 16px 14px' }}>
            <button
              onClick={handleGenerate}
              disabled={!canGenerate}
              style={{
                width: '100%', padding: '11px 16px', borderRadius: 8,
                border: 'none', cursor: canGenerate ? 'pointer' : 'not-allowed',
                fontSize: 13, fontWeight: 700, color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                transition: 'all 200ms',
                background: genState === 'done'
                  ? 'linear-gradient(135deg, #15803D, var(--sem-success))'
                  : totalSelected > 0
                    ? 'linear-gradient(135deg, #1d4ed8, var(--cp-blue))'
                    : 'var(--divider)',
                ...(totalSelected === 0 ? { color: 'var(--fg-4)' } : {}),
              }}
            >
              {genState === 'generating' ? (
                <><Loader2 size={15} className="animate-spin" /> Generating Report…</>
              ) : genState === 'done' ? (
                <><Check size={15} /> Download Ready</>
              ) : (
                <>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2" /><path d="M7 7h4v4H7zM13 7h4v4h-4zM7 13h4v4H7z" fill="currentColor" /></svg>
                  Generate Excel Report
                </>
              )}
            </button>
            {totalSelected > 0 && (
              <div style={{ textAlign: 'center', fontSize: 11, color: dk ? '#6B6560' : '#6B6B6B', marginTop: 6 }}>
                {totalSelected} {totalSelected === 1 ? 'month' : 'months'} selected
              </div>
            )}
          </div>

          <style>{`
            @keyframes ewi-fadein {
              from { opacity: 0; transform: translateY(-6px); }
              to { opacity: 1; transform: translateY(0); }
            }
          `}</style>
        </div>
      )}
    </div>
  );
}
