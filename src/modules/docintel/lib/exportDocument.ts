/**
 * exportDocument — offline, client-side export of the formatted translated
 * document. No network. Two paths:
 *
 *  - exportToHtml: builds a clean, standalone, RTL-aware HTML string directly
 *    from the ordered render elements (headings/paragraphs/lists/tables), with
 *    inline CSS, and downloads it as a .html file. Structure-faithful.
 *
 *  - exportToPdf: renders the ON-SCREEN formatted container (a DOM node) to a
 *    multi-page PDF via html2canvas + jsPDF. Capturing the rendered DOM is the
 *    reliable path for Arabic: the browser has already shaped/joined the glyphs
 *    and applied RTL, so the rasterised canvas preserves them faithfully — far
 *    more robust than jsPDF's own text engine, which does not shape Arabic.
 *
 * CAT-DOCINTEL-ARABIC-RAG-20260706-001
 */
import { saveAs } from "file-saver";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import type { DocintelRenderElement } from "../types";

export type ExportLanguage = "en" | "ar" | "both";

export interface ExportMeta {
  title: string;
  language: ExportLanguage;
  /** Optional source-language label for the header line. */
  sourceLanguage?: string | null;
}

const ARABIC_FONT =
  '"Noto Naskh Arabic", "Geeza Pro", "Traditional Arabic", "Segoe UI", sans-serif';

/**
 * Export-only colour palette. These literals style the STANDALONE downloaded
 * .html file, which lives on the user's disk with no access to the app's
 * `var(--ds-*)` tokens — an offline artifact must carry its own colours or it
 * renders unstyled. Values mirror the ADS light theme (Atlassian neutral
 * palette) so the export matches the on-screen document. This is the documented
 * escape-hatch case in CLAUDE.md (offline artifact, no ADS-token equivalent at
 * rest); the ignore markers keep the colour gate green without hiding real
 * app-surface violations.
 */
const EXPORT_PALETTE = {
  pageBg: "#f4f5f7", // ads-scanner:ignore-line — offline HTML export, ADS N40
  text: "#172b4d", // ads-scanner:ignore-line — offline HTML export, ADS N800
  textSubtle: "#626f86", // ads-scanner:ignore-line — offline HTML export, ADS N300
  textSubtlest: "#8993a4", // ads-scanner:ignore-line — offline HTML export, ADS N200
  surface: "#ffffff", // ads-scanner:ignore-line — offline HTML export, ADS surface
  border: "#dcdfe4", // ads-scanner:ignore-line — offline HTML export, ADS N40A border
  headerBg: "#f1f2f4", // ads-scanner:ignore-line — offline HTML export, ADS N20
} as const;

/** A safe file stem from the document title. */
function fileStem(title: string): string {
  const stem = title
    .trim()
    .replace(/[^\p{L}\p{N}\-_ ]/gu, "")
    .replace(/\s+/g, "_")
    .slice(0, 80);
  return stem || "translated_document";
}

