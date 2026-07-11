/**
 * PromoteArtifactModal — promote a generated epic/story artifact into real
 * Catalyst work items (ph_work_items) via the canonical ProposalTable review
 * flow.
 *
 * Mirrors StoryProposalModal / EpicProposalModal: ProposalTable of the
 * artifact's `content.items`, per-row + bulk assignee, "Promote N items"
 * footer. Type/status resolution mirrors CreateWorkItemModal exactly —
 * ph_work_types (by name, is_enabled) → type_id; ph_workflow_statuses
 * (is_default else first) → status_id. Nothing is written until the user
 * clicks promote.
 *
 * If an Epic item is created first and Story items follow in the same batch,
 * the stories are parented to that epic (best-effort — skipped if unavailable).
 *
 * ADS tokens only. Canonical components only.
 * CAT-DOCINTEL-ARABIC-RAG-20260706-001
 */
import { useMemo, useState, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import ModalDialog, {
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalTitle,
} from "@atlaskit/modal-dialog";
import Button from "@atlaskit/button/new";
import { token } from "@atlaskit/tokens";
import { supabase } from "@/integrations/supabase/client";
import { createWorkItem } from "@/services/workItemService";
import { useApprovedProfiles } from "@/hooks/useApprovedProfiles";
import { catalystToast } from "@/lib/catalystToast";
import { SectionMessage } from "@/components/ads";
import {
  ProposalTable,
  type ProposalRow,
} from "@/components/catalyst-detail-views/shared/ProposalTable";
import type { AssigneeChoice } from "@/components/shared/JiraTable";
import { docintelApi } from "../domain";
import type {
  DocintelArtifact,
  DocintelArtifactItem,
} from "../types";

interface WorkTypeOption {
  id: string;
  name: string;
  level: string;
}
interface StatusOption {
  id: string;
  name: string;
  is_default: boolean;
}

interface CreatedWorkResult {
  id: string;
  item_key: string;
  title: string;
  kind: "epic" | "story";
}

interface ProvenanceLinkFailure {
  documentId: string;
  work: CreatedWorkResult;
}

interface PromotionResult {
  created: CreatedWorkResult[];
  createFailures: string[];
  artifactStatusFailed: boolean;
  linkFailures: ProvenanceLinkFailure[];
  provenanceRecovered: boolean;
}

export interface PromoteArtifactModalProps {
  artifact: DocintelArtifact;
  projectId: string;
  isOpen: boolean;
  onClose: () => void;
  /** Called after ≥1 item is promoted so callers can invalidate the artifact. */
  onPromoted: () => void;
}

/** artifact_type values that carry promotable epic-shaped items. */
const EPIC_TYPES = new Set(["epic"]);

/**
 * Read `content.items`; fall back to a single item from the artifact's own
 * title/content_md when items are missing (older artifacts). `kind` follows
 * the artifact type: 'epic' artifacts → epic, everything else → story.
 */
function resolveItems(artifact: DocintelArtifact): DocintelArtifactItem[] {
  const items = artifact.content?.items;
  if (Array.isArray(items) && items.length > 0) {
    return items.filter((it) => it && typeof it.title === "string" && it.title.trim());
  }
  const kind: "epic" | "story" = EPIC_TYPES.has(String(artifact.artifact_type))
    ? "epic"
    : "story";
  const title = artifact.title?.trim() || String(artifact.artifact_type);
  return [{ title, description_md: artifact.content_md ?? "", kind }];
}

export function PromoteArtifactModal({
  artifact,
  projectId,
  isOpen,
  onClose,
  onPromoted,
}: PromoteArtifactModalProps) {
  const qc = useQueryClient();
  const items = useMemo(() => resolveItems(artifact), [artifact]);

  const { data: approved = [] } = useApprovedProfiles();
  const assigneeOptions = useMemo<AssigneeChoice[]>(
    () => approved.map((p) => ({ id: p.id, name: p.name, avatarUrl: p.avatarUrl ?? null })),
    [approved],
  );

  // Type/status resolution — same queries CreateWorkItemModal uses.
  const { data: workTypes = [] } = useQuery<WorkTypeOption[]>({
    queryKey: ["ph-work-types", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ph_work_types")
        .select("id, name, level")
        .eq("project_id", projectId)
        .eq("is_enabled", true)
        .order("position");
      if (error) throw error;
      return (data || []) as WorkTypeOption[];
    },
    enabled: !!projectId && isOpen,
  });

  const { data: statuses = [] } = useQuery<StatusOption[]>({
    queryKey: ["ph-statuses-default", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ph_workflow_statuses")
        .select("id, name, is_default")
        .eq("project_id", projectId)
        .order("position");
      if (error) throw error;
      return (data || []) as StatusOption[];
    },
    enabled: !!projectId && isOpen,
  });

  const [selection, setSelection] = useState<Set<string>>(
    () => new Set(items.map((_, i) => String(i))),
  );
  const [assignees, setAssignees] = useState<Record<number, AssigneeChoice | null>>({});
  const [promoting, setPromoting] = useState(false);
  const [retryingProvenance, setRetryingProvenance] = useState(false);
  const [promotionResult, setPromotionResult] = useState<PromotionResult | null>(null);

  const handleAssigneeChange = useCallback((rowId: string, assignee: AssigneeChoice | null) => {
    setAssignees((prev) => ({ ...prev, [Number(rowId)]: assignee }));
  }, []);

  const handleBulkAssign = useCallback(
    (assignee: AssigneeChoice | null) => {
      setAssignees((prev) => {
        const next = { ...prev };
        selection.forEach((id) => {
          next[Number(id)] = assignee;
        });
        return next;
      });
    },
    [selection],
  );

  const rows = useMemo<ProposalRow[]>(
    () =>
      items.map((item, i) => ({
        id: String(i),
        title: item.title,
        issueType: item.kind === "epic" ? "Epic" : "Story",
        meta:
          item.acceptance_criteria && item.acceptance_criteria.length > 0
            ? `${item.acceptance_criteria.length} AC`
            : "",
        assignee: assignees[i] ?? null,
      })),
    [items, assignees],
  );

  /** Resolve type_id for a kind; match on the work-type NAME (Epic / Story). */
  const resolveType = useCallback(
    (kind: "epic" | "story"): WorkTypeOption | null => {
      const wanted = kind === "epic" ? "epic" : "story";
      return (
        workTypes.find((t) => t.name.toLowerCase() === wanted) ??
        workTypes.find((t) => t.level?.toLowerCase() === wanted) ??
        null
      );
    },
    [workTypes],
  );

  const defaultStatus = useMemo<StatusOption | null>(
    () => statuses.find((s) => s.is_default) ?? statuses[0] ?? null,
    [statuses],
  );

  const selectedCount = selection.size;

  const handlePromote = useCallback(async () => {
    if (selectedCount === 0 || promoting) return;

    setPromoting(true);
    setPromotionResult(null);

    const selectedIdx = [...selection].map(Number).sort((a, b) => a - b);

    const { data: userData } = await supabase.auth.getUser();
    const reporterId = userData?.user?.id ?? null;

    const created: CreatedWorkResult[] = [];
    const failed: string[] = [];
    // Track the first epic created so same-batch stories can be parented to it.
    let epicParentId: string | null = null;

    // Create epics before stories so parenting is possible in one pass.
    const ordered = selectedIdx.sort((a, b) => {
      const ka = items[a]?.kind === "epic" ? 0 : 1;
      const kb = items[b]?.kind === "epic" ? 0 : 1;
      return ka - kb || a - b;
    });

    for (const idx of ordered) {
      const item = items[idx];
      if (!item) continue;
      // Resolve type/status when the project has them configured; otherwise
      // fall back to the string item_type alone (type_id/status_id null),
      // matching how existing items in these projects are stored.
      const type = resolveType(item.kind);
      try {
        const result = await createWorkItem({
          project_id: projectId,
          type_id: type?.id ?? null,
          status_id: defaultStatus?.id ?? null,
          item_type: item.kind === "epic" ? "Epic" : "Story",
          title: item.title,
          description: item.description_md || undefined,
          assignee_id: assignees[idx]?.id ?? null,
          ...(item.kind === "story" && epicParentId
            ? { parent_id: epicParentId }
            : {}),
        });
        if (result?.id) {
          created.push({
            id: result.id as string,
            item_key: (result.item_key as string) ?? "",
            title: (result.title as string) ?? item.title,
            kind: item.kind,
          });
          if (item.kind === "epic" && !epicParentId) {
            epicParentId = result.id as string;
          }
        }
      } catch (e) {
        failed.push(`${item.title}${e instanceof Error ? ` (${e.message})` : ""}`);
      }
    }
    void reporterId; // reporter is stamped server-side; kept for parity/debug.

    if (created.length > 0) {
      let artifactStatusFailed = false;
      try {
        await docintelApi.markArtifactPromoted(artifact.id, created[0].id);
      } catch {
        artifactStatusFailed = true;
      }

      const linkFailures: ProvenanceLinkFailure[] = [];
      const sourceDocumentIds = artifact.document_ids ?? [];
      for (const documentId of sourceDocumentIds) {
        for (const c of created) {
          try {
            await docintelApi.linkDocument(documentId, c.kind, c.id, "promotion");
          } catch {
            linkFailures.push({ documentId, work: c });
          }
        }
        qc.invalidateQueries({ queryKey: ["docintel", "links", documentId] });
      }

      setPromoting(false);
      const keys = created.map((c) => c.item_key).filter(Boolean).join(", ");
      const needsFollowUp =
        failed.length > 0 || artifactStatusFailed || linkFailures.length > 0;

      if (needsFollowUp) {
        setPromotionResult({
          created,
          createFailures: failed,
          artifactStatusFailed,
          linkFailures,
          provenanceRecovered: false,
        });
        catalystToast.warning(
          "Work created; follow-up required",
          artifactStatusFailed || linkFailures.length > 0
            ? "The created work is safe, but its provenance is incomplete. Retry from this dialog."
            : `Created ${created.length} of ${selectedCount}.`,
        );
      } else {
        catalystToast.success(
          `Promoted ${created.length} item${created.length === 1 ? "" : "s"}`,
          keys ? `Created ${keys}` : undefined,
        );
      }
      onPromoted();
      if (!needsFollowUp) onClose();
    } else {
      setPromoting(false);
      catalystToast.error(
        "Promotion failed",
        failed.length > 0 ? failed.join("; ") : "No items were created.",
      );
    }
  }, [
    selectedCount,
    promoting,
    defaultStatus,
    selection,
    items,
    resolveType,
    projectId,
    assignees,
    artifact.id,
    artifact.document_ids,
    qc,
    onPromoted,
    onClose,
  ]);

  const handleRetryProvenance = useCallback(async () => {
    if (!promotionResult || retryingProvenance) return;
    if (!promotionResult.artifactStatusFailed && promotionResult.linkFailures.length === 0) return;

    setRetryingProvenance(true);
    let artifactStatusFailed = promotionResult.artifactStatusFailed;
    if (artifactStatusFailed && promotionResult.created[0]) {
      try {
        await docintelApi.markArtifactPromoted(
          artifact.id,
          promotionResult.created[0].id,
        );
        artifactStatusFailed = false;
      } catch {
        artifactStatusFailed = true;
      }
    }

    const linkFailures: ProvenanceLinkFailure[] = [];
    for (const failedLink of promotionResult.linkFailures) {
      try {
        await docintelApi.linkDocument(
          failedLink.documentId,
          failedLink.work.kind,
          failedLink.work.id,
          "promotion",
        );
      } catch {
        linkFailures.push(failedLink);
      }
      qc.invalidateQueries({
        queryKey: ["docintel", "links", failedLink.documentId],
      });
    }

    const provenanceRecovered = !artifactStatusFailed && linkFailures.length === 0;
    setPromotionResult({
      ...promotionResult,
      artifactStatusFailed,
      linkFailures,
      provenanceRecovered,
    });
    setRetryingProvenance(false);
    onPromoted();

    if (provenanceRecovered) {
      catalystToast.success(
        "Provenance recovered",
        "The existing work items are now linked to their source evidence.",
      );
    } else {
      catalystToast.warning(
        "Provenance is still incomplete",
        "The created work remains safe. Retry again while this dialog remains open.",
      );
    }
  }, [artifact.id, onPromoted, promotionResult, qc, retryingProvenance]);

  if (!isOpen) return null;

  return (
    <ModalDialog onClose={onClose} width="x-large">
      <ModalHeader>
        <ModalTitle>Promote to work items</ModalTitle>
      </ModalHeader>
      <ModalBody>
        <div
          style={{
            display: "flex",
            gap: 16,
            alignItems: "center",
            padding: "8px 0 16px",
            borderBottom: `1px solid ${token("color.border", "var(--ds-border)")}`,
            marginBottom: 16,
          }}
        >
          <div
            style={{
              fontSize: "var(--ds-font-size-200)",
              color: token("color.text.subtle", "var(--ds-text-subtle)"),
            }}
          >
            <strong>{items.length}</strong> item{items.length === 1 ? "" : "s"} from{" "}
            {artifact.title?.trim() || String(artifact.artifact_type)}
          </div>
          <span
            style={{
              fontSize: "var(--ds-font-size-200)",
              color: token("color.text.subtlest", "var(--ds-text-subtlest)"),
            }}
          >
            {selectedCount} of {items.length} selected
          </span>
        </div>

        {promotionResult ? (
          <SectionMessage
            appearance={
              promotionResult.provenanceRecovered && promotionResult.createFailures.length === 0
                ? "success"
                : "warning"
            }
            title={
              promotionResult.artifactStatusFailed || promotionResult.linkFailures.length > 0
                ? "Work created; provenance incomplete"
                : promotionResult.createFailures.length > 0
                  ? "Some work items were created"
                  : "Promotion recovered"
            }
          >
            <p>
              The work items below were created and have not been deleted or recreated.
            </p>
            <ul>
              {promotionResult.created.map((work) => (
                <li key={work.id}>{work.item_key || work.title}</li>
              ))}
            </ul>
            {promotionResult.artifactStatusFailed || promotionResult.linkFailures.length > 0 ? (
              <p>
                The artifact status or {promotionResult.linkFailures.length} source link
                {promotionResult.linkFailures.length === 1 ? "" : "s"} could not be recorded.
                Retry provenance while this dialog is open to link the existing work without
                creating duplicates.
              </p>
            ) : null}
            {promotionResult.createFailures.length > 0 ? (
              <p>
                {promotionResult.createFailures.length} selected item
                {promotionResult.createFailures.length === 1 ? "" : "s"} could not be created.
              </p>
            ) : null}
          </SectionMessage>
        ) : (
          <ProposalTable
            rows={rows}
            selection={selection}
            onSelectionChange={setSelection}
            onAssigneeChange={handleAssigneeChange}
            onBulkAssign={handleBulkAssign}
            assigneeOptions={assigneeOptions}
          />
        )}
      </ModalBody>
      <ModalFooter>
        {promotionResult ? (
          <>
            <Button appearance="subtle" onClick={onClose} isDisabled={retryingProvenance}>
              Done
            </Button>
            {promotionResult.artifactStatusFailed || promotionResult.linkFailures.length > 0 ? (
              <Button
                appearance="primary"
                onClick={handleRetryProvenance}
                isDisabled={retryingProvenance}
                isLoading={retryingProvenance}
              >
                {retryingProvenance ? "Retrying…" : "Retry provenance"}
              </Button>
            ) : null}
          </>
        ) : (
          <>
            <Button appearance="subtle" onClick={onClose} isDisabled={promoting}>
              Cancel
            </Button>
            <Button
              appearance="primary"
              onClick={handlePromote}
              isDisabled={selectedCount === 0 || promoting}
              isLoading={promoting}
            >
              {promoting
                ? "Promoting…"
                : `Promote ${selectedCount} item${selectedCount === 1 ? "" : "s"}`}
            </Button>
          </>
        )}
      </ModalFooter>
    </ModalDialog>
  );
}

export default PromoteArtifactModal;
