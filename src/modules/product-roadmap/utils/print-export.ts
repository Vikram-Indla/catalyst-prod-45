/**
 * Print/PDF Export utility — opens a print-optimized page
 */

import type { RoadmapDemand } from '../types/roadmap';
import { format, parseISO } from 'date-fns';

const STATUS_PRINT_COLORS: Record<string, { bg: string; c: string }> = {
  new_request: { bg: 'rgba(59,130,246,0.12)', c: 'var(--ds-text-brand, var(--ds-text-brand, #2563EB))' },
  draft: { bg: 'rgba(115,115,115,0.12)', c: '#737373' },
  submitted: { bg: 'rgba(59,130,246,0.12)', c: 'var(--ds-text-brand, var(--ds-text-brand, #2563EB))' },
  in_review: { bg: 'rgba(245,158,11,0.12)', c: 'var(--ds-text-warning, var(--ds-text-warning, #D97706))' },
  approved: { bg: 'rgba(34,197,94,0.12)', c: '#15803D' },
  rejected: { bg: 'rgba(239,68,68,0.12)', c: 'var(--ds-text-danger, var(--ds-text-danger, #DC2626))' },
  in_progress: { bg: 'rgba(139,92,246,0.12)', c: '#7C3AED' },
  completed: { bg: 'rgba(21,128,61,0.12)', c: '#15803D' },
  cancelled: { bg: 'rgba(220,38,38,0.12)', c: 'var(--ds-text-danger, var(--ds-text-danger, #DC2626))' },
};

function fdf(dateStr: string | null): string {
  if (!dateStr) return '—';
  try { return format(parseISO(dateStr), 'MMM d, yyyy'); } catch { return dateStr; }
}

export function doPrintExport(items: RoadmapDemand[]) {
  const pw = window.open('', '_blank', 'width=1200,height=800');
  if (!pw) return false;

  const rows = items.map(item => {
    const status = item.process_step || 'draft';
    const sc = STATUS_PRINT_COLORS[status] || STATUS_PRINT_COLORS.draft;
    return `<tr>
      <td style="font-family:monospace;color:var(--ds-text-brand, #2563EB);font-weight:600">${item.request_key || '—'}</td>
      <td style="font-weight:500;max-width:280px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${item.title}</td>
      <td><span style="display:inline-block;padding:2px 8px;border-radius:10px;font-size:10px;font-weight:600;background:${sc.bg};color:${sc.c}">${status.replace(/_/g, ' ')}</span></td>
      <td>${(item as any).owner_name || '—'}</td>
      <td style="font-family:monospace;font-size:11px">${fdf(item.start_date)}</td>
      <td style="font-family:monospace;font-size:11px">${fdf(item.end_date)}</td>
      <td style="font-weight:500">${item.priority_tier || '—'}</td>
      <td>
        <div style="display:flex;align-items:center;gap:6px">
          <div style="flex:1;height:4px;background:var(--ds-surface-sunken, #F1F5F9);border-radius:999px;overflow:hidden;min-width:50px">
            <div style="width:${item.progress}%;height:100%;background:var(--ds-text-brand, #2563EB);border-radius:999px"></div>
          </div>
          <span style="font-size:11px;font-weight:600;color:var(--ds-text-subtle, #334155);min-width:32px">${item.progress}%</span>
        </div>
      </td>
    </tr>`;
  }).join('');

  const now = format(new Date(), 'MMM d, yyyy · HH:mm');

  pw.document.write(`<!DOCTYPE html>
<html><head><title>Product Roadmap</title>
<style>
* { box-sizing: border-box; margin: 0 }
body { font-family: system-ui, -apple-system, sans-serif; color: #09090B; padding: 40px; -webkit-print-color-adjust: exact; print-color-adjust: exact }
@page { size: landscape; margin: 20mm }
table { width: 100%; border-collapse: collapse; font-size: 12px }
th { text-align: left; padding: 8px 10px; border-bottom: 2px solid #E4E4E7; font-size: 10px; font-weight: 700; color: #71717A; text-transform: uppercase; letter-spacing: 0.06em; background: #FAFAFA }
td { padding: 8px 10px; border-bottom: 1px solid #F4F4F5 }
tr:hover { background: #FAFAFA }
</style>
</head><body>
<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:32px">
  <div>
    <h1 style="font-size:24px;font-weight:700;margin-bottom:4px">Product Roadmap</h1>
    <p style="color:#71717A;font-size:13px">Catalyst Platform — ${now}</p>
  </div>
  <div style="text-align:right">
    <span style="font-family:monospace;font-size:36px;font-weight:700;color:#2563EB">${items.length}</span>
    <div style="font-size:11px;color:#71717A;font-weight:500">BUSINESS REQUESTS</div>
  </div>
</div>
<table>
  <thead><tr>
    <th>ID</th><th>Title</th><th>Status</th><th>Assignee</th><th>Start</th><th>End</th><th>Priority</th><th>Progress</th>
  </tr></thead>
  <tbody>${rows}</tbody>
</table>
<div style="margin-top:32px;padding-top:16px;border-top:1px solid #E4E4E7;display:flex;justify-content:space-between;font-size:10px;color:#A1A1AA">
  <span>Catalyst V11 · Product Roadmap V9</span>
  <span>${now}</span>
</div>
</body></html>`);
  pw.document.close();
  setTimeout(() => pw.print(), 500);
  return true;
}
