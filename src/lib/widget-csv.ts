/**
 * widget-csv — extract table contents from a rendered widget body and
 * download as a UTF-8 CSV file.
 *
 * Strategy: walk the first <table> inside the body element. Read thead
 * th text for headers, then each tbody tr's td text for rows. Cell text
 * comes from `cell.textContent` trimmed; multi-line content gets
 * collapsed to a single line. Quotes/commas/newlines are escaped per
 * RFC 4180.
 *
 * For widgets without a <table> (bespoke div rows), returns false.
 */

function csvEscape(value: string): string {
  // Collapse whitespace runs to a single space so multi-line cells
  // render cleanly on one CSV line.
  const flat = value.replace(/\s+/g, ' ').trim();
  if (/[",\n\r]/.test(flat)) {
    return `"${flat.replace(/"/g, '""')}"`;
  }
  return flat;
}

function downloadBlob(content: string, filename: string) {
  const blob = new Blob(['﻿' + content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function downloadWidgetAsCsv(
  bodyEl: HTMLElement,
  opts: { title: string; subtitle?: string },
): boolean {
  const table = bodyEl.querySelector('table');
  if (!table) return false;

  const headers: string[] = Array.from(table.querySelectorAll('thead th')).map(
    (th) => (th as HTMLElement).innerText || th.textContent || '',
  );
  const rows: string[][] = Array.from(table.querySelectorAll('tbody tr')).map((tr) =>
    Array.from(tr.querySelectorAll('td')).map(
      (td) => (td as HTMLElement).innerText || td.textContent || '',
    ),
  );

  if (rows.length === 0 && headers.length === 0) return false;

  const lines: string[] = [];
  if (headers.length > 0) lines.push(headers.map(csvEscape).join(','));
  for (const row of rows) lines.push(row.map(csvEscape).join(','));

  const filename = `${opts.title.replace(/[^a-z0-9_-]+/gi, '_')}_${new Date()
    .toISOString()
    .slice(0, 10)}.csv`;
  downloadBlob(lines.join('\r\n'), filename);
  return true;
}
