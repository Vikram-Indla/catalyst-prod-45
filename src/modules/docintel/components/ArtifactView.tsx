/**
 * ArtifactView — renders one generated artifact (content_md) with inline
 * citation chips.
 *
 * The content_md contains inline [E<n>] markers; the artifact carries
 * ai_artifact_citations rows. The Nth citation (1-based) backs [E<n>]. Each
 * marker renders as a clickable chip labelled "p.<page_number>"; clicking opens
 * a CatalystDrawer showing that citation's quoted_text + document/page/block —
 * the evidence behind the claim.
 *
 * Zero-assumption: unknown page → the chip shows a dash; empty/"Not found in
 * source" content is shown honestly.
 *
 * ADS tokens only. Canonical components only. RTL-aware for Arabic artifacts.
 * CAT-DOCINTEL-ARABIC-RAG-20260706-001
 */
import { useMemo, useState, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import { useQueryClient } from "@tanstack/react-query";
import {
  Button,
  Lozenge,
  Spinner,
  SectionMessage,
  EmptyState,
  CatalystDrawer,
  Modal,
  ModalHeader,
  ModalTitle,
  ModalBody,
  ModalFooter,
} from "@/components/ads";
import TextArea from "@atlaskit/textarea";
import { useArtifact } from "../hooks/useDocintel";
import {
  useApproveArtifact,
  useRejectArtifact,
} from "../hooks/useArtifactGovernance";
import { catalystToast } from "@/lib/catalystToast";
import type { DocintelCitation } from "../types";
import { groundingAppearance, pctLabel } from "./confidence";
import { ARTIFACT_TYPE_LABELS, isArabicArtifact } from "./artifactTypes";
import { PromoteArtifactModal } from "./PromoteArtifactModal";

/** Artifact types whose content can be promoted into Catalyst work items. */
const PROMOTABLE_TYPES = new Set(["epic", "story"]);

const DASH = "—";
export const CITATION_RE = /\[E(\d+)\]/g;

const ARABIC_FONT =
  '"Noto Naskh Arabic", "Geeza Pro", "Traditional Arabic", "Segoe UI", var(--ds-font-family-body), sans-serif';

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
        margin: "0 2px",
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
 * Split a markdown string on [E<n>] markers, replacing each with a citation
 * chip. Returns an array of strings and chip elements. Non-marker text is left
 * as-is so react-markdown can render whole segments.
 */
export function renderWithCitations(
  text: string,
  citations: DocintelCitation[],
  onOpen: (c: DocintelCitation, n: number) => void,
  arabic: boolean,
): ReactNode[] {
  // Paragraph-first: see AskPanel.renderWithCitations — inline chips must not
  // fragment sentences into separate <p> blocks.
  const paras = text.split(/\n{2,}/);
  if (paras.length > 1) {
    return paras.filter((p) => p.trim()).map((p, i) => (
      <div key={`para-${i}`} style={{ marginBlockEnd: "var(--ds-space-100)" }}>
        {renderWithCitations(p, citations, onOpen, arabic)}
      </div>
    ));
  }

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
    const citation = citations[n - 1];
    const pageLabel =
      citation && typeof citation.page_number === "number"
        ? `p.${citation.page_number}`
        : `E${n}`;
    parts.push(
      <CitationChip
        key={`chip-${key++}`}
        label={pageLabel}
        onClick={() => citation && onOpen(citation, n)}
      />,
    );
    lastIndex = match.index + match[0].length;
  }
  pushMarkdown(text.slice(lastIndex));
  return parts;
}

export interface ArtifactViewProps {
  artifactId: string;
}

