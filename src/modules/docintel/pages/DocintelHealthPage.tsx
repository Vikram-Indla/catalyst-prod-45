/**
 * DocintelHealthPage — project-level Knowledge Health rollup.
 *
 * The per-document ProcessingStatusBoard shows one document's pipeline; this is
 * the cross-document view: coverage, freshness, failures, attention items and
 * reservoir size for every AI document in a project. Read-only.
 *
 * Zero-assumption rendering: unknown values render an em-dash, never a guess.
 *
 * CAT-DOCINTEL-HEALTH-20260707-001
 */
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { PageHeader } from "@/components/ads/PageHeader";
import { Breadcrumbs } from "@/components/ads/Breadcrumbs";
import {
  Button,
  Heading,
  Lozenge,
  Select,
  Spinner,
  EmptyState,
} from "@/components/ads";
import type { LozengeAppearance } from "@/components/ads";
import { JiraTable } from "@/components/shared/JiraTable";
import type { Column } from "@/components/shared/JiraTable/types";
import { useAuth } from "@/hooks/useAuth";
import { docintelRoutes } from "@/lib/routes";
import { useDocintelProjects } from "../hooks/useDocintel";
import { useActiveDocintelProject } from "../hooks/useActiveDocintelProject";
import { useDocintelHealth } from "../hooks/useDocintelHealth";
import type { DocintelDocument, DocintelStatus } from "../types";

const DASH = "—";

function statusAppearance(status: DocintelStatus): LozengeAppearance {
  switch (status) {
    case "ready":
      return "success";
    case "failed":
      return "removed";
    case "needs_review":
      return "moved";
    case "queued":
      return "default";
    default:
      return "inprogress";
  }
}

const statusLabel = (status: DocintelStatus) => status.replace(/_/g, " ");

