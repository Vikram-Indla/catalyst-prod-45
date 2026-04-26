/**
 * widget-pdf — capture a dashboard widget as a printable PDF.
 *
 * Implementation: html2canvas snapshots the widget body, jsPDF writes a
 * letter-size landscape page with a Catalyst header (title + project +
 * generated-at) and embeds the snapshot proportionally to fit.
 *
 * Why html2canvas instead of structured layout? Generic. Every widget
 * (DynamicTable, charts, workload bars, narrative feed) snapshots the
 * same way without per-widget formatters. Trade-off: the PDF is a raster
 * image, not selectable text. Acceptable for the executive print/share
 * use case; if any widget needs structured PDF later, swap in
 * jspdf-autotable on top of this helper.
 */
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface DownloadOptions {
  /** Widget title used in the PDF header + filename. */
  title: string;
  /** Project key, e.g. "BAU". Shown in header. */
  projectKey?: string;
  /** Optional subtitle line under the title. */
  subtitle?: string;
}

const HEADER_HEIGHT_MM = 22;
const PAGE_MARGIN_MM = 12;
const HEADER_PRIMARY = '#172B4D';
const HEADER_SUBTLE = '#505258';
const BRAND_BLUE = '#0C66E4';

export async function downloadWidgetAsPdf(
  el: HTMLElement | null,
  { title, projectKey, subtitle }: DownloadOptions,
): Promise<void> {
  if (!el) {
    console.warn('[widget-pdf] no element passed to downloadWidgetAsPdf');
    return;
  }

  // 2× scale gives crisp text on retina without blowing up file size.
  // Background white so dark-mode users get a readable export.
  const canvas = await html2canvas(el, {
    scale: 2,
    backgroundColor: '#FFFFFF',
    logging: false,
    useCORS: true,
  });

  // Letter landscape — best fit for wide tables and dashboards.
  const pdf = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'letter',
  });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();

  // ---- Header band ----
  // Brand stripe (4mm tall) at the very top to anchor the page.
  pdf.setFillColor(BRAND_BLUE);
  pdf.rect(0, 0, pageW, 4, 'F');

  // Title
  pdf.setTextColor(HEADER_PRIMARY);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(16);
  pdf.text(title, PAGE_MARGIN_MM, 12);

  // Subtitle / project / timestamp
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  pdf.setTextColor(HEADER_SUBTLE);
  const parts: string[] = [];
  if (projectKey) parts.push(`Project ${projectKey}`);
  if (subtitle) parts.push(subtitle);
  parts.push(
    `Generated ${new Date().toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })}`,
  );
  pdf.text(parts.join('  ·  '), PAGE_MARGIN_MM, 18);

  // Right-aligned "Catalyst" wordmark
  pdf.setFontSize(9);
  pdf.setTextColor(HEADER_SUBTLE);
  pdf.text('Catalyst', pageW - PAGE_MARGIN_MM, 12, { align: 'right' });

  // ---- Snapshot ----
  // Available area below the header.
  const availW = pageW - 2 * PAGE_MARGIN_MM;
  const availH = pageH - HEADER_HEIGHT_MM - PAGE_MARGIN_MM;
  const ratio = canvas.width / canvas.height;
  let drawW = availW;
  let drawH = drawW / ratio;
  if (drawH > availH) {
    drawH = availH;
    drawW = drawH * ratio;
  }
  const drawX = (pageW - drawW) / 2;
  const drawY = HEADER_HEIGHT_MM;

  pdf.addImage(canvas.toDataURL('image/png'), 'PNG', drawX, drawY, drawW, drawH);

  // ---- Filename ----
  // catalyst-{projectKey?}-{slug-title}-{YYYYMMDD}.pdf
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const project = projectKey ? `${projectKey.toLowerCase()}-` : '';
  pdf.save(`catalyst-${project}${slug}-${stamp}.pdf`);
}
