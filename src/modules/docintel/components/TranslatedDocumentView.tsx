/**
 * TranslatedDocumentView — the "Document" tab body.
 *
 * Renders the structure-faithful, translated document (headings as headings,
 * paragraphs as paragraphs, lists as lists, tables as tables) inside a paged,
 * document-like container. A segmented control toggles English | العربية |
 * Side-by-side. An Export menu downloads the document as PDF or HTML, fully
 * offline. This is the high-fidelity formatted document — NOT a summary.
 *
 * ADS tokens only. Canonical components only. RTL-correct Arabic.
 * CAT-DOCINTEL-ARABIC-RAG-20260706-001
 */
import { useMemo, useRef, useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ads/Button";
import { Heading } from "@/components/ads/Heading";
import { DropdownMenu } from "@/components/ads/DropdownMenu";
import { Lozenge, Spinner, EmptyState, SectionMessage } from "@/components/ads";
import { useFormattedDocument } from "../hooks/useDocintel";
import type { DocintelRenderElement, DocintelTable } from "../types";
import {
  exportToHtml,
  exportToPdf,
  type ExportLanguage,
  type ExportMeta,
} from "../lib/exportDocument";
import { catalystToast } from "@/lib/catalystToast";

const ARABIC_FONT =
  '"Noto Naskh Arabic", "Geeza Pro", "Traditional Arabic", "Segoe UI", var(--ds-font-family-body), sans-serif';

type LangMode = ExportLanguage; // "en" | "ar" | "both"

const LANG_TABS: Array<{ key: LangMode; label: string; dir?: "rtl" | "ltr" }> = [
  { key: "en", label: "English" },
  { key: "ar", label: "العربية", dir: "rtl" },
  { key: "both", label: "Side-by-side" },
];

function hasText(v: string | null | undefined): boolean {
  return !!v && v.trim().length > 0;
}

/** A token-styled table (header_rows + rows), dir-aware. */
function DocTable({
  table,
  dir,
  arabic,
}: {
  table: DocintelTable;
  dir: "rtl" | "ltr";
  arabic: boolean;
}) {
  const headerRows = table.header_rows ?? [];
  const bodyRows = table.rows ?? [];
  return (
    <div style={{ overflowX: "auto", margin: "16px 0" }}>
      <table
        dir={dir}
        style={{
          borderCollapse: "collapse",
          width: "100%",
          fontSize: 13,
          color: "var(--ds-text)",
          fontFamily: arabic ? ARABIC_FONT : "inherit",
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
                      padding: "6px 10px",
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
                    padding: "6px 10px",
                    textAlign: "start",
                    verticalAlign: "top",
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
  );
}

/** Render one element for a single language as a real document node. */
function ElementNode({
  el,
  lang,
}: {
  el: DocintelRenderElement;
  lang: "en" | "ar";
}) {
  const arabic = lang === "ar";
  const dir = arabic ? "rtl" : "ltr";
  const text = arabic ? el.text_ar : el.text_en;

  const textStyle: React.CSSProperties = {
    color: "var(--ds-text)",
    fontFamily: arabic ? ARABIC_FONT : "inherit",
    textAlign: arabic ? "right" : "left",
    whiteSpace: "pre-wrap",
    unicodeBidi: "plaintext",
  };

  if (el.kind === "table" && el.table) {
    const summary = arabic ? el.table.summary_ar : el.table.summary_en;
    return (
      <>
        {hasText(summary) && (
          <p
            dir={dir}
            lang={arabic ? "ar" : undefined}
            style={{
              ...textStyle,
              margin: "0 0 6px",
              color: "var(--ds-text-subtle)",
              fontStyle: "italic",
              fontSize: 13,
            }}
          >
            {summary}
          </p>
        )}
        <DocTable table={el.table} dir={dir} arabic={arabic} />
      </>
    );
  }

  if (!hasText(text)) return null;

  switch (el.kind) {
    case "heading":
      return (
        <div dir={dir} lang={arabic ? "ar" : undefined} style={{ margin: "24px 0 8px", ...(arabic ? { textAlign: "right", fontFamily: ARABIC_FONT } : {}) }}>
          <Heading as="h2" size="large">
            {text}
          </Heading>
        </div>
      );
    case "list_item":
      return (
        <ul style={{ margin: "0 0 8px", paddingInlineStart: 22 }}>
          <li dir={dir} lang={arabic ? "ar" : undefined} style={{ ...textStyle, marginBottom: 4, lineHeight: 1.7 }}>
            {text}
          </li>
        </ul>
      );
    case "caption":
      return (
        <p
          dir={dir}
          lang={arabic ? "ar" : undefined}
          style={{ ...textStyle, margin: "0 0 12px", color: "var(--ds-text-subtle)", fontStyle: "italic", fontSize: 14 }}
        >
          {text}
        </p>
      );
    case "chrome":
      return (
        <p
          dir={dir}
          lang={arabic ? "ar" : undefined}
          style={{ ...textStyle, margin: "0 0 8px", color: "var(--ds-text-subtlest)", fontSize: 12 }}
        >
          {text}
        </p>
      );
    case "paragraph":
    default:
      return (
        <p dir={dir} lang={arabic ? "ar" : undefined} style={{ ...textStyle, margin: "0 0 12px", lineHeight: 1.8 }}>
          {text}
        </p>
      );
  }
}

/** A subtle page separator rule with "Page N". */
function PageSeparator({ page }: { page: number }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        margin: "32px 0",
        color: "var(--ds-text-subtle)",
        fontSize: 12,
      }}
    >
      <div style={{ flex: 1, height: 1, background: "var(--ds-border)" }} />
      <span>{`Page ${page}`}</span>
      <div style={{ flex: 1, height: 1, background: "var(--ds-border)" }} />
    </div>
  );
}

