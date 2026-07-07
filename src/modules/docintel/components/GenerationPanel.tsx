/**
 * GenerationPanel — the Artifacts tab body.
 *
 * Top: an artifact-type button group + a primary Generate button. While
 * generating, an elapsed-seconds ticker makes the ≤60s budget visible. Below:
 * previously generated artifacts for this document as rows (type, title,
 * grounding-score Lozenge, status Lozenge, created time). Clicking a row opens
 * the ArtifactView for that artifact.
 *
 * ADS tokens only. Canonical components only.
 * CAT-DOCINTEL-ARABIC-RAG-20260706-001
 */
import { useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import {
  Button,
  Lozenge,
  Spinner,
  EmptyState,
  SectionMessage,
} from "@/components/ads";
import { useArtifacts, useGenerateArtifact } from "../hooks/useDocintel";
import type { DocintelArtifact, DocintelArtifactType } from "../types";
import { ArtifactView } from "./ArtifactView";
import {
  ARTIFACT_TYPES,
  ARTIFACT_TYPE_LABELS,
  type DocintelGeneratedArtifactType,
} from "./artifactTypes";
import { groundingAppearance, pctLabel } from "./confidence";
import type { LozengeAppearance } from "@/components/ads";

const DASH = "—";

function statusAppearance(status: string): LozengeAppearance {
  switch (status) {
    case "ready":
    case "approved":
    case "promoted":
      return "success";
    case "failed":
    case "rejected":
      return "removed";
    case "needs_review":
      return "moved";
    default:
      return "inprogress";
  }
}

/** Elapsed-seconds ticker while a generation is in flight (≤60s NFR budget). */
function ElapsedTicker() {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const start = Date.now();
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - start) / 1000)), 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8, color: "var(--ds-text-subtle)", fontSize: 13 }}>
      <Spinner size="small" />
      Generating… {elapsed}s
    </span>
  );
}

export interface GenerationPanelProps {
  projectId: string;
  documentId: string;
}

export function GenerationPanel({ projectId, documentId }: GenerationPanelProps) {
  const { data: artifacts, isLoading, isError, error } = useArtifacts(projectId, documentId);
  const generate = useGenerateArtifact();
  const [selectedType, setSelectedType] = useState<DocintelGeneratedArtifactType>(
    ARTIFACT_TYPES[0].value,
  );
  const [openArtifactId, setOpenArtifactId] = useState<string | null>(null);

  const onGenerate = () => {
    generate.mutate(
      // The S4 grounded types are accepted by docintel-generate + the DB CHECK;
      // DocintelArtifactType (types.ts) is the narrower pre-S4 union.
      { projectId, documentIds: [documentId], artifactType: selectedType as DocintelArtifactType },
      {
        onSuccess: (res) => setOpenArtifactId(res.artifactId),
      },
    );
  };

  return (
    <div style={{ paddingTop: 16 }}>
      {/* Type selector */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
        {ARTIFACT_TYPES.map((t) => (
          <Button
            key={t.value}
            appearance={selectedType === t.value ? "primary" : "default"}
            onClick={() => setSelectedType(t.value)}
            isDisabled={generate.isPending}
          >
            <span {...(t.arabic ? { dir: "rtl", lang: "ar" } : {})}>{t.label}</span>
          </Button>
        ))}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20 }}>
        <Button appearance="primary" isDisabled={generate.isPending} onClick={onGenerate}>
          Generate
        </Button>
        {generate.isPending && <ElapsedTicker />}
      </div>

      {generate.isError && (
        <div style={{ marginBottom: 16 }}>
          <SectionMessage appearance="error" title="Generation failed">
            {generate.error instanceof Error ? generate.error.message : "Please try again."}
          </SectionMessage>
        </div>
      )}

      {/* Existing artifacts */}
      {isLoading ? (
        <div style={{ padding: 32, display: "flex", justifyContent: "center" }}>
          <Spinner size="medium" />
        </div>
      ) : isError ? (
        <SectionMessage appearance="error" title="Could not load artifacts">
          {error instanceof Error ? error.message : "Please try again."}
        </SectionMessage>
      ) : (artifacts?.length ?? 0) === 0 ? (
        <EmptyState
          size="compact"
          header="No artifacts yet"
          description="Pick a type above and generate your first artifact from this document."
        />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {(artifacts ?? []).map((a: DocintelArtifact) => (
            <button
              key={a.id}
              type="button"
              onClick={() => setOpenArtifactId(a.id)}
              style={{
                textAlign: "start",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                border: "1px solid var(--ds-border)",
                borderRadius: 6,
                padding: "10px 12px",
                background: "var(--ds-surface-raised)",
                color: "var(--ds-text)",
                cursor: "pointer",
                font: "inherit",
              }}
            >
              <span style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
                <span style={{ fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {a.title?.trim() || ARTIFACT_TYPE_LABELS[a.artifact_type] || a.artifact_type}
                </span>
                <span style={{ fontSize: 12, color: "var(--ds-text-subtle)" }}>
                  {ARTIFACT_TYPE_LABELS[a.artifact_type] ?? a.artifact_type} ·{" "}
                  {a.created_at
                    ? formatDistanceToNow(new Date(a.created_at), { addSuffix: true })
                    : DASH}
                </span>
              </span>
              <span style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
                <Lozenge appearance={groundingAppearance(a.grounding_score)}>
                  {`grounding ${pctLabel(a.grounding_score)}`}
                </Lozenge>
                <Lozenge appearance={statusAppearance(String(a.status))}>
                  {String(a.status).replace(/_/g, " ")}
                </Lozenge>
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Selected artifact detail */}
      {openArtifactId && (
        <div
          style={{
            marginTop: 20,
            border: "1px solid var(--ds-border)",
            borderRadius: 8,
            padding: 16,
            background: "var(--ds-surface)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 4 }}>
            <Button appearance="subtle" onClick={() => setOpenArtifactId(null)}>
              Close
            </Button>
          </div>
          <ArtifactView artifactId={openArtifactId} />
        </div>
      )}
    </div>
  );
}

export default GenerationPanel;