/** total_ms → "42s" / "1m 05s"; DASH when absent. */
function formatMs(ms: number | null): string {
  if (typeof ms !== "number" || ms <= 0) return DASH;
  const secs = Math.round(ms / 1000);
  if (secs < 60) return `${secs}s`;
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}m ${String(s).padStart(2, "0")}s`;
}

const formatPct = (v: number | null) =>
  typeof v === "number" ? `${Math.round(v)}%` : DASH;

/** grounding_score is 0–1; show as a percentage. */
const formatGrounding = (v: number | null) =>
  typeof v === "number" ? `${Math.round(v * 100)}%` : DASH;

const formatCount = (v: number | null) =>
  typeof v === "number" ? v.toLocaleString() : DASH;

/** Pull a numeric count out of an ai_sync_runs.counts jsonb, or null. */
function syncCount(
  counts: Record<string, number> | null | undefined,
  key: string,
): number | null {
  const v = counts?.[key];
  return typeof v === "number" ? v : null;
}

/** One KPI tile — token-styled to match the docintel surface (ds-* + ads). */
function StatTile({
  label,
  value,
  hint,
  emphasis = "default",
}: {
  label: string;
  value: string;
  hint?: string;
  /** "danger" tints the value when the metric represents a problem count. */
  emphasis?: "default" | "danger";
}) {
  return (
    <div
      style={{
        background: "var(--ds-surface-raised)",
        border: "1px solid var(--ds-border)",
        borderRadius: 8,
        padding: "14px 16px",
        display: "flex",
        flexDirection: "column",
        gap: 6,
        minHeight: 88,
      }}
    >
      <span
        style={{
          fontSize: 12,
          fontWeight: 600,
          color: "var(--ds-text-subtle)",
          textTransform: "none",
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontSize: 24,
          fontWeight: 600,
          lineHeight: 1.1,
          color:
            emphasis === "danger"
              ? "var(--ds-text-danger)"
              : "var(--ds-text)",
        }}
      >
        {value}
      </span>
      {hint && (
        <span style={{ fontSize: 12, color: "var(--ds-text-subtlest)" }}>
          {hint}
        </span>
      )}
    </div>
  );
}

export default function DocintelHealthPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const projectsQuery = useDocintelProjects(user?.id);
  const projects = projectsQuery.data ?? [];

  const { activeProject, setActiveProjectKey } = useActiveDocintelProject(projects);

  const healthQuery = useDocintelHealth(activeProject?.id);
  const health = healthQuery.data ?? null;

  const attentionColumns = useMemo<Column<DocintelDocument>[]>(
    () => [
      {
        id: "title",
        label: "Document",
        flex: true,
        alwaysVisible: true,
        cell: ({ row }) => (
          <span
            style={{
              color: "var(--ds-text-brand)",
              cursor: "pointer",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {row.title}
          </span>
        ),
      },
      {
        id: "status",
        label: "Status",
        width: 16,
        cell: ({ row }) => (
          <Lozenge appearance={statusAppearance(row.status)}>
            {statusLabel(row.status)}
          </Lozenge>
        ),
      },
      {
        id: "detail",
        label: "Detail",
        flex: true,
        cell: ({ row }) => (
          <span style={{ color: "var(--ds-text-subtle)" }}>
            {row.error_message || row.status_detail || DASH}
          </span>
        ),
      },
      {
        id: "updated",
        label: "Updated",
        width: 14,
        cell: ({ row }) => (
          <span style={{ color: "var(--ds-text-subtle)" }}>
            {row.updated_at
              ? formatDistanceToNow(new Date(row.updated_at), { addSuffix: true })
              : DASH}
          </span>
        ),
      },
    ],
    [],
  );

  const projectOptions = projects.map((p) => ({ value: p.key, label: p.name }));
  const selectValue = activeProject
    ? { value: activeProject.key, label: activeProject.name }
    : null;

  const loading = projectsQuery.isLoading || healthQuery.isLoading;

  return (
    <div style={{ padding: 24, fontFamily: "var(--ds-font-family-body)" }}>
      <PageHeader
        title="Knowledge Health"
        breadcrumbs={
          <Breadcrumbs
            items={[
              {
                key: "docs",
                text: "Document Intelligence",
                href: docintelRoutes.list(),
              },
              { key: "health", text: "Knowledge Health", isCurrent: true },
            ]}
          />
        }
        actions={
          <Button
            appearance="default"
            onClick={() =>
              navigate(
                activeProject
                  ? `${docintelRoutes.list()}?project=${activeProject.key}`
                  : docintelRoutes.list(),
              )
            }
          >
            View documents
          </Button>
        }
      />

      {projects.length > 1 && (
        <div style={{ margin: "12px 0 20px", maxWidth: 320 }}>
          <Select
            options={projectOptions}
            value={selectValue}
            onChange={(next) => {
              if (next) setActiveProjectKey(String(next.value));
            }}
            aria-label="Project"
            isSearchable
          />
        </div>
      )}

      {loading ? (
        <div style={{ padding: 48, display: "flex", justifyContent: "center" }}>
          <Spinner size="large" />
        </div>
      ) : !activeProject ? (
        <EmptyState
          header="No projects"
          description="You are not a member of any project yet. Knowledge Health is scoped to a project."
        />
      ) : healthQuery.isError ? (
        <EmptyState
          header="Couldn't load Knowledge Health"
          description={
            healthQuery.error instanceof Error
              ? healthQuery.error.message
              : "Please try again."
          }
          primaryAction={
            <Button appearance="primary" onClick={() => healthQuery.refetch()}>
              Retry
            </Button>
          }
        />
      ) : !health || health.total === 0 ? (
        <EmptyState
          header="No documents yet"
          description="Upload documents to this project to start tracking ingestion coverage and health."
          primaryAction={
            <Button
              appearance="primary"
              onClick={() =>
                navigate(`${docintelRoutes.upload()}?project=${activeProject.key}`)
              }
            >
              Upload documents
            </Button>
          }
        />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {/* Coverage + freshness */}
          <section>
            <Heading as="h3" size="small">
              Coverage &amp; freshness
            </Heading>
            <div style={{ height: 12 }} />
            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fill, minmax(180px, 1fr))",
                gap: 12,
              }}
            >
              <StatTile
                label="Documents"
                value={formatCount(health.total)}
                hint={`${health.ready} ready · ${health.inFlight} in progress`}
              />
              <StatTile
                label="Coverage (ready)"
                value={formatPct(health.coveragePct)}
                hint={`${health.ready} of ${health.total} embedded & ready`}
              />
              <StatTile
                label="Avg pipeline time"
                value={formatMs(health.avgDurationMs)}
                hint="Upload → ready, per document"
              />
              <StatTile
                label="Last activity"
                value={
                  health.lastActivityAt
                    ? formatDistanceToNow(new Date(health.lastActivityAt), {
                        addSuffix: true,
                      })
                    : DASH
                }
                hint="Most recent document update"
              />
            </div>
          </section>

          {/* Reservoir + quality */}
          <section>
            <Heading as="h3" size="small">
              Reservoir &amp; quality
            </Heading>
            <div style={{ height: 12 }} />
            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fill, minmax(180px, 1fr))",
                gap: 12,
              }}
            >
              <StatTile
                label="Embeddings"
                value={formatCount(health.embeddingCount)}
                hint="Chunks in the vector store"
              />
              <StatTile
                label="Artifacts"
                value={formatCount(health.artifactCount)}
                hint="Generated (BRD, epic, story…)"
              />
              <StatTile
                label="Avg grounding"
                value={formatGrounding(health.avgGrounding)}
                hint="Citation coverage of artifacts"
              />
              <StatTile
                label="Open issues"
                value={formatCount(health.openIssues)}
                hint="Unresolved extraction issues"
                emphasis={health.openIssues > 0 ? "danger" : "default"}
              />
            </div>
          </section>

          {/* Knowledge debt: unverified knowledge waiting on a human (S6) */}
          <section>
            <Heading as="h3" size="small">
              Knowledge debt
            </Heading>
            <div style={{ height: 12 }} />
            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fill, minmax(180px, 1fr))",
                gap: 12,
              }}
            >
              <StatTile
                label="Facts pending review"
                value={formatCount(health.pendingFacts)}
                hint="Requirement facts awaiting confirm/reject"
                emphasis={health.pendingFacts > 0 ? "danger" : "default"}
              />
              <StatTile
                label="Draft artifacts"
                value={formatCount(health.draftArtifacts)}
                hint="Generated but not yet verified"
              />
              <StatTile
                label="Fact conflicts"
                value={formatCount(health.factConflicts)}
                hint="Cross-document contradictions (unresolved)"
                emphasis={health.factConflicts > 0 ? "danger" : "default"}
              />
              <StatTile
                label="Stale documents"
                value={formatCount(health.staleDocs)}
                hint="No update in over 30 days"
              />
            </div>
          </section>

          {/* Background sync: last docintel-sync run + queue depth (S6) */}
          <section>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Heading as="h3" size="small">
                Background sync
              </Heading>
              {health.lastSyncRun && (
                <Lozenge
                  appearance={
                    health.lastSyncRun.status === "ok" ? "success" : "removed"
                  }
                >
                  {health.lastSyncRun.status}
                </Lozenge>
              )}
            </div>
            <div style={{ height: 12 }} />
            {!health.lastSyncRun ? (
              <div
                style={{
                  padding: "16px 0",
                  color: "var(--ds-text-subtle)",
                  fontSize: 14,
                }}
              >
                No sync run recorded yet.
              </div>
            ) : (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(auto-fill, minmax(180px, 1fr))",
                  gap: 12,
                }}
              >
                <StatTile
                  label="Last sync"
                  value={
                    health.lastSyncRun.started_at
                      ? formatDistanceToNow(
                          new Date(health.lastSyncRun.started_at),
                          { addSuffix: true },
                        )
                      : DASH
                  }
                  hint={
                    health.lastSyncRun.error_message ?? "Runs every 15 minutes"
                  }
                />
                <StatTile
                  label="Repaired / retried"
                  value={`${formatCount(
                    syncCount(health.lastSyncRun.counts, "stuck_repaired"),
                  )} / ${formatCount(
                    syncCount(health.lastSyncRun.counts, "retried"),
                  )}`}
                  hint="Stuck docs re-driven · failed docs retried"
                />
                <StatTile
                  label="Conflicts found"
                  value={formatCount(
                    syncCount(health.lastSyncRun.counts, "conflicts_found"),
                  )}
                  hint="Flagged by the last sweep"
                />
                <StatTile
                  label="Queue depth"
                  value={formatCount(health.queuedJobs + health.runningJobs)}
                  hint={`${health.queuedJobs} queued · ${health.runningJobs} running`}
                />
              </div>
            )}
          </section>

          {/* Attention: failed + needs-review documents */}
          <section>
            <Heading as="h3" size="small">
              Needs attention
            </Heading>
            <div style={{ height: 12 }} />
            {health.attentionDocs.length === 0 ? (
              <div
                style={{
                  padding: "16px 0",
                  color: "var(--ds-text-subtle)",
                  fontSize: 14,
                }}
              >
                No failed or review-pending documents. {health.failed === 0
                  ? "Nothing to action."
                  : ""}
              </div>
            ) : (
              <JiraTable<DocintelDocument>
                columns={attentionColumns}
                data={health.attentionDocs}
                getRowId={(row) => row.id}
                onRowClick={(row) =>
                  row.slug && navigate(docintelRoutes.workspace(row.slug))
                }
                ariaLabel="Documents needing attention"
              />
            )}
          </section>
        </div>
      )}
    </div>
  );
}
