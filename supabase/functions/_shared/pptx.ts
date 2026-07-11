/**
 * _shared/pptx.ts — PPTX → per-slide text (CAT-DOCINTEL-V2 Slice 3).
 *
 * A .pptx is a zip of XML. Slide text lives in ppt/slides/slideN.xml inside <a:t>…</a:t> runs.
 * This returns one plain-text string per slide (in slide order) so a deck ingests as N logical
 * pages — each slide a citation anchor — through the SAME chunk/embed/retrieval pipeline as PDFs.
 * Both docintel-ingest (page_count = slide count) and docintel-analyze (per-slide text) call this,
 * so they agree exactly. Deno-native (fflate unzip) — no external MarkItDown/Python service.
 * Never throws — returns [] on failure so callers fall back.
 */
import { unzipSync } from "https://esm.sh/fflate@0.8.2";

function decodeXmlEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'");
}

/** Extract concatenated <a:t> run text from one slide's XML. */
function slideXmlToText(xml: string): string {
  const runs = xml.match(/<a:t>([\s\S]*?)<\/a:t>/g) ?? [];
  const text = runs
    .map((r) => decodeXmlEntities(r.replace(/<\/?a:t>/g, "")))
    .join(" ")
    .replace(/[ \t]+/g, " ")
    .trim();
  return text;
}

export async function pptxSlides(fileBytes: Uint8Array): Promise<string[]> {
  try {
    const files = unzipSync(fileBytes);
    const slideNames = Object.keys(files)
      .filter((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n))
      .sort((a, b) => {
        const na = parseInt(a.match(/slide(\d+)\.xml$/)![1], 10);
        const nb = parseInt(b.match(/slide(\d+)\.xml$/)![1], 10);
        return na - nb;
      });
    const dec = new TextDecoder();
    const slides = slideNames
      .map((n) => slideXmlToText(dec.decode(files[n])))
      .filter((t) => t.length > 0);
    return slides;
  } catch (_e) {
    return [];
  }
}
