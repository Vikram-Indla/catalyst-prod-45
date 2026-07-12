/**
 * DocumentLinksPanel — "Links" tab: Doc Intel document ↔ Catalyst entities
 * (S3 Knowledge Integration, CAT-DOCINTEL-ARABIC-RAG-20260706-001).
 *
 * Lists ai_document_links rows resolved to key/title (work items via
 * ph_issues/ph_work_items, business requests, test cases, releases, changes,
 * Folio documents), with an Add-link picker mirroring the canonical
 * AttachWikiPageDialog / AddParentPicker query patterns, and unlink with
 * confirmation.
 *
 * Picker coverage: work items (ph_issues), business requests
 * (business_requests) and Folio documents (kb_documents) — the three families
 * with a canonical search path already used elsewhere. test_case / release /
 * change links render if present but are not offered in the picker.
 *
 * Zero-assumption rendering: unresolved targets show their key, else the raw
 * id — never an invented title. ADS tokens only; canonical components only.
 */
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  Button,
  EmptyState,
  Lozenge,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalTitle,
  SectionMessage,
  Select,
  Spinner,
  Textfield,
  type SelectOption,
} from "@/components/ads";
import { FileText, Plus, Search, X } from "@/lib/atlaskit-icons";
import { JiraIssueTypeIcon } from "@/components/shared/JiraIssueTypeIcon";
import { supabase } from "@/integrations/supabase/client";
import { catalystToast } from "@/lib/catalystToast";
import { Routes } from "@/lib/routes";
import {
  useDocumentLinks,
  useLinkDocument,
  useUnlinkDocument,
} from "../hooks/useDocintel";
import type { DocintelLinkEntityType, DocintelResolvedLink } from "../types";

const db = supabase as unknown as { from: (t: string) => any };

export interface DocumentLinksPanelProps {
  documentId: string;
}

// ── Picker categories (canonical query paths only) ──────────────────────────

type PickerCategory = "work_item" | "business_request" | "document";

const CATEGORY_OPTIONS: SelectOption<PickerCategory>[] = [
  { value: "work_item", label: "Work item" },
  { value: "business_request", label: "Business request" },
  { value: "document", label: "Folio document" },
];

/** ph_issues issue types the picker offers, mirroring AddParentPicker. */
const PICKER_ISSUE_TYPES = [
  "Epic", "epic",
  "Feature", "feature", "New Feature", "new feature",
  "Story", "story", "Improvement", "improvement",
  "Task", "task",
  "QA Bug", "Bug", "bug", "Defect", "defect",
  "Production Incident", "Incident", "incident",
];

/** Map a ph_issues issue_type onto our entity_type; null = not linkable. */
function entityTypeForIssueType(
  issueType: string | null | undefined,
): DocintelLinkEntityType | null {
  const t = (issueType ?? "").toLowerCase().trim();
  if (!t) return null;
  if (t.includes("epic")) return "epic";
  if (t.includes("feature")) return "feature";
  if (t.includes("story") || t.includes("improvement")) return "story";
  if (t.includes("bug") || t.includes("defect")) return "defect";
  if (t.includes("incident")) return "incident";
  if (t.includes("task")) return "task";
  return null;
}

interface PickerCandidate {
  entityType: DocintelLinkEntityType;
  entityId: string;
  key: string | null;
  title: string | null;
  iconType: string | null;
}

/** Origin lozenge for non-manual links. Manual links carry no lozenge. */
function originLozenge(origin: string) {
  if (origin === "promotion") return <Lozenge appearance="success">Promoted</Lozenge>;
  if (origin === "mention") return <Lozenge appearance="new">Mentioned</Lozenge>;
  return null;
}

