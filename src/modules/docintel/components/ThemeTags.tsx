/**
 * ThemeTags — per-document theme tagging + inline theme creation (Slice 5).
 *
 * Shows the document's current themes as removable tags, lets the user add an
 * existing theme (Select) or create a new one (name → docintelApi.createTheme →
 * auto-tag). All colour is component-owned (Tag / Lozenge / Select) — no bare
 * colours. CAT-DOCINTEL-V2-20260709-001
 */
import { useState } from "react";
import Tag from "@atlaskit/tag";
import { Button, Select, Textfield } from "@/components/ads";
import {
  useCreateTheme,
  useDocintelThemes,
  useDocumentThemeIds,
  useTagDocumentTheme,
  useUntagDocumentTheme,
} from "../hooks/useDocintel";

interface ThemeTagsProps {
  projectId: string;
  documentId: string;
}

export function ThemeTags({ projectId, documentId }: ThemeTagsProps) {
  const themesQuery = useDocintelThemes(projectId);
  const themes = themesQuery.data ?? [];
  const taggedQuery = useDocumentThemeIds(documentId);
  const taggedIds = new Set(taggedQuery.data ?? []);

  const tag = useTagDocumentTheme(projectId);
  const untag = useUntagDocumentTheme(projectId);
  const create = useCreateTheme(projectId);

  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");

  const tagged = themes.filter((t) => taggedIds.has(t.id));
  const untagged = themes.filter((t) => !taggedIds.has(t.id));

  const onCreate = () => {
    const name = newName.trim();
    if (name.length === 0 || create.isPending) return;
    create.mutate(
      { name },
      {
        onSuccess: (theme) => {
          tag.mutate({ documentId, themeId: theme.id });
          setNewName("");
          setCreating(false);
        },
      },
    );
  };

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
      <span style={{ color: "var(--ds-text-subtle)", fontSize: 13 }}>Themes:</span>

      {tagged.length === 0 && (
        <span style={{ color: "var(--ds-text-subtlest)", fontSize: 13 }}>none</span>
      )}
      {tagged.map((t) => (
        <Tag
          key={t.id}
          text={t.name}
          removeButtonLabel={`Remove ${t.name}`}
          onAfterRemove={() => untag.mutate({ documentId, themeId: t.id })}
        />
      ))}

      {untagged.length > 0 && (
        <div style={{ minWidth: 200 }}>
          <Select
            options={untagged.map((t) => ({ value: t.id, label: t.name }))}
            value={null}
            placeholder="Add theme…"
            onChange={(next) => {
              if (next) tag.mutate({ documentId, themeId: String(next.value) });
            }}
            aria-label="Add theme"
            isSearchable
          />
        </div>
      )}

      {creating ? (
        <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
          <div style={{ width: 180 }}>
            <Textfield
              value={newName}
              placeholder="New theme name"
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") onCreate();
              }}
              aria-label="New theme name"
            />
          </div>
          <Button
            appearance="primary"
            onClick={onCreate}
            isDisabled={create.isPending || newName.trim().length === 0}
          >
            Add
          </Button>
          <Button appearance="subtle" onClick={() => setCreating(false)}>
            Cancel
          </Button>
        </div>
      ) : (
        <Button appearance="subtle" onClick={() => setCreating(true)}>
          + New theme
        </Button>
      )}
    </div>
  );
}