export function ArtifactView({ artifactId }: ArtifactViewProps) {
  const { data, isLoading, isError, error } = useArtifact(artifactId);
  const queryClient = useQueryClient();
  const [active, setActive] = useState<{ citation: DocintelCitation; n: number } | null>(null);
  const [promoteOpen, setPromoteOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const approve = useApproveArtifact();
  const reject = useRejectArtifact();

  const artifact = data?.artifact ?? null;
  const citations = useMemo(() => data?.citations ?? [], [data?.citations]);

  const arabic = artifact ? isArabicArtifact(artifact.artifact_type) : false;
  const contentMd = artifact?.content_md?.trim() ?? "";
  const isEmpty =
    contentMd.length === 0 ||
    contentMd.toLowerCase() === "not found in source";

  if (isLoading) {
    return (
      <div style={{ padding: 48, display: "flex", justifyContent: "center" }}>
        <Spinner size="large" />
      </div>
    );
  }

  if (isError || !artifact) {
    return (
      <div style={{ padding: 16 }}>
        <SectionMessage appearance="error" title="Could not load artifact">
          {error instanceof Error ? error.message : "This artifact does not exist or you do not have access."}
        </SectionMessage>
      </div>
    );
  }

  const typeLabel =
    ARTIFACT_TYPE_LABELS[artifact.artifact_type] ?? artifact.artifact_type;

  const status = String(artifact.status);
  const isPromotable = PROMOTABLE_TYPES.has(String(artifact.artifact_type));
  const isPromoted = status === "promoted";
  const isRejected = status === "rejected";
  /** Approval workflow (S8): only draft/verified can be approved or rejected. */
  const isReviewable = status === "draft" || status === "verified";

  const onApprove = () => {
    approve.mutate(
      { artifactId },
      {
        onSuccess: () => catalystToast.success("Artifact approved"),
        onError: (e) =>
          catalystToast.error(
            "Approve failed",
            e instanceof Error ? e.message : "Please try again.",
          ),
      },
    );
  };

  const closeReject = () => {
    setRejectOpen(false);
    setRejectReason("");
    reject.reset();
  };

  const onConfirmReject = () => {
    reject.mutate(
      { artifactId, reason: rejectReason },
      {
        onSuccess: () => {
          closeReject();
          catalystToast.success("Artifact rejected");
        },
      },
    );
  };

  return (
    <div style={{ paddingTop: 8 }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          flexWrap: "wrap",
          marginBottom: 8,
        }}
      >
        <span style={{ fontWeight: 600, fontSize: 16, color: "var(--ds-text)" }}>
          {artifact.title?.trim() || typeLabel}
        </span>
        <Lozenge appearance="default">{typeLabel}</Lozenge>
        <Lozenge appearance={groundingAppearance(artifact.grounding_score)}>
          {`grounding ${pctLabel(artifact.grounding_score)}`}
        </Lozenge>
        <Lozenge
          appearance={
            status === "ready" || status === "approved" || isPromoted
              ? "success"
              : status === "failed" || isRejected
              ? "removed"
              : status === "needs_review"
              ? "moved"
              : "inprogress"
          }
        >
          {status.replace(/_/g, " ")}
        </Lozenge>

        {/* Actions: approve/reject while reviewable (draft/verified); promote
            for epic/story (verified/approved/draft — not rejected). Promoted →
            success lozenge. */}
        <span
          style={{
            marginInlineStart: "auto",
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          {isReviewable && (
            <>
              <Button
                appearance="default"
                onClick={onApprove}
                isDisabled={approve.isPending || reject.isPending}
              >
                Approve
              </Button>
              <Button
                appearance="danger"
                onClick={() => setRejectOpen(true)}
                isDisabled={approve.isPending || reject.isPending}
              >
                Reject
              </Button>
            </>
          )}
          {isPromotable &&
            (isPromoted ? (
              <Lozenge appearance="success">Promoted</Lozenge>
            ) : (
              !isRejected && (
                <Button appearance="primary" onClick={() => setPromoteOpen(true)}>
                  Promote to work items
                </Button>
              )
            ))}
        </span>
      </div>

      {isPromotable && !isPromoted && !isRejected && (
        <PromoteArtifactModal
          artifact={artifact}
          projectId={artifact.project_id}
          isOpen={promoteOpen}
          onClose={() => setPromoteOpen(false)}
          onPromoted={() => {
            queryClient.invalidateQueries({ queryKey: ["docintel", "artifact", artifactId] });
            queryClient.invalidateQueries({ queryKey: ["docintel", "artifacts"] });
          }}
        />
      )}

      {/* Rejection outcome — reason shown only when the reviewer entered one */}
      {isRejected && (
        <div style={{ marginBottom: 12 }}>
          <SectionMessage appearance="warning" title="Rejected">
            {artifact.rejection_reason?.trim() ||
              "This artifact was rejected."}
          </SectionMessage>
        </div>
      )}

      {/* Reject-with-reason modal */}
      <Modal isOpen={rejectOpen} onClose={closeReject} width="small">
        <ModalHeader>
          <ModalTitle>Reject artifact</ModalTitle>
        </ModalHeader>
        <ModalBody>
          <p style={{ margin: "0 0 12px", color: "var(--ds-text-subtle)", fontSize: 13 }}>
            Explain why this artifact is being rejected. The reason is stored
            with the artifact and visible to the team.
          </p>
          <TextArea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.currentTarget.value)}
            placeholder="Reason for rejection"
            minimumRows={3}
            isDisabled={reject.isPending}
          />
          {reject.isError && (
            <div style={{ marginTop: 12 }}>
              <SectionMessage appearance="error" title="Reject failed">
                {reject.error instanceof Error
                  ? reject.error.message
                  : "Please try again."}
              </SectionMessage>
            </div>
          )}
        </ModalBody>
        <ModalFooter>
          <Button appearance="subtle" onClick={closeReject} isDisabled={reject.isPending}>
            Cancel
          </Button>
          <Button
            appearance="danger"
            onClick={onConfirmReject}
            isDisabled={reject.isPending || !rejectReason.trim()}
          >
            Reject
          </Button>
        </ModalFooter>
      </Modal>

      {/* Grounding summary line */}
      <p style={{ margin: "0 0 12px", color: "var(--ds-text-subtle)", fontSize: 13 }}>
        {citations.length} claim{citations.length === 1 ? "" : "s"} cited · grounding{" "}
        {pctLabel(artifact.grounding_score)}
      </p>

      {typeof artifact.grounding_score === "number" && artifact.grounding_score < 0.6 && (
        <div style={{ marginBottom: 12 }}>
          <SectionMessage appearance="warning" title="Low grounding">
            Some statements are not grounded in the source — review before trusting.
          </SectionMessage>
        </div>
      )}

      {/* Body */}
      {isEmpty ? (
        <EmptyState
          size="compact"
          header="Not found in source"
          description="The generator did not find content in the document to produce this artifact."
        />
      ) : (
        <div
          className="docintel-artifact-md"
          {...(arabic ? { dir: "rtl", lang: "ar" } : {})}
          style={{
            color: "var(--ds-text)",
            fontSize: 14,
            lineHeight: 1.7,
            ...(arabic
              ? { fontFamily: ARABIC_FONT, textAlign: "right", unicodeBidi: "plaintext" }
              : {}),
          }}
        >
          {renderWithCitations(
            contentMd,
            citations,
            (citation, n) => setActive({ citation, n }),
            arabic,
          )}
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
                {typeof active.citation.page_number === "number"
                  ? `p.${active.citation.page_number}`
                  : `E${active.n}`}
              </Lozenge>
              <Lozenge appearance={groundingAppearance(active.citation.confidence)}>
                {`conf ${pctLabel(active.citation.confidence)}`}
              </Lozenge>
            </div>

            {active.citation.claim_text?.trim() && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "var(--ds-text-subtle)", marginBottom: 4 }}>
                  Claim
                </div>
                <p style={{ margin: 0, color: "var(--ds-text)", fontSize: 14 }}>
                  {active.citation.claim_text}
                </p>
              </div>
            )}

            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--ds-text-subtle)", marginBottom: 4 }}>
                Quoted from source
              </div>
              {active.citation.quoted_text?.trim() ? (
                <blockquote
                  dir="auto"
                  style={{
                    margin: 0,
                    padding: "10px 14px",
                    borderInlineStart: "3px solid var(--ds-border-focused)",
                    background: "var(--ds-surface-sunken)",
                    borderRadius: 6,
                    color: "var(--ds-text)",
                    fontSize: 14,
                    unicodeBidi: "plaintext",
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {active.citation.quoted_text}
                </blockquote>
              ) : (
                <p style={{ margin: 0, color: "var(--ds-text-subtlest)" }}>{DASH}</p>
              )}
            </div>

            <div style={{ display: "flex", gap: 24, fontSize: 13, color: "var(--ds-text-subtle)" }}>
              <span>
                Page:{" "}
                <span style={{ color: "var(--ds-text)" }}>
                  {typeof active.citation.page_number === "number" ? active.citation.page_number : DASH}
                </span>
              </span>
              <span>
                Block:{" "}
                <span style={{ color: "var(--ds-text)" }}>
                  {active.citation.block_id ?? DASH}
                </span>
              </span>
            </div>
          </div>
        )}
      </CatalystDrawer>
    </div>
  );
}

export default ArtifactView;
