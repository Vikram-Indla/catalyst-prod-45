/**
 * DocintelUploadPage — enterprise upload wizard.
 *
 * Steps (CatalystProgressTracker): Upload → Processing → Review.
 *  - Upload: react-dropzone (.pdf/.docx/.xlsx/.png/.jpg, 1–3 files, 50MB each), file cards,
 *    per-file progress bars on submit.
 *  - Processing: LIVE per-page progress from Realtime (X of N extracted),
 *    per-file status lozenges, elapsed-seconds ticker (the ≤60s NFR D6 budget
 *    is visible as "Elapsed 12s"). On ready → success; on failure → retry.
 *  - Review: success state with "Open workspace".
 *
 * ADS tokens only. CAT-DOCINTEL-ARABIC-RAG-20260706-001
 */
import { useCallback, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDropzone } from "react-dropzone";
import { PageHeader } from "@/components/ads/PageHeader";
import { Breadcrumbs } from "@/components/ads/Breadcrumbs";
import { Button, Lozenge, SectionMessage } from "@/components/ads";
import { CatalystProgressTracker } from "@/components/ads/CatalystProgressTracker";
import { Upload, X, FileText } from "@/lib/atlaskit-icons";
import { useAuth } from "@/hooks/useAuth";
import { docintelRoutes } from "@/lib/routes";
import {
  useDocintelProjects,
  useDocintelUpload,
  useDocumentRealtime,
} from "../hooks/useDocintel";
import { useActiveDocintelProject } from "../hooks/useActiveDocintelProject";
import { PdfThumbnails } from "../components/PdfThumbnails";
import { ProcessingStatusBoard } from "../components/ProcessingStatusBoard";
import type {
  DocintelIngestCreated,
  DocintelIngestResult,
  DocintelStatus,
} from "../types";

