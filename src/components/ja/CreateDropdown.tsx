import { useState } from "react";
import Button from "@atlaskit/button/new";
import AddIcon from "@atlaskit/icon/core/add";
import { CreateStoryModal } from "@/components/workhub/create-story";

/**
 * "+ Create" button — opens the Jira-style CreateStoryModal directly.
 * No dropdown. One click → full create dialog.
 */

interface CreateDropdownProps {
  iconOnly?: boolean;
}

export function CreateDropdown({ iconOnly = false }: CreateDropdownProps = {}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        appearance="primary"
        iconBefore={() => <AddIcon label="" />}
        onClick={() => setOpen(true)}
      >
        {iconOnly ? "" : "Create"}
      </Button>

      <CreateStoryModal
        open={open}
        onClose={() => setOpen(false)}
      />
    </>
  );
}
