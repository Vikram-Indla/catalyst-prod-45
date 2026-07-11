/**
 * GenerationPanel — the Artifacts tab body.
 *
 * Top: artifact types grouped by customer outcome plus a primary Generate
 * button. While generating, an elapsed-seconds ticker makes the ≤60s budget
 * visible. Below: previously generated artifacts in the canonical JiraTable.
 * Clicking a row opens the ArtifactView for that artifact.
 *
 * ADS tokens only. Canonical components only.
 * CAT-DOCINTEL-ARABIC-RAG-20260706-001
 */
import { useEffect, useMemo, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import {
  Button,
  Heading,
  Lozenge,
  Spinner,
  EmptyState,
  SectionMessage,
} from "@/components/ads";
import { JiraTable } from "@/components/shared/JiraTable";
import type { Column } from "@/components/shared/JiraTable/types";
import { useArtifacts, useGenerateArtifact } from "../hooks/useDocintel";
import type { DocintelArtifact, DocintelArtifactType } from "../types";
import { ArtifactView } from "./ArtifactView";
import {
  ARTIFACT_TYPES,
  ARTIFACT_TYPE_LABELS,
  ARTIFACT_OUTCOME_GROUPS,
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
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "var(--ds-space-100)",
        color: "var(--ds-text-subtle)",
        font: "var(--ds-font-body-small)",
      }}
    >
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

  const artifactColumns = useMemo<Column<DocintelArtifact>[]>(
    () => [
      {
        id: "title",
        label: "Title",
        flex: true,
        alwaysVisible: true,
        accessor: (artifact) => artifact.title,
        cell: ({ row }) => (
          <span
            dir="auto"
            style={{
              color: "var(--ds-text-brand)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              unicodeBidi: "plaintext",
              whiteSpace: "nowrap",
            }}
          >
            {row.title?.trim() || ARTIFACT_TYPE_LABELS[row.artifact_type] || row.artifact_type}
          </span>
        ),
      },
      {
        id: "type",
        label: "Type",
        width: 18,
        accessor: (artifact) => artifact.artifact_type,
        cell: ({ row }) => (
          <span>{ARTIFACT_TYPE_LABELS[row.artifact_type] ?? row.artifact_type}</span>
        ),
      },
      {
        id: "grounding",
        label: "Grounding",
        width: 15,
        accessor: (artifact) => artifact.grounding_score,
        cell: ({ row }) => (
          <Lozenge appearance={groundingAppearance(row.grounding_score)}>
            {pctLabel(row.grounding_score)}
          </Lozenge>
        ),
      },
      {
        id: "review_state",
        label: "Review state",
        width: 15,
        accessor: (artifact) => artifact.status,
        cell: ({ row }) => (
          <Lozenge appearance={statusAppearance(String(row.status))}>
            {String(row.status).replace(/_/g, " ")}
          </Lozenge>
        ),
      },
      {
        id: "created",
        label: "Created",
        width: 16,
        accessor: (artifact) => artifact.created_at,
        cell: ({ row }) => (
          <span style={{ color: "var(--ds-text-subtle)" }}>
            {row.created_at
              ? formatDistanceToNow(new Date(row.created_at), { addSuffix: true })
              : DASH}
          </span>
        ),
      },
    ],
    [],
  );

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

  const selectedOption = ARTIFACT_TYPES.find((type) => type.value === selectedType);

  return (
    <div style={{ paddingTop: "var(--ds-space-200)" }}>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "var(--ds-space-300)",
          marginBottom: "var(--ds-space-250)",
        }}
      >
        {ARTIFACT_OUTCOME_GROUPS.map((group) => {
          const options = ARTIFACT_TYPES.filter((type) => type.outcome === group.id);
          return (
            <div key={group.id}>
              <Heading as="h3" size="small">
                {group.label}
              </Heading>
              <p
                style={{
                  color: "var(--ds-text-subtle)",
                  font: "var(--ds-font-body-small)",
                  margin: "var(--ds-space-050) 0 var(--ds-space-150)",
                }}
              >
                {group.description}
              </p>
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "var(--ds-space-100)",
                }}
              >
                {options.map((type) => (
                  <Button
                    key={type.value}
                    appearance={selectedType === type.value ? "primary" : "default"}
                    onClick={() => setSelectedType(type.value)}
                    isDisabled={generate.isPending}
                    aria-label={`${type.label}: ${type.description}`}
                  >
                    <span {...(type.arabic ? { dir: "rtl", lang: "ar" } : {})}>
                      {type.label}
                    </span>
                  </Button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "var(--ds-space-200)",
          marginBottom: "var(--ds-space-250)",
        }}
      >
        <Button appearance="primary" isDisabled={generate.isPending} onClick={onGenerate}>
          {selectedOption ? `Generate ${selectedOption.label}` : "Generate"}
        </Button>
        {generate.isPending && <ElapsedTicker />}
      </div>

      {generate.isError && (
        <div style={{ marginBottom: "var(--ds-space-200)" }}>
          <SectionMessage appearance="error" title="Generation failed">
            {generate.error instanceof Error ? generate.error.message : "Please try again."}
          </SectionMessage>
        </div>
      )}

      {/* Existing artifacts */}
      {isLoading ? (
        <div
          style={{
            padding: "var(--ds-space-400)",
            display: "flex",
            justifyContent: "center",
          }}
        >
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
        <JiraTable<DocintelArtifact>
          columns={artifactColumns}
          data={artifacts ?? []}
          getRowId={(artifact) => artifact.id}
          onRowClick={(artifact) => setOpenArtifactId(artifact.id)}
          ariaLabel="Generated deliverables"
        />
      )}

      {/* Selected artifact detail */}
      {openArtifactId && (
        <div
          style={{
            marginTop: "var(--ds-space-250)",
            border: "var(--ds-border-width) solid var(--ds-border)",
            borderRadius: "var(--ds-border-radius-100)",
            padding: "var(--ds-space-200)",
            background: "var(--ds-surface)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              marginBottom: "var(--ds-space-050)",
            }}
          >
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
