/**
 * AskPanel — grounded Q&A ("Ask") over the Document Intelligence corpus.
 *
 * Question input + Ask button; answers render with inline [E<n>] citation
 * chips (marker-keyed, resolved from the docintel-ask response). Clicking a
 * chip opens a CatalystDrawer showing the quoted evidence + document / page /
 * source-updated date — the same evidence pattern as ArtifactView. A
 * confidence Lozenge (grounding thresholds) and a source-freshness line sit
 * under each answer. Zero evidence → an honest "Not found" empty state, no
 * fabricated answer.
 *
 * Full RTL: the input direction follows the typed question; Arabic answers
 * render dir="rtl" lang="ar" with the Arabic font stack. Q&A history is
 * session-local state (newest first) — answers are ephemeral, not artifacts.
 *
 * ADS tokens only. Canonical components only.
 * CAT-DOCINTEL-ARABIC-RAG-20260706-001
 */
import { useState, type KeyboardEvent, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import { formatDistanceToNow } from "date-fns";
import {
  Button,
  Lozenge,
  Spinner,
  EmptyState,
  Textfield,
  CatalystDrawer,
} from "@/components/ads";
import { useAskDocintel } from "../hooks/useDocintel";
import type { DocintelAskCitation, DocintelAskResult } from "../types";
import { groundingAppearance, pctLabel } from "./confidence";

const DASH = "—";
export const CITATION_RE = /\[E(\d+)\]/g;
const ARABIC_CHAR_RE = /[؀-ۿ]/g;

const ARABIC_FONT =
  '"Noto Naskh Arabic", "Geeza Pro", "Traditional Arabic", "Segoe UI", var(--ds-font-family-body), sans-serif';

/** Arabic-majority characters → treat the text as Arabic (RTL). */
export function isArabicText(s: string): boolean {
  const arabic = (s.match(ARABIC_CHAR_RE) ?? []).length;
  const latin = (s.match(/[A-Za-z]/g) ?? []).length;
  return arabic > 0 && arabic > latin;
}

/** A clickable citation chip rendered in place of an [E<n>] marker. */
function CitationChip({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`View source ${label}`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        verticalAlign: "baseline",
        margin: "0 var(--ds-space-025)",
        padding: 0,
        border: "none",
        background: "transparent",
        cursor: "pointer",
        font: "inherit",
      }}
    >
      <Lozenge appearance="new">{label}</Lozenge>
    </button>
  );
}

/**
 * Split an answer on [E<n>] markers, replacing each with a citation chip.
 * Citations are marker-keyed (citation.marker === n) — an unresolvable marker
 * renders as a plain "E<n>" chip with no drawer.
 */
export function renderWithCitations(
  text: string,
  citations: DocintelAskCitation[],
  onOpen: (c: DocintelAskCitation) => void,
  arabic: boolean,
): ReactNode[] {
  // Paragraph-first: each blank-line-separated block renders as its own
  // block element, and chips + text flow INLINE within it (a per-chunk
  // <p> from ReactMarkdown used to orphan trailing punctuation).
  const paras = text.split(/\n{2,}/);
  if (paras.length > 1) {
    return paras.filter((p) => p.trim()).map((p, i) => (
      <div key={`para-${i}`} style={{ marginBlockEnd: "var(--ds-space-100)" }}>
        {renderWithCitations(p, citations, onOpen, arabic)}
      </div>
    ));
  }

  const byMarker = new Map<number, DocintelAskCitation>();
  for (const c of citations) byMarker.set(c.marker, c);

  const parts: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  CITATION_RE.lastIndex = 0;
  let key = 0;

  const pushMarkdown = (chunk: string) => {
    if (!chunk) return;
    parts.push(
      <span
        key={`md-${key++}`}
        {...(arabic ? { dir: "rtl", lang: "ar" } : {})}
      >
        <ReactMarkdown
          skipHtml
          components={{ p: ({ children }) => <span>{children}</span> }}
        >
          {chunk}
        </ReactMarkdown>
      </span>,
    );
  };

  while ((match = CITATION_RE.exec(text)) !== null) {
    const n = Number(match[1]);
    pushMarkdown(text.slice(lastIndex, match.index));
    const citation = byMarker.get(n);
    const pageLabel =
      citation && typeof citation.page_number === "number"
        ? `p.${citation.page_number}`
        : `E${n}`;
    parts.push(
      <CitationChip
        key={`chip-${key++}`}
        label={pageLabel}
        onClick={() => citation && onOpen(citation)}
      />,
    );
    lastIndex = match.index + match[0].length;
  }
  pushMarkdown(text.slice(lastIndex));
  return parts;
}

