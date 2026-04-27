import { useState } from "react";
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
 */

interface CreateDropdownProps {
  iconOnly?: boolean;
}

export function CreateDropdown({ iconOnly = false }: CreateDropdownProps = {}) {
  const [storyOpen, setStoryOpen] = useState(false);
  const [brOpen, setBrOpen] = useState(false);

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
        onClose={() => setStoryOpen(false)}
        onOpenBusinessRequest={() => setBrOpen(true)}
      />

      <CreateBusinessRequestModal
        isOpen={brOpen}
        onClose={() => setBrOpen(false)}
      />
    </>
  );
}
