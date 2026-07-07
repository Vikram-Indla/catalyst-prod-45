/**
 * ProcessingStatusBoard — the live processing view for ONE document (by id).
 *
 * Subscribes to Realtime (ai_documents + ai_document_pages via
 * useDocumentRealtime) and renders three things:
 *
 *  1. STAGE STEPPER — Uploaded → Extracting → Translating → Embedding → Ready.
 *     The current stage is derived from ai_documents.status (see stageIndex):
 *       queued / ingesting                     → Uploaded (active)
 *       extracting / describing                → Extracting
 *       translating                            → Translating
 *       chunking / embedding / structuring     → Embedding
 *       ready                                  → Ready (all passed)
 *       failed                                 → error (stepper frozen)
 *       needs_review                           → treated as Ready (terminal-ish)
 *     Passed stages show a check, the active stage a spinner + elapsed ticker.
 *
 *  2. PER-PAGE GRID — one Lozenge per page (page_count cells), coloured by that
 *     page's status. Scanned pages get an "OCR" tag. Shows "X of N extracted".
 *
 *  3. LATENCY BREAKDOWN — labelled Lozenges for each latency_ms stage once
 *     present, and a prominent "Ready in Ns" when total_ms is known.
 *
 * Zero-assumption: unknown values render a dash / are omitted. ADS tokens only.
 * CAT-DOCINTEL-ARABIC-RAG-20260706-001
 */
import { useEffect, useState } from "react";
import { Lozenge, SectionMessage, Spinner } from "@/components/ads";
import type { LozengeAppearance } from "@/components/ads";
import { CheckCircle } from "@/lib/atlaskit-icons";
import { useDocumentRealtime } from "../hooks/useDocintel";
import type { DocintelPage, DocintelStatus } from "../types";

const PIPELINE = [
  "Uploaded",
  "Extracting",
  "Translating",
  "Embedding",
  "Ready",
] as const;

type StageState = "passed" | "active" | "pending" | "error";

/**
 * Map ai_documents.status → the furthest pipeline index reached (0-based over
 * PIPELINE). `ready`/`needs_review` reach the final index; `failed` is handled
 * separately so the stepper freezes at the last known-good stage.
 */
function stageIndex(status: DocintelStatus): number {
  switch (status) {
    case "queued":
    case "ingesting":
      return 0; // Uploaded
    case "extracting":
    case "describing":
      return 1; // Extracting
    case "translating":
      return 2; // Translating
    case "chunking":
    case "embedding":
    case "structuring":
      return 3; // Embedding
    case "ready":
    case "needs_review":
      return 4; // Ready
    case "failed":
      return 1; // frozen — failures surface after extract in this pipeline
    default:
      return 0;
  }
}

function pageStatusAppearance(status: string): LozengeAppearance {
  switch (status) {
    case "extracted":
    case "described":
      return "success";
    case "failed":
      return "removed";
    case "extracting":
      return "inprogress";
    case "pending":
    default:
      return "default";
  }
}

/** Human label for a latency key: "ingest_ms" → "Ingest". */
function latencyLabel(key: string): string {
  const base = key.replace(/_ms$/, "").replace(/_/g, " ");
  return base.charAt(0).toUpperCase() + base.slice(1);
}

