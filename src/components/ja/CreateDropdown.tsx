import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Button, { IconButton } from "@atlaskit/button/new";
import Tooltip from "@atlaskit/tooltip";
import AddIcon from "@atlaskit/icon/glyph/add";
import { ButtonItem, MenuGroup, Section } from "@atlaskit/menu";
import Popup from "@atlaskit/popup";
import { CreateStoryModal } from "@/components/workhub/create-story";

/**
 * Create dropdown — Atlaskit parity.
 * Preserves the full 15-item inventory from the legacy dropdown
 * (5 work items + 10 other items), each with its original routeMap target.
 * "Stories" opens the in-app CreateStoryModal; every other item navigates
 * to its respective hub page with the appropriate create query param.
 */

type CreateItem = {
  label: string;
  route?: string;
  action?: "story-modal";
};

const workItems: CreateItem[] = [
  { label: "Business Request", route: "/producthub?create=true" },
  { label: "Features", route: "/features?create=true" },
  { label: "Stories", action: "story-modal" },
  { label: "Defects", route: "/releases/defects?create=true" },
  { label: "Tasks", route: "/items/tasks" },
];

const otherItems: CreateItem[] = [
  { label: "Objectives", route: "/items/objectives" },
  { label: "Dependencies", route: "/items/dependencies" },
  { label: "Ideation", route: "/items/ideation" },
  { label: "Risks", route: "/items/risks" },
  { label: "Impediments", route: "/items/impediments" },
  { label: "Specifications", route: "/items/specifications" },
  { label: "Releases", route: "/items/sprints" },
  { label: "Program Increments", route: "/items/program-increments" },
  { label: "Release Vehicles", route: "/items/release-vehicles" },
  { label: "Incidents", route: "/release/incidents" },
];

interface CreateDropdownProps {
  iconOnly?: boolean;
}

export function CreateDropdown({ iconOnly = false }: CreateDropdownProps = {}) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [createStoryOpen, setCreateStoryOpen] = useState(false);

  const handleSelect = (item: CreateItem) => {
    setOpen(false);
    if (item.action === "story-modal") {
      setCreateStoryOpen(true);
      return;
    }
    if (item.route) {
      navigate(item.route);
    }
  };

  return (
    <>
      <Popup
        isOpen={open}
        onClose={() => setOpen(false)}
        placement="bottom-end"
        content={() => (
          <MenuGroup minWidth="240px" maxHeight="500px" menuLabel="Create">
            <Section title="Work items">
              {workItems.map((item) => (
                <ButtonItem key={item.label} onClick={() => handleSelect(item)}>
                  {item.label}
                </ButtonItem>
              ))}
            </Section>
            <Section title="Other" hasSeparator>
              {otherItems.map((item) => (
                <ButtonItem key={item.label} onClick={() => handleSelect(item)}>
                  {item.label}
                </ButtonItem>
              ))}
            </Section>
          </MenuGroup>
        )}
        trigger={(triggerProps) =>
          iconOnly ? (
            <Tooltip content="Create" position="bottom">
              <IconButton
                {...triggerProps}
                label="Create"
                appearance="primary"
                icon={AddIcon}
                onClick={() => setOpen((current) => !current)}
                isSelected={open}
              />
            </Tooltip>
          ) : (
            <Button
              {...triggerProps}
              appearance="primary"
              iconBefore={() => <AddIcon label="" size="small" />}
              onClick={() => setOpen((current) => !current)}
            >
              Create
            </Button>
          )
        }
      />

      <CreateStoryModal
        open={createStoryOpen}
        onClose={() => setCreateStoryOpen(false)}
      />
    </>
  );
}
