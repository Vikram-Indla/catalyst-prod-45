/**
 * _shared/docx.ts — DOCX → logical sections (CAT-DOCINTEL-V2 Slice 3).
 *
 * Word has no real pages, so the prior pipeline collapsed a whole .docx into one logical page —
 * losing heading structure and giving chunking/citations nothing to anchor on. This splits a
 * document on top-level headings (h1/h2) into ordered sections. BOTH docintel-ingest (to set
 * page_count / create page rows) and docintel-analyze (to supply per-section text) call this, so
 * they agree exactly on section count and content. Deterministic → the same bytes always yield the
 * same sections. Falls back to a single section for flat (heading-less) documents.
 */
import mammoth from "https://esm.sh/mammoth@1.6.0";

function htmlFragmentToText(html: string): string {
  return html
    .replace(/<li[^>]*>/gi, "\n- ")
    .replace(/<\/(p|div|h[1-6]|tr|ul|ol|table)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Return the document's logical sections as ordered plain-text strings (index 0 = section 1).
 * Never throws — returns [] on failure so callers fall back to their own handling.
 */
export async function docxSections(fileBytes: Uint8Array): Promise<string[]> {
  try {
    const arrayBuffer = fileBytes.buffer.slice(
      fileBytes.byteOffset,
      fileBytes.byteOffset + fileBytes.byteLength,
    );
    const { value: html } = await mammoth.convertToHtml({ arrayBuffer });
    // Each chunk starts at an h1/h2 heading; leading content before the first heading is its own chunk.
    const chunks = (html ?? "").split(/(?=<h[12][ >])/i);
    const sections = chunks.map(htmlFragmentToText).filter((t) => t.length > 0);
    if (sections.length > 1) return sections;

    // Flat document (no headings) → single section from raw text.
    const { value: rawText } = await mammoth.extractRawText({ arrayBuffer });
    const flat = (rawText ?? "").trim() || sections[0] || "";
    return flat ? [flat] : [];
  } catch (_e) {
    return [];
  }
}