/** One asked question + its grounded answer (session-local history entry). */
interface AskEntry {
  id: string;
  question: string;
  result: DocintelAskResult;
}

export interface AskPanelProps {
  projectId: string;
  /** Scope the question to one document; omitted → project-wide Ask. */
  documentId?: string;
  /** Scope retrieval to one theme's documents; omitted → all documents. */
  themeId?: string;
}

export function AskPanel({ projectId, documentId, themeId }: AskPanelProps) {
  const ask = useAskDocintel();
  const [question, setQuestion] = useState("");
  const [history, setHistory] = useState<AskEntry[]>([]);
  const [active, setActive] = useState<DocintelAskCitation | null>(null);

  const questionArabic = isArabicText(question);

  const onAsk = () => {
    const q = question.trim();
    if (q.length === 0 || ask.isPending) return;
    ask.mutate(
      { projectId, documentId, question: q, themeId },
      {
        onSuccess: (result) => {
          setHistory((prev) => [
            { id: crypto.randomUUID(), question: q, result },
            ...prev,
          ]);
          setQuestion("");
        },
      },
    );
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") onAsk();
  };

  return (
    <div style={{ paddingTop: 16 }}>
      {/* Question input */}
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        {/* data-voice-flow="off": Enter submits here — the global dictation
            hotkeys (double-space activate, Enter commit) must never bind. */}
        <div style={{ flex: 1 }} dir={questionArabic ? "rtl" : "auto"} data-voice-flow="off">
          <Textfield
            value={question}
            placeholder="Ask a question about the source documents…"
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={onKeyDown}
            isDisabled={ask.isPending}
            aria-label="Question"
          />
        </div>
        <Button
          appearance="primary"
          onClick={onAsk}
          isDisabled={ask.isPending || question.trim().length === 0}
        >
          Ask
        </Button>
      </div>

      {ask.isPending && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginTop: 12,
            color: "var(--ds-text-subtle)",
            fontSize: 13,
          }}
        >
          <Spinner size="small" />
          Asking…
        </div>
      )}

      {/* Session Q&A history, newest first */}
      {history.length === 0 && !ask.isPending ? (
        <div style={{ marginTop: 24 }}>
          <EmptyState
            size="compact"
            header="Ask the documents"
            description={
              documentId
                ? "Answers are grounded in this document's extracted evidence, with citations."
                : "Answers are grounded in this project's document evidence, with citations."
            }
          />
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--ds-space-200)", marginTop: "var(--ds-space-250)" }}>
          {history.map((entry) => {
            const answerArabic = isArabicText(entry.result.answer_md);
            const notFound = entry.result.evidence_count === 0;
            const latestSourceAt = entry.result.freshness?.latest_source_at ?? null;
            return (
              <div
                key={entry.id}
                style={{
                  border: "1px solid var(--ds-border)",
                  borderRadius: 8,
                  padding: 16,
                  background: "var(--ds-surface-raised)",
                }}
              >
                {/* Question */}
                <div
                  dir="auto"
                  style={{
                    fontWeight: 600,
                    fontSize: 14,
                    color: "var(--ds-text)",
                    marginBottom: 8,
                    unicodeBidi: "plaintext",
                    ...(isArabicText(entry.question)
                      ? { fontFamily: ARABIC_FONT }
                      : {}),
                  }}
                >
                  {entry.question}
                </div>

                {/* Answer */}
                {notFound ? (
                  <EmptyState
                    size="compact"
                    header="Not found in source documents"
                    description={entry.result.answer_md || undefined}
                  />
                ) : (
                  <div
                    className="docintel-ask-md"
                    {...(answerArabic ? { dir: "rtl", lang: "ar" } : {})}
                    style={{
                      color: "var(--ds-text)",
                      fontSize: 14,
                      lineHeight: 1.7,
                      ...(answerArabic
                        ? {
                            fontFamily: ARABIC_FONT,
                            textAlign: "right",
                            unicodeBidi: "plaintext",
                          }
                        : {}),
                    }}
                  >
                    {renderWithCitations(
                      entry.result.answer_md,
                      entry.result.citations,
                      (citation) => setActive(citation),
                      answerArabic,
                    )}
                  </div>
                )}

                {/* Confidence + freshness */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    flexWrap: "wrap",
                    marginTop: "var(--ds-space-100)",
                  }}
                >
                  <Lozenge appearance={groundingAppearance(entry.result.confidence)}>
                    {`confidence ${pctLabel(entry.result.confidence)}`}
                  </Lozenge>
                  <span style={{ fontSize: 12, color: "var(--ds-text-subtle)" }}>
                    {entry.result.citations.length} source
                    {entry.result.citations.length === 1 ? "" : "s"} cited
                  </span>
                  {latestSourceAt && (
                    <span style={{ fontSize: 12, color: "var(--ds-text-subtle)" }}>
                      Sources updated{" "}
                      {formatDistanceToNow(new Date(latestSourceAt), { addSuffix: true })}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Citation evidence drawer */}
      <CatalystDrawer
        isOpen={!!active}
        onClose={() => setActive(null)}
        label="Source evidence"
        width="medium"
      >
        {active && (
          <div style={{ padding: 24 }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12 }}>
              <Lozenge appearance="new">
                {typeof active.page_number === "number"
                  ? `p.${active.page_number}`
                  : `E${active.marker}`}
              </Lozenge>
            </div>

            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--ds-text-subtle)", marginBottom: 4 }}>
                Quoted from source
              </div>
              {active.quoted_text?.trim() ? (
                <blockquote
                  dir="auto"
                  style={{
                    margin: 0,
                    padding: "var(--ds-space-100) var(--ds-space-150)",
                    borderInlineStart: "3px solid var(--ds-border-focused)",
                    background: "var(--ds-surface-sunken)",
                    borderRadius: 6,
                    color: "var(--ds-text)",
                    fontSize: 14,
                    unicodeBidi: "plaintext",
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {active.quoted_text}
                </blockquote>
              ) : (
                <p style={{ margin: 0, color: "var(--ds-text-subtlest)" }}>{DASH}</p>
              )}
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 6,
                fontSize: 13,
                color: "var(--ds-text-subtle)",
              }}
            >
              <span>
                Document:{" "}
                <span dir="auto" style={{ color: "var(--ds-text)", unicodeBidi: "plaintext" }}>
                  {active.document_title?.trim() || DASH}
                </span>
              </span>
              <span>
                Page:{" "}
                <span style={{ color: "var(--ds-text)" }}>
                  {typeof active.page_number === "number" ? active.page_number : DASH}
                </span>
              </span>
              <span>
                Source updated:{" "}
                <span style={{ color: "var(--ds-text)" }}>
                  {active.document_updated_at
                    ? formatDistanceToNow(new Date(active.document_updated_at), {
                        addSuffix: true,
                      })
                    : DASH}
                </span>
              </span>
            </div>
          </div>
        )}
      </CatalystDrawer>
    </div>
  );
}

export default AskPanel;
