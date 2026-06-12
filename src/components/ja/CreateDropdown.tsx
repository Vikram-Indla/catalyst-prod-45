import { useState } from "react";
import { useLocation } from "react-router-dom";
import Button from "@atlaskit/button/new";
import AddIcon from "@atlaskit/icon/core/add";
import { CreateStoryModal } from "@/components/workhub/create-story";
import { CreateBusinessRequestModal } from "@/components/business-requests/CreateBusinessRequestModal";

/**
 * "+ Create" button — opens the Jira-style CreateStoryModal directly.
 * No dropdown. One click → full create dialog.
 *
 * When the user selects "Business Request" in the work type picker,
 * CreateStoryModal hands off to CreateBusinessRequestModal.
 *
 * Route-scoped behaviour: on /product-hub/:key/backlog the Work-type
 * dropdown is restricted to 'Business Request' and pre-selected, so the
 * modal auto-hands off to CreateBusinessRequestModal on open (BRs live
 * in business_requests, not ph_issues).
 */

interface CreateDropdownProps {
  iconOnly?: boolean;
}

export function CreateDropdown({ iconOnly = false }: CreateDropdownProps = {}) {
  const [storyOpen, setStoryOpen] = useState(false);
  const [brOpen, setBrOpen] = useState(false);
  const [pendingWorkType, setPendingWorkType] = useState<string | undefined>(undefined);
  const { pathname } = useLocation();
  const isProductHubBacklog = /^\/product-hub\/[^/]+\/backlog/.test(pathname);

  return (
    <>
      <Button
        appearance="primary"
        iconBefore={() => <AddIcon label="" />}
        onClick={() => setStoryOpen(true)}
      >
        {iconOnly ? "" : "Create"}
      </Button>

      <CreateStoryModal
        open={storyOpen}
        onClose={() => { setStoryOpen(false); setPendingWorkType(undefined); }}
        onOpenBusinessRequest={() => { setStoryOpen(false); setBrOpen(true); }}
        workTypes={isProductHubBacklog ? ['Business Request'] : undefined}
        defaultWorkType={pendingWorkType ?? (isProductHubBacklog ? 'Business Request' : 'Story')}
      />

      <CreateBusinessRequestModal
        isOpen={brOpen}
        onClose={() => setBrOpen(false)}
        onWorkTypeChange={(type) => { setBrOpen(false); setPendingWorkType(type); setStoryOpen(true); }}
      />
    </>
  );
}