/** HTML-escape text for safe inline embedding. */
function esc(value: string | null | undefined): string {
  if (!value) return "";
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function hasText(value: string | null | undefined): boolean {
  return !!value && value.trim().length > 0;
}

/** Render one element's text for a single language, as an HTML fragment. */
function elementHtmlForLang(
  el: DocintelRenderElement,
  lang: "en" | "ar",
): string {
  const text = lang === "ar" ? el.text_ar : el.text_en;
  const dir = lang === "ar" ? "rtl" : "ltr";
  const langAttr = lang === "ar" ? ' lang="ar"' : "";
  const arStyle =
    lang === "ar"
      ? ` style="font-family:${ARABIC_FONT};text-align:right;"`
      : "";

  if (el.kind === "table" && el.table) {
    const headerRows = el.table.header_rows ?? [];
    const bodyRows = el.table.rows ?? [];
    const summary = lang === "ar" ? el.table.summary_ar : el.table.summary_en;
    const summaryHtml = hasText(summary)
      ? `<p class="doc-caption" dir="${dir}"${langAttr}${arStyle}>${esc(summary)}</p>`
      : "";
    const thead =
      headerRows.length > 0
        ? `<thead>${headerRows
            .map(
              (hr) =>
                `<tr>${hr.map((c) => `<th>${esc(c)}</th>`).join("")}</tr>`,
            )
            .join("")}</thead>`
        : "";
    const tbody = `<tbody>${bodyRows
      .map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join("")}</tr>`)
      .join("")}</tbody>`;
    return `${summaryHtml}<table dir="${dir}"${langAttr}>${thead}${tbody}</table>`;
  }

  if (!hasText(text)) return "";

  switch (el.kind) {
    case "heading":
      return `<h2 dir="${dir}"${langAttr}${arStyle}>${esc(text)}</h2>`;
    case "list_item":
      return `<ul><li dir="${dir}"${langAttr}${arStyle}>${esc(text)}</li></ul>`;
    case "caption":
      return `<p class="doc-caption" dir="${dir}"${langAttr}${arStyle}>${esc(text)}</p>`;
    case "chrome":
      return `<p class="doc-chrome" dir="${dir}"${langAttr}${arStyle}>${esc(text)}</p>`;
    case "paragraph":
    default:
      return `<p dir="${dir}"${langAttr}${arStyle}>${esc(text)}</p>`;
  }
}

/** Build the body HTML for the elements under the chosen language mode. */
function bodyHtml(
  elements: DocintelRenderElement[],
  language: ExportLanguage,
): string {
  const parts: string[] = [];
  let lastPage = -1;

  for (const el of elements) {
    if (el.page !== lastPage) {
      if (lastPage !== -1) {
        parts.push(
          `<div class="doc-page-sep"><span>Page ${el.page}</span></div>`,
        );
      }
      lastPage = el.page;
    }

    if (language === "both") {
      const ar = elementHtmlForLang(el, "ar");
      const en = elementHtmlForLang(el, "en");
      if (!ar && !en) continue;
      parts.push(
        `<div class="doc-row-both"><div class="doc-col-ar">${ar}</div><div class="doc-col-en">${en}</div></div>`,
      );
    } else {
      const frag = elementHtmlForLang(el, language);
      if (frag) parts.push(frag);
    }
  }
  return parts.join("\n");
}

/**
 * Build a clean, standalone HTML document string of the formatted translated
 * document. Inline CSS only, RTL-aware. Self-contained and offline.
 */
export function buildHtmlString(
  elements: DocintelRenderElement[],
  meta: ExportMeta,
): string {
  const dirRoot = meta.language === "ar" ? "rtl" : "ltr";
  const body = bodyHtml(elements, meta.language);
  const langLabel =
    meta.language === "ar"
      ? "العربية"
      : meta.language === "both"
        ? "العربية / English"
        : "English";

  return `<!doctype html>
<html lang="${meta.language === "ar" ? "ar" : "en"}" dir="${dirRoot}">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(meta.title)}</title>
<style>
  :root { color-scheme: light; }
  body {
    margin: 0;
    background: ${EXPORT_PALETTE.pageBg};
    color: ${EXPORT_PALETTE.text};
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    line-height: 1.7;
  }
  .doc-shell { max-width: 820px; margin: 0 auto; padding: 40px 16px 80px; }
  .doc-meta { color: ${EXPORT_PALETTE.textSubtle}; font-size: 13px; margin: 0 0 24px; }
  .doc-body {
    background: ${EXPORT_PALETTE.surface};
    border: 1px solid ${EXPORT_PALETTE.border};
    border-radius: 8px;
    padding: 48px 56px;
  }
  h1.doc-title { font-size: 26px; margin: 0 0 4px; }
  h2 { font-size: 19px; margin: 28px 0 8px; line-height: 1.35; }
  p { margin: 0 0 12px; }
  ul { margin: 0 0 12px; padding-inline-start: 22px; }
  li { margin: 0 0 4px; }
  .doc-caption { color: ${EXPORT_PALETTE.textSubtle}; font-style: italic; font-size: 14px; }
  .doc-chrome { color: ${EXPORT_PALETTE.textSubtlest}; font-size: 12px; }
  table { border-collapse: collapse; width: 100%; margin: 16px 0; font-size: 13px; }
  th, td { border: 1px solid ${EXPORT_PALETTE.border}; padding: 6px 10px; text-align: start; vertical-align: top; }
  th { background: ${EXPORT_PALETTE.headerBg}; font-weight: 600; }
  .doc-page-sep {
    display: flex; align-items: center; gap: 12px;
    margin: 32px 0; color: ${EXPORT_PALETTE.textSubtle}; font-size: 12px;
  }
  .doc-page-sep::before, .doc-page-sep::after {
    content: ""; flex: 1; height: 1px; background: ${EXPORT_PALETTE.border};
  }
  .doc-row-both { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin: 0 0 12px; }
  .doc-col-ar { direction: rtl; text-align: right; }
  .doc-col-en { direction: ltr; text-align: left; }
</style>
</head>
<body>
  <div class="doc-shell">
    <h1 class="doc-title" dir="${dirRoot}">${esc(meta.title)}</h1>
    <p class="doc-meta">Translated document · ${esc(langLabel)}${
      meta.sourceLanguage ? ` · source: ${esc(meta.sourceLanguage)}` : ""
    }</p>
    <div class="doc-body">
${body}
    </div>
  </div>
</body>
</html>`;
}

/**
 * Build and download the formatted document as a standalone .html file.
 * Offline — assembles the Blob client-side and uses file-saver.
 */
export function exportToHtml(
  elements: DocintelRenderElement[],
  meta: ExportMeta,
): void {
  const html = buildHtmlString(elements, meta);
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  saveAs(blob, `${fileStem(meta.title)}.html`);
}

/**
 * Render the on-screen formatted container to a multi-page PDF. `node` is the
 * live DOM element of the document container (already rendered with the chosen
 * language + RTL). html2canvas rasterises it — preserving browser Arabic
 * shaping — and jsPDF slices the tall canvas across A4 pages.
 *
 * Offline: html2canvas + jsPDF run entirely in the browser.
 */
export async function exportToPdf(
  node: HTMLElement,
  meta: ExportMeta,
): Promise<void> {
  const canvas = await html2canvas(node, {
    scale: 2, // sharper text
    backgroundColor: EXPORT_PALETTE.surface,
    useCORS: true,
    logging: false,
  });

  const pdf = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  const margin = 24;
  const usableWidth = pageWidth - margin * 2;
  // Scale the canvas to the usable page width; height follows the aspect ratio.
  const ratio = usableWidth / canvas.width;
  const renderedFullHeight = canvas.height * ratio;
  const usableHeight = pageHeight - margin * 2;

  const imgData = canvas.toDataURL("image/png");

  if (renderedFullHeight <= usableHeight) {
    pdf.addImage(imgData, "PNG", margin, margin, usableWidth, renderedFullHeight);
  } else {
    // Slice the tall image across pages by shifting the y-offset each page.
    let remaining = renderedFullHeight;
    let position = margin;
    let pageIndex = 0;
    while (remaining > 0) {
      if (pageIndex > 0) {
        pdf.addPage();
        position = margin - pageIndex * usableHeight;
      }
      pdf.addImage(
        imgData,
        "PNG",
        margin,
        position,
        usableWidth,
        renderedFullHeight,
      );
      remaining -= usableHeight;
      pageIndex += 1;
    }
  }

  pdf.save(`${fileStem(meta.title)}.pdf`);
}
