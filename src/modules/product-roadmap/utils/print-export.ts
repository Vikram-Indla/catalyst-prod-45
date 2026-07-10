/**
 * Print/PDF Export utility — opens a print-optimized page
 */

import type { RoadmapDemand } from '../types/roadmap';
import { format, parseISO } from 'date-fns';

const STATUS_PRINT_COLORS: Record<string, { bg: string; c: string }> = {
  new_request: { bg: 'var(--ds-background-information-bold)', c: 'var(--ds-text-brand, var(--cp-workstream-catalyst-primary))' },
  draft: { bg: 'rgba(115,115,115,0.12)', c: 'var(--ds-text-subtlest, var(--ds-text-subtlest))' },
  submitted: { bg: 'var(--ds-background-information-bold)', c: 'var(--ds-text-brand, var(--cp-workstream-catalyst-primary))' },
  in_review: { bg: 'var(--ds-background-warning-bold)', c: 'var(--ds-text-warning, var(--cp-warning))' },
  approved: { bg: 'var(--ds-background-success-bold)', c: 'var(--ds-background-success-bold, var(--ds-background-success-bold))' },
  rejected: { bg: 'var(--ds-background-danger)', c: 'var(--ds-text-danger, var(--cp-danger))' },
  in_progress: { bg: 'var(--ds-background-discovery-bold)', c: 'var(--cp-purple-60)' },
  completed: { bg: 'rgba(21,128,61,0.12)', c: 'var(--ds-background-success-bold, var(--ds-background-success-bold))' },
  cancelled: { bg: 'var(--ds-background-danger-bold)', c: 'var(--ds-text-danger, var(--cp-danger))' },
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
      <td style="font-family:monospace;color:var(--ds-text-brand, var(--cp-workstream-catalyst-primary));font-weight:600">${item.request_key || '—'}</td>
      <td style="font-weight:500;max-width:280px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${item.title}</td>
      <td><span style="display:inline-block;padding:0px 8px;border-radius:10px;font-size:10px;font-weight:600;background:${sc.bg};color:${sc.c}">${status.replace(/_/g, ' ')}</span></td>
      <td>${(item as any).owner_name || '—'}</td>
      <td style="font-family:monospace;font-size:11px">${fdf(item.start_date)}</td>
      <td style="font-family:monospace;font-size:11px">${fdf(item.end_date)}</td>
      <td style="font-weight:500">${item.priority_tier || '—'}</td>
      <td>
        <div style="display:flex;align-items:center;gap:4px">
          <div style="flex:1;height:4px;background:var(--ds-surface-sunken, var(--cp-bg-sunken, var(--cp-bg-sunken)));border-radius:999px;overflow:hidden;min-width:50px">
            <div style="width:${item.progress}%;height:100%;background:var(--ds-text-brand, var(--cp-workstream-catalyst-primary));border-radius:999px"></div>
          </div>
          <span style="font-size:11px;font-weight:600;color:var(--cp-ink-2, var(--cp-ink-2, var(--cp-ink-2)));min-width:32px">${item.progress}%</span>
        </div>
      </td>
    </tr>`;
  }).join('');

  const now = format(new Date(), 'MMM d, yyyy · HH:mm');

  pw.document.write(`<!DOCTYPE html>
<html><head><title>Product Roadmap</title>
<style>
* { box-sizing: border-box; margin: 0 }
body { font-family: system-ui, -apple-system, sans-serif; color: var(--ds-text); padding: 40px; -webkit-print-color-adjust: exact; print-color-adjust: exact }
@page { size: landscape; margin: 16mm }
table { width: 100%; border-collapse: collapse; font-size: 12px }
th { text-align: left; padding: 8px 10px; border-bottom: 0px solid var(--ds-border); font-size: 10px; font-weight: 700; color: var(--ds-text-subtlest); text-transform: uppercase; letter-spacing: 0.06em; background: var(--ds-surface-sunken) }
td { padding: 8px 10px; border-bottom: 0px solid var(--ds-surface-sunken) }
tr:hover { background: var(--ds-surface-sunken) }
</style>
</head><body>
<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:32px">
  <div>
    <h1 style="font-size:24px;font-weight:700;margin-bottom:4px">Product Roadmap</h1>
    <p style="color:var(--ds-text-subtlest);font-size:13px">Catalyst Platform — ${now}</p>
  </div>
  <div style="text-align:right">
    <span style="font-family:monospace;font-size:36px;font-weight:700;color:var(--ds-link)">${items.length}</span>
    <div style="font-size:11px;color:var(--ds-text-subtlest);font-weight:500">BUSINESS REQUESTS</div>
  </div>
</div>
<table>
  <thead><tr>
    <th>ID</th><th>Title</th><th>Status</th><th>Assignee</th><th>Start</th><th>End</th><th>Priority</th><th>Progress</th>
  </tr></thead>
  <tbody>${rows}</tbody>
</table>
<div style="margin-top:32px;padding-top:16px;border-top:0px solid var(--ds-border);display:flex;justify-content:space-between;font-size:10px;color:#A1A1AA">
  <span>Catalyst V11 · Product Roadmap V9</span>
  <span>${now}</span>
</div>
</body></html>`);
  pw.document.close();
  setTimeout(() => pw.print(), 500);
  return true;
}