const MAX_FILES = 3;
const MAX_BYTES = 50 * 1024 * 1024;
const ACCEPT = {
  "application/pdf": [".pdf"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
  "image/png": [".png"],
  "image/jpeg": [".jpg", ".jpeg"],
};

type WizardStep = "upload" | "processing" | "review";

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Format a latency_ms total as "42s" (or "820ms" under a second). */
function formatMs(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(ms < 10_000 ? 1 : 0)}s`;
}

/**
 * Live processing panel for a single ingested document: the rich stage +
 * per-page status board (Realtime-driven), plus the terminal CTAs (Open
 * workspace on ready / Retry on failure). On ready it also surfaces the source
 * preview + a compact summary (pages, language, total latency).
 */
function ProcessingPanel({
  result,
  file,
  startedAt,
  onOpen,
  onRetry,
}: {
  result: DocintelIngestCreated;
  file: File | undefined;
  startedAt: number;
  onOpen: (slug: string) => void;
  onRetry: () => void;
}) {
  const { document } = useDocumentRealtime(result.documentId);
  const status = (document?.status ?? "ingesting") as DocintelStatus;
  const isReady = status === "ready" || status === "needs_review";
  const isFailed = status === "failed";

  const totalMs = document?.latency_ms?.total_ms ?? null;
  const pageCount = document?.page_count ?? result.pageCount ?? null;
  const language = document?.source_language ?? null;

  return (
    <div style={{ marginBottom: 12 }}>
      <ProcessingStatusBoard documentId={result.documentId} startedAt={startedAt} />

      {isReady && (
        <div
          style={{
            border: "1px solid var(--ds-border)",
            borderRadius: 8,
            padding: 16,
            background: "var(--ds-surface-raised)",
          }}
        >
          {file && (
            <div style={{ marginBottom: 12 }}>
              <PdfThumbnails file={file} />
            </div>
          )}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
            <Lozenge appearance="default">
              {`${pageCount ?? "—"} page${pageCount === 1 ? "" : "s"}`}
            </Lozenge>
            {language ? <Lozenge appearance="default">{language}</Lozenge> : null}
            {typeof totalMs === "number" ? (
              <Lozenge appearance="success">{`Total ${formatMs(totalMs)}`}</Lozenge>
            ) : null}
          </div>
        </div>
      )}

      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        {isReady && result.slug && (
          <Button appearance="primary" onClick={() => onOpen(result.slug!)}>
            Open workspace
          </Button>
        )}
        {isFailed && (
          <Button appearance="default" onClick={onRetry}>
            Retry
          </Button>
        )}
      </div>
    </div>
  );
}

export default function DocintelUploadPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const projectsQuery = useDocintelProjects(user?.id);
  const projects = projectsQuery.data ?? [];
  const { activeProject } = useActiveDocintelProject(projects);

  const [files, setFiles] = useState<File[]>([]);
  const [step, setStep] = useState<WizardStep>("upload");
  const [results, setResults] = useState<DocintelIngestResult[]>([]);
  const [startedAt, setStartedAt] = useState(0);

  const upload = useDocintelUpload();

  const onDrop = useCallback((accepted: File[]) => {
    setFiles((prev) => {
      const merged = [...prev];
      for (const f of accepted) {
        if (
          f.size <= MAX_BYTES &&
          merged.length < MAX_FILES &&
          !merged.some((m) => m.name === f.name && m.size === f.size)
        ) {
          merged.push(f);
        }
      }
      return merged.slice(0, MAX_FILES);
    });
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPT,
    multiple: true,
    maxSize: MAX_BYTES,
    disabled: files.length >= MAX_FILES,
  });

  const removeFile = (name: string, size: number) =>
    setFiles((prev) => prev.filter((f) => !(f.name === name && f.size === size)));

  const submit = async () => {
    if (!activeProject || files.length === 0) return;
    setStartedAt(Date.now());
    setStep("processing");
    try {
      const res = await upload.mutateAsync({ projectId: activeProject.id, files });
      setResults(res);
    } catch {
      // toast already fired in the hook; return to upload step
      setStep("upload");
    }
  };

  const retry = () => {
    upload.setProgress({});
    setResults([]);
    setStep("upload");
  };

  const stages = useMemo(
    () =>
      [
        { id: "upload", label: "Upload", key: "upload" },
        { id: "processing", label: "Processing", key: "processing" },
        { id: "review", label: "Review", key: "review" },
      ].map((s) => ({
        id: s.id,
        label: s.label,
        status: (s.key === step
          ? "current"
          : (["upload", "processing", "review"].indexOf(s.key) <
            ["upload", "processing", "review"].indexOf(step))
          ? "visited"
          : "unvisited") as "current" | "visited" | "unvisited",
      })),
    [step],
  );

  return (
    <div style={{ padding: 24, maxWidth: 760, fontFamily: "var(--ds-font-family-body)" }}>
      <PageHeader
        title="Upload documents"
        breadcrumbs={
          <Breadcrumbs
            items={[
              { key: "docs", text: "Document Intelligence", onClick: () => navigate(docintelRoutes.list()) },
              { key: "upload", text: "Upload", isCurrent: true },
            ]}
          />
        }
      />

      <div style={{ margin: "16px 0 28px" }}>
        <CatalystProgressTracker stages={stages} />
      </div>

      {!activeProject ? (
        <SectionMessage appearance="warning" title="No project">
          You are not a member of any project. Documents must belong to a project.
        </SectionMessage>
      ) : step === "upload" ? (
        <>
          <div
            {...getRootProps()}
            style={{
              border: `2px dashed ${isDragActive ? "var(--ds-border-focused)" : "var(--ds-border)"}`,
              borderRadius: 8,
              padding: 32,
              textAlign: "center",
              cursor: files.length >= MAX_FILES ? "not-allowed" : "pointer",
              background: isDragActive ? "var(--ds-background-selected)" : "var(--ds-surface-sunken)",
              color: "var(--ds-text-subtle)",
            }}
          >
            <input {...getInputProps()} />
            <Upload size={24} />
            <p style={{ margin: "8px 0 0", color: "var(--ds-text)" }}>
              {isDragActive
                ? "Drop files here"
                : "Drag PDF, Word, Excel, or image files here, or click to browse"}
            </p>
            <p style={{ margin: "4px 0 0", fontSize: 13 }}>
              Up to {MAX_FILES} files, 50MB each
            </p>
          </div>

          {files.length > 0 && (
            <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 8 }}>
              {files.map((f) => (
                <div
                  key={`${f.name}-${f.size}`}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 10,
                    border: "1px solid var(--ds-border)",
                    borderRadius: 6,
                    padding: "10px 12px",
                    background: "var(--ds-surface-raised)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <span style={{ display: "flex", gap: 8, alignItems: "center", color: "var(--ds-text)" }}>
                      <FileText size={16} />
                      <span>{f.name}</span>
                      <span style={{ color: "var(--ds-text-subtlest)", fontSize: 13 }}>
                        {formatFileSize(f.size)}
                      </span>
                    </span>
                    <Button
                      appearance="subtle"
                      iconBefore={<X size={14} />}
                      onClick={() => removeFile(f.name, f.size)}
                      aria-label={`Remove ${f.name}`}
                    />
                  </div>
                  <PdfThumbnails file={f} />
                </div>
              ))}
            </div>
          )}

          <div style={{ marginTop: 20, display: "flex", gap: 8 }}>
            <Button
              appearance="primary"
              isDisabled={files.length === 0 || upload.isPending}
              onClick={submit}
            >
              Upload and process
            </Button>
            <Button appearance="subtle" onClick={() => navigate(docintelRoutes.list())}>
              Cancel
            </Button>
          </div>
        </>
      ) : (
        <>
          {results.length === 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {files.map((f) => (
                <div
                  key={`${f.name}-${f.size}`}
                  style={{
                    border: "1px solid var(--ds-border)",
                    borderRadius: 6,
                    padding: "10px 12px",
                    background: "var(--ds-surface-raised)",
                    color: "var(--ds-text)",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span>{f.name}</span>
                    <span style={{ color: "var(--ds-text-subtle)", fontSize: 13 }}>
                      {upload.progress[f.name] ?? 0}%
                    </span>
                  </div>
                  <div
                    style={{
                      height: 4,
                      borderRadius: 2,
                      background: "var(--ds-background-neutral)",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        width: `${upload.progress[f.name] ?? 0}%`,
                        height: "100%",
                        background: "var(--ds-background-brand-bold)",
                        transition: "width 200ms ease",
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            results.map((r, i) =>
              r.duplicate ? (
                // Exact duplicate — nothing was created; link to the existing doc.
                <div
                  key={`dup-${r.existing.id}-${i}`}
                  style={{ marginBottom: 12 }}
                >
                  <SectionMessage
                    appearance="information"
                    title="Duplicate document"
                    actions={
                      r.existing.slug
                        ? [{
                            key: "open",
                            text: "Open existing document",
                            onClick: () =>
                              navigate(docintelRoutes.workspace(r.existing.slug!)),
                          }]
                        : undefined
                    }
                  >
                    {`Identical document already exists: ${r.existing.title ?? "Untitled"}`}
                  </SectionMessage>
                </div>
              ) : (
                <ProcessingPanel
                  key={r.documentId}
                  result={r}
                  file={files[i]}
                  startedAt={startedAt}
                  onOpen={(slug) => navigate(docintelRoutes.workspace(slug))}
                  onRetry={retry}
                />
              )
            )
          )}
        </>
      )}
    </div>
  );
}
