/**
 * PdfThumbnails — client-side PDF page thumbnails from a File, rendered with
 * pdfjs-dist. Each page is rasterised to a <canvas> at a small scale into a
 * horizontal scroll strip. The first EAGER_PAGES are rendered on mount; the
 * rest render on demand via a "Show all N pages" control (a 24-page document
 * must not block the wizard).
 *
 * Image files (PNG/JPEG) get a real thumbnail via URL.createObjectURL — the
 * browser renders them natively, no pdfjs involved.
 *
 * Other non-PDF files (e.g. DOCX, XLSX) get a document-icon placeholder —
 * pdfjs cannot rasterise them, and guessing would be a lie (zero-assumption
 * rendering).
 *
 * pdfjs-dist@4.8.69 + Vite worker setup:
 *   import * as pdfjsLib from "pdfjs-dist";
 *   import PdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
 *   pdfjsLib.GlobalWorkerOptions.workerSrc = PdfWorker;
 * The `?url` import yields the built worker asset URL (same pattern the icon
 * registry uses); pdfjs then spawns the worker from that URL in dev + build.
 *
 * ADS tokens only. CAT-DOCINTEL-ARABIC-RAG-20260706-001
 */
import { useEffect, useRef, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";
import PdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { Spinner } from "@/components/ads";
import { Button } from "@/components/ads";
import { FileText } from "@/lib/atlaskit-icons";

pdfjsLib.GlobalWorkerOptions.workerSrc = PdfWorker;

const EAGER_PAGES = 8;
const RENDER_SCALE = 0.4;

function isPdf(file: File): boolean {
  return (
    file.type === "application/pdf" ||
    file.name.toLowerCase().endsWith(".pdf")
  );
}

function isImage(file: File): boolean {
  return (
    file.type === "image/png" ||
    file.type === "image/jpeg" ||
    /\.(png|jpe?g)$/.test(file.name.toLowerCase())
  );
}

interface PdfThumbnailsProps {
  file: File;
  /** Accessible caption for the strip. Defaults to the file name. */
  label?: string;
}

/**
 * One page canvas. Renders lazily: only draws when `active` (eager window, or
 * after the user expands). Cancels the in-flight render + cleans the canvas on
 * unmount so a fast unmount during a large render leaks nothing.
 */
function PageCanvas({
  pdf,
  pageNumber,
  active,
}: {
  pdf: pdfjsLib.PDFDocumentProxy;
  pageNumber: number;
  active: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [rendered, setRendered] = useState(false);

  useEffect(() => {
    if (!active || rendered) return;
    let cancelled = false;
    let task: ReturnType<pdfjsLib.PDFPageProxy["render"]> | null = null;

    (async () => {
      try {
        const page = await pdf.getPage(pageNumber);
        if (cancelled) return;
        const viewport = page.getViewport({ scale: RENDER_SCALE });
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        canvas.width = Math.ceil(viewport.width);
        canvas.height = Math.ceil(viewport.height);
        task = page.render({ canvasContext: ctx, viewport });
        await task.promise;
        if (!cancelled) setRendered(true);
      } catch {
        // Render cancellation or a corrupt page — leave the placeholder box.
      }
    })();

    return () => {
      cancelled = true;
      try {
        task?.cancel();
      } catch {
        /* already settled */
      }
      const canvas = canvasRef.current;
      if (canvas) {
        canvas.width = 0;
        canvas.height = 0;
      }
    };
  }, [pdf, pageNumber, active, rendered]);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 4,
        flex: "0 0 auto",
      }}
    >
      <div
        style={{
          width: 84,
          minHeight: 108,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          border: "1px solid var(--ds-border)",
          borderRadius: 4,
          background: "var(--ds-surface-sunken)",
          overflow: "hidden",
        }}
      >
        {active ? (
          <canvas
            ref={canvasRef}
            style={{ maxWidth: "100%", height: "auto", display: "block" }}
          />
        ) : (
          <span style={{ color: "var(--ds-icon-subtle)" }}>
            <FileText size={20} />
          </span>
        )}
      </div>
      <span style={{ fontSize: 11, color: "var(--ds-text-subtlest)" }}>
        {pageNumber}
      </span>
    </div>
  );
}

