import { useState, useMemo } from "react";
import { useLocation, useParams } from "react-router-dom";
import Button from "@atlaskit/button/new";
import AddIcon from "@atlaskit/icon/core/add";
import { CreateStoryModal } from "@/components/workhub/create-story";
import { CreateBusinessRequestModal } from "@/components/business-requests/CreateBusinessRequestModal";
import { NewIncidentModal } from "@/pages/incidenthub/components/NewIncidentModal";

/**
 * "+ Create" button — opens the canonical create surface for the current
 * module's primary entity. One click → the right create dialog.
 *
 * Per-module default (CAT-TASKS-20260627-001 + follow-up): the global Create
 * button routes by the active module so each opens its own entity create flow.
 * Each module's primary entity lives in a different table, so this routes to
 * the canonical create modal for that entity rather than forcing everything
 * through the unified work-item modal:
 *
 *   /project-hub/*   → CreateStoryModal, default work type 'Story'
 *   /product-hub/*   → CreateBusinessRequestModal (BRs live in business_requests)
 *   /tasks/*         → CreateStoryModal, default work type 'Task' (workstream + tasks table)
 *   /incident-hub/*  → NewIncidentModal (incidents table)
 *   /testhub/*       → CreateStoryModal, default work type 'QA Bug' (tm_defects)
 *   everywhere else  → CreateStoryModal, default work type 'Story'
 *
 * The user can still switch work type inside the unified modal; selecting
 * 'Business Request' there hands off to CreateBusinessRequestModal, and that
 * modal's type picker can route back via onWorkTypeChange → pendingWorkType.
 */

interface CreateDropdownProps {
  iconOnly?: boolean;
}

export function CreateDropdown({ iconOnly = false }: CreateDropdownProps = {}) {
  const [storyOpen, setStoryOpen] = useState(false);
  const [brOpen, setBrOpen] = useState(false);
  const [incidentOpen, setIncidentOpen] = useState(false);
  const [pendingWorkType, setPendingWorkType] = useState<string | undefined>(undefined);
  const { pathname } = useLocation();
  const params = useParams<{ key?: string }>();

  // Module detection from the URL prefix. Each module's "+ Create" opens its
  // own primary-entity create flow.
  const isProductHub = /^\/product-hub(\/|$)/.test(pathname);
  const isTasksModule = /^\/tasks(\/|$)/.test(pathname);
  const isIncidentHub = /^\/incident-hub(\/|$)/.test(pathname);
  const isTestHub = /^\/testhub(\/|$)/.test(pathname);

  // 2026-06-26: derive project context from the URL so the modal auto-selects
  // the current project. Without this, opening Create from
  // /project-hub/BAU/dashboard leaves the project picker empty → the Sprint
  // dropdown (gated on form.projectId) stays hidden.
  const projectKeyFromUrl = useMemo<string | undefined>(() => {
    if (params.key) return params.key;
    const m = pathname.match(/^\/(?:project|product)-hub\/([^/]+)/);
    return m ? m[1] : undefined;
  }, [params.key, pathname]);

  const handleCreate = () => {
    if (isIncidentHub) { setIncidentOpen(true); return; }
    if (isTestHub) { setPendingWorkType('QA Bug'); setStoryOpen(true); return; }
    if (isProductHub) { setBrOpen(true); return; }
    setStoryOpen(true);
  };

  return (
    <>
      <Button
        appearance="primary"
        iconBefore={() => <AddIcon label="" />}
        onClick={handleCreate}
      >
        {iconOnly ? "" : "Create"}
      </Button>

      <CreateStoryModal
        open={storyOpen}
        onClose={() => { setStoryOpen(false); setPendingWorkType(undefined); }}
        onOpenBusinessRequest={() => { setStoryOpen(false); setBrOpen(true); }}
        projectKey={projectKeyFromUrl}
        defaultWorkType={
          pendingWorkType ??
          (isTasksModule ? 'Task' : 'Story')
        }
      />

      <CreateBusinessRequestModal
        isOpen={brOpen}
        onClose={() => setBrOpen(false)}
        onWorkTypeChange={(type) => { setBrOpen(false); setPendingWorkType(type); setStoryOpen(true); }}
      />

      <NewIncidentModal open={incidentOpen} onClose={() => setIncidentOpen(false)} />
    </>
  );
}