export function DocumentLinksPanel({ documentId }: DocumentLinksPanelProps) {
  const navigate = useNavigate();
  const { data: links, isPending, isError, error, refetch } =
    useDocumentLinks(documentId);
  const linkDocument = useLinkDocument();
  const unlinkDocument = useUnlinkDocument();

  const [pickerOpen, setPickerOpen] = useState(false);
  const [confirmUnlink, setConfirmUnlink] =
    useState<DocintelResolvedLink | null>(null);

  // ── Picker state ──────────────────────────────────────────────────────────
  const [category, setCategory] = useState<PickerCategory>("work_item");
  const [search, setSearch] = useState("");
  const categoryValue = useMemo(
    () => CATEGORY_OPTIONS.find((o) => o.value === category) ?? null,
    [category],
  );

  const linkedKeys = useMemo(
    () => new Set((links ?? []).map((l) => `${l.entity_type}:${l.entity_id}`)),
    [links],
  );

  const { data: candidates, isPending: candidatesPending } = useQuery({
    queryKey: ["docintel", "link-candidates", category, search],
    enabled: pickerOpen,
    queryFn: async (): Promise<PickerCandidate[]> => {
      const s = search.trim();
      if (category === "work_item") {
        // Mirrors AddParentPicker's ph_issues candidate query.
        let q = db
          .from("ph_issues")
          .select("id, issue_key, summary, issue_type")
          .in("issue_type", PICKER_ISSUE_TYPES)
          .is("deleted_at", null)
          .order("jira_updated_at", { ascending: false, nullsFirst: false })
          .limit(20);
        if (s) q = q.or(`summary.ilike.%${s}%,issue_key.ilike.%${s}%`);
        const { data, error: qErr } = await q;
        if (qErr) throw new Error(qErr.message);
        return ((data ?? []) as Array<{
          id: string;
          issue_key: string | null;
          summary: string | null;
          issue_type: string | null;
        }>)
          .map((r) => {
            const entityType = entityTypeForIssueType(r.issue_type);
            if (!entityType) return null;
            return {
              entityType,
              entityId: r.id,
              key: r.issue_key ?? null,
              title: r.summary ?? null,
              iconType: r.issue_type ?? null,
            } satisfies PickerCandidate;
          })
          .filter((c): c is PickerCandidate => c !== null);
      }
      if (category === "business_request") {
        let q = db
          .from("business_requests")
          .select("id, request_key, title")
          .order("created_at", { ascending: false })
          .limit(20);
        if (s) q = q.or(`title.ilike.%${s}%,request_key.ilike.%${s}%`);
        const { data, error: qErr } = await q;
        if (qErr) throw new Error(qErr.message);
        return ((data ?? []) as Array<{
          id: string;
          request_key: string | null;
          title: string | null;
        }>).map((r) => ({
          entityType: "business_request" as const,
          entityId: r.id,
          key: r.request_key ?? null,
          title: r.title ?? null,
          iconType: "Business Request",
        }));
      }
      // Folio documents — mirrors AttachWikiPageDialog's kb_documents query.
      let q = db
        .from("kb_documents")
        .select("id, doc_key, title, slug")
        .eq("is_template", false)
        .order("updated_at", { ascending: false })
        .limit(20);
      if (s) q = q.or(`title.ilike.%${s}%,doc_key.ilike.%${s}%`);
      const { data, error: qErr } = await q;
      if (qErr) throw new Error(qErr.message);
      return ((data ?? []) as Array<{
        id: string;
        doc_key: string | null;
        title: string | null;
      }>).map((r) => ({
        entityType: "document" as const,
        entityId: r.id,
        key: r.doc_key ?? null,
        title: r.title ?? null,
        iconType: null,
      }));
    },
  });

  const closePicker = () => {
    setPickerOpen(false);
    setSearch("");
  };

  const addLink = (c: PickerCandidate) => {
    linkDocument.mutate(
      { documentId, entityType: c.entityType, entityId: c.entityId },
      {
        onSuccess: () => {
          catalystToast.success(
            `Linked ${c.key ?? c.title ?? "item"}`,
          );
          closePicker();
        },
      },
    );
  };

  const rows = links ?? [];

  return (
    <div style={{ maxWidth: 860 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          margin: "8px 0 12px",
        }}
      >
        {/* ads-scanner:ignore-next-line — ADS heading token shorthand (font:), not split fontSize/fontWeight */}
        <h3 style={{ font: "var(--ds-font-heading-xsmall)", color: "var(--ds-text)", margin: 0 }}>
          Linked work
        </h3>
        {rows.length > 0 && (
          <span style={{ color: "var(--ds-text-subtlest)", font: "var(--ds-font-body-small)" }}>
            {rows.length}
          </span>
        )}
        <div style={{ marginInlineStart: "auto" }}>
          <Button
            appearance="default"
            onClick={() => setPickerOpen(true)}
            iconBefore={<Plus style={{ width: 14, height: 14 }} />}
          >
            Add link
          </Button>
        </div>
      </div>

      {isPending ? (
        <div style={{ padding: 32, display: "flex", justifyContent: "center" }}>
          <Spinner size="medium" />
        </div>
      ) : isError ? (
        <SectionMessage
          appearance="error"
          title="Could not load links"
          actions={[{ key: "retry", text: "Retry", onClick: () => refetch() }]}
        >
          <p style={{ margin: 0 }}>
            {error instanceof Error ? error.message : "Please try again."}
          </p>
        </SectionMessage>
      ) : rows.length === 0 ? (
        <EmptyState
          header="No linked work yet"
          description="Link this document to work items, business requests or Folio documents so its knowledge travels with delivery."
        />
      ) : (
        <ul
          style={{
            listStyle: "none",
            margin: 0,
            padding: 0,
            display: "flex",
            flexDirection: "column",
            gap: 2,
          }}
        >
          {rows.map((link) => {
            const isFolioDoc = link.entity_type === "document";
            const canNavigate =
              isFolioDoc && link.folio_space_slug && link.folio_page_slug;
            const label = link.entity_title ?? null;
            return (
              <li
                key={link.id}
                className="docintel-link-row"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "6px 8px",
                  borderRadius: 4,
                }}
              >
                <button
                  type="button"
                  disabled={!canNavigate}
                  onClick={() =>
                    canNavigate &&
                    navigate(
                      Routes.folio.page(
                        link.folio_space_slug!,
                        link.folio_page_slug!,
                      ),
                    )
                  }
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    flex: 1,
                    minWidth: 0,
                    border: "none",
                    background: "transparent",
                    color: "var(--ds-text)",
                    font: "var(--ds-font-body)",
                    cursor: canNavigate ? "pointer" : "default",
                    padding: 0,
                    textAlign: "start",
                  }}
                >
                  {link.entity_icon_type ? (
                    <JiraIssueTypeIcon issueType={link.entity_icon_type} size={16} />
                  ) : (
                    <FileText
                      aria-hidden
                      style={{ width: 14, height: 14, color: "var(--ds-icon-subtle)", flexShrink: 0 }}
                    />
                  )}
                  {link.entity_key ? (
                    <span
                      style={{
                        color: "var(--ds-text-subtle)",
                        font: "var(--ds-font-body-small)",
                        flexShrink: 0,
                      }}
                    >
                      {link.entity_key}
                    </span>
                  ) : null}
                  <span
                    style={{
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {/* Zero-assumption: title, else key already shown, else raw id. */}
                    {label ?? (link.entity_key ? "" : link.entity_id)}
                  </span>
                  {originLozenge(link.link_origin)}
                </button>
                <button
                  type="button"
                  aria-label={`Remove link to ${link.entity_key ?? link.entity_id}`}
                  onClick={() => setConfirmUnlink(link)}
                  className="docintel-link-unlink"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 22,
                    height: 22,
                    border: "none",
                    borderRadius: 4,
                    background: "transparent",
                    color: "var(--ds-icon-subtle)",
                    cursor: "pointer",
                    padding: 0,
                  }}
                >
                  <X style={{ width: 13, height: 13 }} />
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <style>{`
        .docintel-link-row .docintel-link-unlink { visibility: hidden; }
        .docintel-link-row:hover .docintel-link-unlink { visibility: visible; }
        .docintel-link-row:hover { background: var(--ds-background-neutral-subtle); }
      `}</style>

      {/* ── Add-link picker ── */}
      <Modal isOpen={pickerOpen} onClose={closePicker} width="medium">
        <ModalHeader>
          <ModalTitle>Link work to this document</ModalTitle>
        </ModalHeader>
        <ModalBody>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <Select<PickerCategory>
              aria-label="Entity type"
              options={CATEGORY_OPTIONS}
              value={categoryValue}
              onChange={(next) => next && setCategory(next.value)}
            />
            <Textfield
              aria-label="Search"
              placeholder="Search by title or key"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              elemBeforeInput={
                <Search
                  aria-hidden
                  style={{
                    width: 15,
                    height: 15,
                    color: "var(--ds-icon-subtle)",
                    marginInlineStart: 8,
                  }}
                />
              }
            />
            <div
              style={{
                maxHeight: 280,
                minHeight: 80,
                overflowY: "auto",
                display: "flex",
                flexDirection: "column",
                gap: 2,
                border: "1px solid var(--ds-border)",
                borderRadius: 6,
                padding: 4,
              }}
            >
              {candidatesPending ? (
                <p style={{ color: "var(--ds-text-subtle)", font: "var(--ds-font-body-small)", padding: 10, margin: 0 }}>
                  Loading…
                </p>
              ) : (candidates ?? []).length === 0 ? (
                <p style={{ color: "var(--ds-text-subtle)", font: "var(--ds-font-body-small)", padding: 10, margin: 0 }}>
                  {search ? "No matches." : "Nothing to link yet."}
                </p>
              ) : (
                (candidates ?? []).map((c) => {
                  const alreadyLinked = linkedKeys.has(
                    `${c.entityType}:${c.entityId}`,
                  );
                  return (
                    <button
                      key={`${c.entityType}:${c.entityId}`}
                      type="button"
                      disabled={alreadyLinked || linkDocument.isPending}
                      onClick={() => addLink(c)}
                      className="docintel-link-candidate"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        padding: "7px 10px",
                        border: "none",
                        borderRadius: 4,
                        background: "transparent",
                        color: alreadyLinked
                          ? "var(--ds-text-subtlest)"
                          : "var(--ds-text)",
                        font: "var(--ds-font-body)",
                        cursor: alreadyLinked ? "default" : "pointer",
                        textAlign: "start",
                      }}
                    >
                      {c.iconType ? (
                        <JiraIssueTypeIcon issueType={c.iconType} size={16} />
                      ) : (
                        <FileText
                          aria-hidden
                          style={{ width: 14, height: 14, color: "var(--ds-icon-subtle)", flexShrink: 0 }}
                        />
                      )}
                      {c.key ? (
                        <span
                          style={{
                            color: "var(--ds-text-subtle)",
                            font: "var(--ds-font-body-small)",
                            flexShrink: 0,
                          }}
                        >
                          {c.key}
                        </span>
                      ) : null}
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {c.title ?? (c.key ? "" : c.entityId)}
                      </span>
                      {alreadyLinked && <Lozenge appearance="default">Linked</Lozenge>}
                    </button>
                  );
                })
              )}
            </div>
          </div>
          <style>{`
            .docintel-link-candidate:hover:not(:disabled) { background: var(--ds-background-neutral-subtle); }
          `}</style>
        </ModalBody>
        <ModalFooter>
          <Button appearance="subtle" onClick={closePicker}>
            Close
          </Button>
        </ModalFooter>
      </Modal>

      {/* ── Unlink confirmation ── */}
      <Modal
        isOpen={confirmUnlink !== null}
        onClose={() => setConfirmUnlink(null)}
        width="small"
      >
        <ModalHeader>
          <ModalTitle>Remove link?</ModalTitle>
        </ModalHeader>
        <ModalBody>
          <p style={{ margin: 0, color: "var(--ds-text)", font: "var(--ds-font-body)" }}>
            This removes the link to{" "}
            <strong>
              {confirmUnlink?.entity_key ??
                confirmUnlink?.entity_title ??
                confirmUnlink?.entity_id}
            </strong>
            . Neither item is deleted.
          </p>
        </ModalBody>
        <ModalFooter>
          <Button appearance="subtle" onClick={() => setConfirmUnlink(null)}>
            Cancel
          </Button>
          <Button
            appearance="danger"
            isDisabled={unlinkDocument.isPending}
            onClick={() => {
              if (!confirmUnlink) return;
              unlinkDocument.mutate(
                { linkId: confirmUnlink.id, documentId },
                { onSuccess: () => setConfirmUnlink(null) },
              );
            }}
          >
            Remove
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}

export default DocumentLinksPanel;
