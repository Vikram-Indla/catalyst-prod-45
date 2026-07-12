/**
 * EvidenceViewer — the Evidence tab body.
 *
 * Left: page rail (page number + status Lozenge + scanned indicator + issue
 * count). Right: for the selected page, a bilingual two-column view — Arabic
 * (dir="rtl") and English (dir="ltr") — of each block in reading order, tables
 * rendered as real tables, and image/figure cards. Extraction issues for the
 * page surface as a SectionMessage. Zero-assumption rendering throughout:
 * unknown values render an em-dash or nothing, never a fabricated default.
 *
 * ADS tokens only. Canonical components only. RTL-correct Arabic panes.
 * CAT-DOCINTEL-ARABIC-RAG-20260706-001
 */
import { useMemo, useState } from "react";
import { Lozenge, Spinner, EmptyState, SectionMessage } from "@/components/ads";
import { useDocumentEvidence } from "../hooks/useDocintel";
import type {
  DocintelBlock,
  DocintelImage,
  DocintelPage,
  DocintelPageStatus,
  DocintelTable,
} from "../types";
import { confidenceAppearance, pctLabel } from "./confidence";
import type { LozengeAppearance } from "@/components/ads";

const DASH = "—";

const ARABIC_FONT =
  '"Noto Naskh Arabic", "Geeza Pro", "Traditional Arabic", "Segoe UI", var(--ds-font-family-body), sans-serif';

function pageStatusAppearance(status: DocintelPageStatus): LozengeAppearance {
  switch (status) {
    case "extracted":
    case "described":
      return "success";
    case "failed":
      return "removed";
    case "pending":
      return "default";
    default:
      return "inprogress";
  }
}

/** One block row: Arabic (rtl) + English (ltr) columns with a confidence pill. */
function BlockRow({ block }: { block: DocintelBlock }) {
  const hasAr = !!block.text_ar?.trim();
  const hasEn = !!block.text_en?.trim();
  if (!hasAr && !hasEn) return null;

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 16,
        padding: "10px 0",
        borderBottom: "1px solid var(--ds-border)",
      }}
    >
      <div
        dir="rtl"
        lang="ar"
        style={{
          textAlign: "right",
          unicodeBidi: "plaintext",
          fontFamily: ARABIC_FONT,
          fontSize: 15,
          lineHeight: 1.8,
          color: "var(--ds-text)",
          whiteSpace: "pre-wrap",
        }}
      >
        {hasAr ? block.text_ar : <span style={{ color: "var(--ds-text-subtlest)" }}>{DASH}</span>}
      </div>
      <div
        dir="ltr"
        style={{
          textAlign: "left",
          color: "var(--ds-text)",
          fontSize: 14,
          lineHeight: 1.6,
          whiteSpace: "pre-wrap",
        }}
      >
        <div style={{ marginBottom: 4 }}>
          <Lozenge appearance={confidenceAppearance(block.confidence)}>
            {`conf ${pctLabel(block.confidence)}`}
          </Lozenge>
        </div>
        {hasEn ? block.text_en : <span style={{ color: "var(--ds-text-subtlest)" }}>{DASH}</span>}
      </div>
    </div>
  );
}

