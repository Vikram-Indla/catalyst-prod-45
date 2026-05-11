import type { Meta, StoryObj } from "@storybook/react-vite";
import { Avatar, Combobox, ComboboxList } from "@catylast/primitives";
import { color, fontFamily, space } from "@catylast/tokens";
import { useState } from "react";

type User = { id: string; name: string; team: string };

const USERS: User[] = [
  { id: "u1", name: "Wasim Khan", team: "Platform" },
  { id: "u2", name: "Alex Doe", team: "Platform" },
  { id: "u3", name: "Maya Patel", team: "Design" },
  { id: "u4", name: "Sarah Lee", team: "Design" },
  { id: "u5", name: "Tom Williams", team: "Mobile" },
  { id: "u6", name: "Priya Sharma", team: "Mobile" },
  { id: "u7", name: "Jordan Reyes", team: "Backend" },
  { id: "u8", name: "Ben Cooper", team: "Backend" },
];

const meta: Meta = {
  title: "Forms/Combobox",
};
export default meta;

type Story = StoryObj;

export const Default: Story = {
  render: function DefaultCombobox() {
    const [user, setUser] = useState<User | null>(null);
    return (
      <div
        style={{
          padding: space[20],
          width: "320px",
          fontFamily: fontFamily.sans,
        }}
      >
        <Combobox<User>
          value={user}
          options={USERS}
          getKey={(u) => u.id}
          getLabel={(u) => u.name}
          onSelect={setUser}
          onClear={() => setUser(null)}
          clearable
          placeholder="Assign someone"
          searchPlaceholder="Search by name"
          emptyText="No users match"
          renderTrigger={(u) => (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: space[8],
                minWidth: 0,
              }}
            >
              <Avatar name={u.name} size="xs" />
              <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
                {u.name}
              </span>
            </span>
          )}
          renderOption={(u) => (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: space[8],
                minWidth: 0,
              }}
            >
              <Avatar name={u.name} size="xs" />
              <span>{u.name}</span>
              <span style={{ color: color.text.subtle, marginLeft: "auto" }}>
                {u.team}
              </span>
            </span>
          )}
        />
      </div>
    );
  },
};

export const ListOnly: Story = {
  name: "ComboboxList (bare list)",
  render: function ListOnly() {
    const [user, setUser] = useState<User | null>(null);
    return (
      <div
        style={{
          padding: space[20],
          width: "320px",
          fontFamily: fontFamily.sans,
          border: `1px solid ${color.border.default}`,
          borderRadius: "6px",
          background: color.surface.overlay,
        }}
      >
        <ComboboxList<User>
          value={user}
          options={USERS}
          getKey={(u) => u.id}
          getLabel={(u) => u.name}
          onSelect={setUser}
          searchPlaceholder="Search users"
          renderOption={(u) => (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: space[8],
              }}
            >
              <Avatar name={u.name} size="xs" />
              {u.name}
            </span>
          )}
        />
      </div>
    );
  },
};