/** ms → "42s" (or "820ms" under a second). */
function formatMs(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(ms < 10_000 ? 1 : 0)}s`;
}

function StageStepper({
  currentIndex,
  isFailed,
  isReady,
  elapsed,
}: {
  currentIndex: number;
  isFailed: boolean;
  isReady: boolean;
  elapsed: number;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        gap: 8,
        marginBottom: 16,
      }}
    >
      {PIPELINE.map((label, i) => {
        let state: StageState;
        if (isReady) state = "passed";
        else if (isFailed && i >= currentIndex) state = i === currentIndex ? "error" : "pending";
        else if (i < currentIndex) state = "passed";
        else if (i === currentIndex) state = "active";
        else state = "pending";

        const color =
          state === "passed"
            ? "var(--ds-text-success)"
            : state === "error"
            ? "var(--ds-text-danger)"
            : state === "active"
            ? "var(--ds-text)"
            : "var(--ds-text-subtlest)";

        return (
          <div key={label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                fontSize: 13,
                fontWeight: state === "active" ? 600 : 500,
                color,
              }}
            >
              {state === "passed" ? (
                <span style={{ color: "var(--ds-icon-success)", display: "inline-flex" }}>
                  <CheckCircle size={16} />
                </span>
              ) : state === "active" ? (
                <Spinner size="small" aria-label={`${label} in progress`} />
              ) : (
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background:
                      state === "error"
                        ? "var(--ds-background-danger-bold)"
                        : "var(--ds-border)",
                    display: "inline-block",
                  }}
                />
              )}
              {label}
              {state === "active" && !isReady && (
                <span style={{ color: "var(--ds-text-subtle)", fontWeight: 400 }}>
                  {` ${elapsed}s`}
                </span>
              )}
            </span>
            {i < PIPELINE.length - 1 && (
              <span
                aria-hidden
                style={{
                  width: 20,
                  height: 1,
                  background: "var(--ds-border)",
                  display: "inline-block",
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function PageGrid({
  pages,
  total,
}: {
  pages: DocintelPage[];
  total: number;
}) {
  const extracted = pages.filter(
    (p) => p.status === "extracted" || p.status === "described",
  ).length;

  // Render a cell per known page. If the row set hasn't arrived yet but a
  // page_count is known, render placeholder cells so the scale is legible.
  const cells: Array<{ key: string; number: number; page: DocintelPage | null }> =
    pages.length > 0
      ? pages.map((p) => ({ key: p.id, number: p.page_number, page: p }))
      : Array.from({ length: total }, (_, i) => ({
          key: `placeholder-${i + 1}`,
          number: i + 1,
          page: null,
        }));

  if (cells.length === 0) return null;

  return (
    <div style={{ marginBottom: 16 }}>
      <p style={{ fontSize: 13, color: "var(--ds-text-subtle)", margin: "0 0 8px" }}>
        {`${extracted} of ${total || cells.length} page${
          (total || cells.length) === 1 ? "" : "s"
        } extracted`}
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {cells.map((c) => (
          <span key={c.key} style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
            <Lozenge appearance={c.page ? pageStatusAppearance(c.page.status) : "default"}>
              {`P${c.number}`}
            </Lozenge>
            {c.page?.is_scanned ? (
              <Lozenge appearance="moved">OCR</Lozenge>
            ) : null}
          </span>
        ))}
      </div>
    </div>
  );
}

function LatencyBreakdown({
  latency,
}: {
  latency: Record<string, number> & { total_ms?: number };
}) {
  const entries = Object.entries(latency).filter(
    ([k, v]) => k !== "total_ms" && typeof v === "number",
  );
  if (entries.length === 0) return null;

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
      {entries.map(([k, v]) => (
        <Lozenge key={k} appearance="default">
          {`${latencyLabel(k)} ${formatMs(v)}`}
        </Lozenge>
      ))}
    </div>
  );
}

export interface ProcessingStatusBoardProps {
  documentId: string;
  /** Wizard start time (ms epoch), so the elapsed ticker matches the whole run. */
  startedAt: number;
}

export function ProcessingStatusBoard({
  documentId,
  startedAt,
}: ProcessingStatusBoardProps) {
  const { document, pages } = useDocumentRealtime(documentId);
  const [elapsed, setElapsed] = useState(0);

  const status = (document?.status ?? "ingesting") as DocintelStatus;
  const isReady = status === "ready" || status === "needs_review";
  const isFailed = status === "failed";
  const isTerminal = isReady || isFailed;

  useEffect(() => {
    if (isTerminal) return;
    const id = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, [isTerminal, startedAt]);

  const total = document?.page_count ?? pages.length;
  const latency = document?.latency_ms ?? null;
  const totalMs = latency?.total_ms ?? null;

  return (
    <div
      style={{
        border: "1px solid var(--ds-border)",
        borderRadius: 8,
        padding: 16,
        marginBottom: 12,
        background: "var(--ds-surface-raised)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 12,
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <span style={{ fontWeight: 600, color: "var(--ds-text)" }}>
          {document?.title ?? "Document"}
        </span>
        {isReady && typeof totalMs === "number" ? (
          <Lozenge appearance="success" isBold>
            {`Ready in ${formatMs(totalMs)}`}
          </Lozenge>
        ) : (
          <Lozenge
            appearance={isReady ? "success" : isFailed ? "removed" : "inprogress"}
          >
            {status.replace(/_/g, " ")}
          </Lozenge>
        )}
      </div>

      {document?.status_detail ? (
        <p style={{ fontSize: 13, color: "var(--ds-text-subtle)", margin: "0 0 12px" }}>
          {document.status_detail}
        </p>
      ) : null}

      <StageStepper
        currentIndex={stageIndex(status)}
        isFailed={isFailed}
        isReady={isReady}
        elapsed={elapsed}
      />

      <PageGrid pages={pages} total={total} />

      {latency ? <LatencyBreakdown latency={latency} /> : null}

      {isFailed ? (
        <div style={{ marginTop: 12 }}>
          <SectionMessage appearance="error" title="Processing failed">
            {document?.error_message ?? "The document could not be processed."}
          </SectionMessage>
        </div>
      ) : null}
    </div>
  );
}