/** A table block — header rows + body rows, EN summary above. */
function TableCard({ table }: { table: DocintelTable }) {
  const headerRows = table.header_rows ?? [];
  const bodyRows = table.rows ?? [];
  return (
    <div
      style={{
        border: "1px solid var(--ds-border)",
        borderRadius: 8,
        padding: 12,
        margin: "12px 0",
        background: "var(--ds-surface-raised)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <Lozenge appearance="default">Table</Lozenge>
        <Lozenge appearance={confidenceAppearance(table.confidence)}>
          {`conf ${pctLabel(table.confidence)}`}
        </Lozenge>
      </div>
      {table.summary_en?.trim() && (
        <p style={{ margin: "0 0 8px", color: "var(--ds-text-subtle)", fontSize: 13 }}>
          {table.summary_en}
        </p>
      )}
      <div style={{ overflowX: "auto" }}>
        <table
          style={{
            borderCollapse: "collapse",
            width: "100%",
            fontSize: 13,
            color: "var(--ds-text)",
          }}
        >
          {headerRows.length > 0 && (
            <thead>
              {headerRows.map((hr, i) => (
                <tr key={`h-${i}`}>
                  {hr.map((cell, j) => (
                    <th
                      key={`h-${i}-${j}`}
                      style={{
                        border: "1px solid var(--ds-border)",
                        padding: "6px 8px",
                        textAlign: "start",
                        background: "var(--ds-surface-sunken)",
                        fontWeight: 600,
                      }}
                    >
                      {cell}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
          )}
          <tbody>
            {bodyRows.map((r, i) => (
              <tr key={`r-${i}`}>
                {r.map((cell, j) => (
                  <td
                    key={`r-${i}-${j}`}
                    style={{
                      border: "1px solid var(--ds-border)",
                      padding: "6px 8px",
                      textAlign: "start",
                    }}
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** An image/figure card — kind + EN caption/description + Arabic caption (rtl). */
function ImageCard({ image }: { image: DocintelImage }) {
  return (
    <div
      style={{
        border: "1px solid var(--ds-border)",
        borderRadius: 8,
        padding: 12,
        margin: "12px 0",
        background: "var(--ds-surface-raised)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <Lozenge appearance="default">{image.kind?.trim() || "Figure"}</Lozenge>
        <Lozenge appearance={confidenceAppearance(image.confidence)}>
          {`conf ${pctLabel(image.confidence)}`}
        </Lozenge>
      </div>
      {image.caption_en?.trim() && (
        <p style={{ margin: "0 0 4px", color: "var(--ds-text)", fontSize: 14, fontWeight: 500 }}>
          {image.caption_en}
        </p>
      )}
      {image.description_en?.trim() && (
        <p style={{ margin: "0 0 8px", color: "var(--ds-text-subtle)", fontSize: 13 }}>
          {image.description_en}
        </p>
      )}
      {image.caption_ar?.trim() && (
        <p
          dir="rtl"
          lang="ar"
          style={{
            margin: 0,
            textAlign: "right",
            unicodeBidi: "plaintext",
            fontFamily: ARABIC_FONT,
            fontSize: 14,
            color: "var(--ds-text-subtle)",
          }}
        >
          {image.caption_ar}
        </p>
      )}
    </div>
  );
}

export interface EvidenceViewerProps {
  documentId: string;
}

export function EvidenceViewer({ documentId }: EvidenceViewerProps) {
  const { data, isLoading, isError, error } = useDocumentEvidence(documentId);
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);

  const pages = data?.pages ?? [];

  // Issue count per page id.
  const issueCountByPage = useMemo(() => {
    const map = new Map<string, number>();
    for (const issue of data?.issues ?? []) {
      if (!issue.page_id || issue.resolved) continue;
      map.set(issue.page_id, (map.get(issue.page_id) ?? 0) + 1);
    }
    return map;
  }, [data?.issues]);

  const activePage: DocintelPage | null = useMemo(() => {
    if (pages.length === 0) return null;
    return pages.find((p) => p.id === selectedPageId) ?? pages[0];
  }, [pages, selectedPageId]);

  const pageBlocks = useMemo(
    () =>
      (data?.blocks ?? []).filter((b) => b.page_id === activePage?.id),
    [data?.blocks, activePage?.id],
  );
  const pageTables = useMemo(
    () => (data?.tables ?? []).filter((t) => t.page_id === activePage?.id),
    [data?.tables, activePage?.id],
  );
  const pageImages = useMemo(
    () => (data?.images ?? []).filter((i) => i.page_id === activePage?.id),
    [data?.images, activePage?.id],
  );
  const pageIssues = useMemo(
    () =>
      (data?.issues ?? []).filter(
        (i) => i.page_id === activePage?.id && !i.resolved,
      ),
    [data?.issues, activePage?.id],
  );

  if (isLoading) {
    return (
      <div style={{ padding: 48, display: "flex", justifyContent: "center" }}>
        <Spinner size="large" />
      </div>
    );
  }

  if (isError) {
    return (
      <div style={{ padding: 16 }}>
        <SectionMessage appearance="error" title="Could not load evidence">
          {error instanceof Error ? error.message : "Please try again."}
        </SectionMessage>
      </div>
    );
  }

  if (pages.length === 0) {
    return (
      <div style={{ padding: 16 }}>
        <EmptyState
          size="compact"
          header="No evidence yet"
          description="Extracted text, tables and figures appear here as the document is processed."
        />
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: 16, paddingTop: 16 }}>
      {/* Page rail */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {pages.map((p) => {
          const issues = issueCountByPage.get(p.id) ?? 0;
          const isActive = p.id === activePage?.id;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => setSelectedPageId(p.id)}
              style={{
                textAlign: "start",
                border: isActive
                  ? "1px solid var(--ds-border-focused)"
                  : "1px solid var(--ds-border)",
                borderRadius: 6,
                padding: "8px 10px",
                background: isActive
                  ? "var(--ds-background-selected)"
                  : "var(--ds-surface-raised)",
                color: "var(--ds-text)",
                cursor: "pointer",
                font: "inherit",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontWeight: 600 }}>Page {p.page_number}</span>
                <Lozenge appearance={pageStatusAppearance(p.status)}>{p.status}</Lozenge>
              </div>
              <div style={{ marginTop: 4, display: "flex", gap: 6, flexWrap: "wrap" }}>
                {p.is_scanned === true && <Lozenge appearance="moved">scanned</Lozenge>}
                {issues > 0 && (
                  <Lozenge appearance="removed">
                    {`${issues} issue${issues === 1 ? "" : "s"}`}
                  </Lozenge>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Selected page */}
      <div style={{ minWidth: 0 }}>
        {activePage && (
          <>
            {pageIssues.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <SectionMessage
                  appearance="warning"
                  title={`${pageIssues.length} extraction issue${pageIssues.length === 1 ? "" : "s"} on this page`}
                >
                  <ul style={{ margin: 0, paddingInlineStart: 18 }}>
                    {pageIssues.map((i) => (
                      <li key={i.id} style={{ marginBottom: 2 }}>
                        <strong>{i.kind}</strong>
                        {i.detail ? ` — ${i.detail}` : ""}
                      </li>
                    ))}
                  </ul>
                </SectionMessage>
              </div>
            )}

            {/* Bilingual column headers */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 16,
                paddingBottom: 8,
                borderBottom: "2px solid var(--ds-border)",
              }}
            >
              <div dir="rtl" style={{ textAlign: "right", color: "var(--ds-text-subtle)", fontSize: 12, fontWeight: 600 }}>
                العربية
              </div>
              <div style={{ color: "var(--ds-text-subtle)", fontSize: 12, fontWeight: 600 }}>
                English
              </div>
            </div>

            {pageBlocks.length === 0 && pageTables.length === 0 && pageImages.length === 0 ? (
              <div style={{ paddingTop: 16 }}>
                <EmptyState
                  size="compact"
                  header="No content extracted for this page"
                  description="This page may still be processing, or contain no recognisable text."
                />
              </div>
            ) : (
              <>
                {pageBlocks.map((b) => (
                  <BlockRow key={b.id} block={b} />
                ))}
                {pageTables.map((t) => (
                  <TableCard key={t.id} table={t} />
                ))}
                {pageImages.map((img) => (
                  <ImageCard key={img.id} image={img} />
                ))}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default EvidenceViewer;
