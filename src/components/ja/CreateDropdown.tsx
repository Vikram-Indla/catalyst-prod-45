import { useState } from "react";
import Button from "@atlaskit/button/new";
import { ButtonItem, MenuGroup, Section } from "@atlaskit/menu";
import Popup from "@atlaskit/popup";
import { CreateStoryModal } from "@/components/workhub/create-story";

export function CreateDropdown() {
  const [open, setOpen] = useState(false);
  const [createStoryOpen, setCreateStoryOpen] = useState(false);

  const handleCreateStory = () => {
    setOpen(false);
    setCreateStoryOpen(true);
  };

  return (
    <>
      <Popup
        isOpen={open}
        onClose={() => setOpen(false)}
        placement="bottom-end"
        content={() => (
          <MenuGroup menuLabel="Create">
            <Section title="Work items">
              <ButtonItem onClick={handleCreateStory}>Story</ButtonItem>
            </Section>
          </MenuGroup>
        )}
        trigger={(triggerProps) => (
          <Button {...triggerProps} appearance="primary" onClick={() => setOpen((current) => !current)}>
            Create
          </Button>
        )}
      />

      <CreateStoryModal
        open={createStoryOpen}
        onClose={() => setCreateStoryOpen(false)}
      />
    </>
  );
}