export function PdfThumbnails({ file, label }: PdfThumbnailsProps) {
  const [pdf, setPdf] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [showAll, setShowAll] = useState(false);

  const pdfFile = isPdf(file);
  const imageFile = !pdfFile && isImage(file);
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  // Image files: browser-native thumbnail via an object URL (revoked on cleanup).
  useEffect(() => {
    if (!imageFile) return;
    const url = URL.createObjectURL(file);
    setImageUrl(url);
    return () => {
      URL.revokeObjectURL(url);
      setImageUrl(null);
    };
  }, [file, imageFile]);

  useEffect(() => {
    if (!pdfFile) return;
    let cancelled = false;
    let doc: pdfjsLib.PDFDocumentProxy | null = null;
    setLoading(true);
    setFailed(false);
    setShowAll(false);

    (async () => {
      try {
        const buffer = await file.arrayBuffer();
        if (cancelled) return;
        const task = pdfjsLib.getDocument({ data: buffer });
        doc = await task.promise;
        if (cancelled) {
          void doc.destroy();
          return;
        }
        setPdf(doc);
        setPageCount(doc.numPages);
      } catch {
        if (!cancelled) setFailed(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      setPdf(null);
      setPageCount(0);
      if (doc) void doc.destroy();
    };
  }, [file, pdfFile]);

  // Image (PNG/JPEG) — a real thumbnail, straight from the file bytes.
  if (imageFile) {
    return (
      <div
        aria-label={label ?? `Preview of ${file.name}`}
        style={{ display: "flex", padding: "var(--ds-space-050) var(--ds-space-025) var(--ds-space-100)" }}
      >
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={label ?? `Preview of ${file.name}`}
            style={{
              maxWidth: 160,
              maxHeight: 200,
              display: "block",
              border: "1px solid var(--ds-border)",
              borderRadius: 4,
              background: "var(--ds-surface-sunken)",
            }}
          />
        ) : null}
      </div>
    );
  }

  // Other non-PDF (DOCX, XLSX etc.) — no rasterisation, honest placeholder.
  if (!pdfFile) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: 12,
          border: "1px solid var(--ds-border)",
          borderRadius: 6,
          background: "var(--ds-surface-sunken)",
          color: "var(--ds-text-subtle)",
        }}
      >
        <span style={{ color: "var(--ds-icon-subtle)" }}>
          <FileText size={24} />
        </span>
        <span style={{ fontSize: 13 }}>
          Preview available for PDF and image files only
        </span>
      </div>
    );
  }

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: 12,
          color: "var(--ds-text-subtle)",
        }}
      >
        <Spinner size="small" aria-label="Rendering preview" />
        <span style={{ fontSize: 13 }}>Rendering preview…</span>
      </div>
    );
  }

  if (failed || !pdf) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: 12,
          border: "1px solid var(--ds-border)",
          borderRadius: 6,
          background: "var(--ds-surface-sunken)",
          color: "var(--ds-text-subtle)",
        }}
      >
        <span style={{ color: "var(--ds-icon-subtle)" }}>
          <FileText size={24} />
        </span>
        <span style={{ fontSize: 13 }}>Could not render a preview</span>
      </div>
    );
  }

  const visibleCount = showAll ? pageCount : Math.min(EAGER_PAGES, pageCount);
  const pageNumbers = Array.from({ length: pageCount }, (_, i) => i + 1);

  return (
    <div>
      <div
        aria-label={label ?? `Preview of ${file.name}`}
        style={{
          display: "flex",
          gap: 10,
          overflowX: "auto",
          padding: "4px 2px 8px",
        }}
      >
        {pageNumbers.map((n) => (
          <PageCanvas
            key={n}
            pdf={pdf}
            pageNumber={n}
            active={n <= visibleCount}
          />
        ))}
      </div>
      {!showAll && pageCount > EAGER_PAGES && (
        <Button appearance="subtle" onClick={() => setShowAll(true)}>
          {`Show all ${pageCount} pages`}
        </Button>
      )}
    </div>
  );
}