export interface TranslatedDocumentViewProps {
  documentId: string;
}

export function TranslatedDocumentView({ documentId }: TranslatedDocumentViewProps) {
  const { data, isLoading, isError, error } = useFormattedDocument(documentId);
  const [lang, setLang] = useState<LangMode>("en");
  const [isExporting, setIsExporting] = useState(false);
  const captureRef = useRef<HTMLDivElement>(null);

  const elements = data?.elements ?? [];
  const doc = data?.document ?? null;

  const meta: ExportMeta = useMemo(
    () => ({
      title: doc?.title ?? "Translated document",
      language: lang,
      sourceLanguage: doc?.source_language ?? null,
    }),
    [doc?.title, doc?.source_language, lang],
  );

  const handleExportHtml = () => {
    try {
      exportToHtml(elements, meta);
    } catch (e) {
      catalystToast.error("Export failed", e instanceof Error ? e.message : "Could not export HTML");
    }
  };

  const handleExportPdf = async () => {
    if (!captureRef.current) return;
    setIsExporting(true);
    try {
      await exportToPdf(captureRef.current, meta);
    } catch (e) {
      catalystToast.error("Export failed", e instanceof Error ? e.message : "Could not export PDF");
    } finally {
      setIsExporting(false);
    }
  };

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
        <SectionMessage appearance="error" title="Could not load the document">
          {error instanceof Error ? error.message : "Please try again."}
        </SectionMessage>
      </div>
    );
  }

  if (!doc || elements.length === 0) {
    return (
      <div style={{ padding: 16 }}>
        <EmptyState
          size="compact"
          header="Document not ready yet"
          description="The formatted translation appears here once the document has been extracted and translated."
        />
      </div>
    );
  }

  const bothMode = lang === "both";
  const singleLang: "en" | "ar" = lang === "ar" ? "ar" : "en";
  let lastPage = -1;

  return (
    <div style={{ paddingTop: 16 }}>
      {/* Toolbar: language segmented control + export menu */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          marginBottom: 20,
          flexWrap: "wrap",
        }}
      >
        <div
          role="tablist"
          aria-label="Document language"
          style={{
            display: "inline-flex",
            border: "1px solid var(--ds-border)",
            borderRadius: 6,
            overflow: "hidden",
            background: "var(--ds-surface)",
          }}
        >
          {LANG_TABS.map((t, i) => {
            const active = lang === t.key;
            return (
              <button
                key={t.key}
                type="button"
                role="tab"
                aria-selected={active}
                dir={t.dir}
                onClick={() => setLang(t.key)}
                style={{
                  font: "inherit",
                  fontSize: 13,
                  fontWeight: active ? 600 : 400,
                  padding: "6px 14px",
                  cursor: "pointer",
                  border: "none",
                  borderInlineStart:
                    i === 0 ? "none" : "1px solid var(--ds-border)",
                  background: active
                    ? "var(--ds-background-selected)"
                    : "transparent",
                  color: active
                    ? "var(--ds-text-selected)"
                    : "var(--ds-text-subtle)",
                }}
              >
                {t.label}
              </button>
            );
          })}
        </div>

        <DropdownMenu
          placement="bottom-end"
          trigger={
            <Button appearance="default" iconBefore={<Download size={16} />} isLoading={isExporting}>
              Export
            </Button>
          }
          groups={[
            {
              key: "export",
              items: [
                {
                  key: "pdf",
                  label: "Download PDF",
                  onClick: () => void handleExportPdf(),
                },
                {
                  key: "html",
                  label: "Download HTML",
                  onClick: handleExportHtml,
                },
              ],
            },
          ]}
        />
      </div>

      {/* Paged, document-like container (also the PDF capture target). */}
      <div style={{ display: "flex", justifyContent: "center" }}>
        <div
          ref={captureRef}
          dir={lang === "ar" ? "rtl" : "ltr"}
          style={{
            width: "100%",
            maxWidth: 820,
            background: "var(--ds-surface-raised)",
            border: "1px solid var(--ds-border)",
            borderRadius: 8,
            padding: "48px 56px",
            fontFamily: "var(--ds-font-family-body)",
          }}
        >
          <div style={{ marginBottom: 4 }}>
            <Heading as="h1" size="xlarge">
              {doc.title}
            </Heading>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 28 }}>
            <Lozenge appearance="default">Translated document</Lozenge>
            {doc.source_language && (
              <span style={{ color: "var(--ds-text-subtle)", fontSize: 12 }}>
                {`source: ${doc.source_language}`}
              </span>
            )}
          </div>

          {elements.map((el) => {
            const showSep = el.page !== lastPage && lastPage !== -1;
            const sepPage = el.page;
            lastPage = el.page;

            const content = bothMode ? (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 24,
                  alignItems: "start",
                }}
              >
                <div style={{ direction: "rtl" }}>
                  <ElementNode el={el} lang="ar" />
                </div>
                <div style={{ direction: "ltr" }}>
                  <ElementNode el={el} lang="en" />
                </div>
              </div>
            ) : (
              <ElementNode el={el} lang={singleLang} />
            );

            return (
              <div key={el.id}>
                {showSep && <PageSeparator page={sepPage} />}
                {content}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default TranslatedDocumentView;
