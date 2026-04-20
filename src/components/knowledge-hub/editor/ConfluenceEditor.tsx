/**
 * ConfluenceEditor — Atlaskit-powered knowledge-hub document editor.
 *
 * 2026-04-20 — Rewritten from TipTap (@tiptap/*) to @atlaskit/editor-core
 * + @atlaskit/renderer. Per product directive: Atlaskit is the single
 * canonical rich-text surface; every editor in the app must route
 * through it. This also lets us delete the knowledge-hub TipTap macro
 * extensions (Info / Warning / Note / Expand panels) — all of those
 * map directly to Atlaskit's first-class `panel` + `expand` nodes.
 *
 * Content contract:
 *   - `content` IN  — ADF JSON string, ADF object, legacy HTML/JSON
 *     string, plain text, or null. Coerced via
 *     `parseStoredDescriptionToAdf` (same helper the epic / story
 *     description surface uses).
 *   - `onChange` OUT — ADF JSON string, so downstream code writing to
 *     `kb_documents.content` keeps the same text-column shape it had
 *     when ConfluenceEditor emitted HTML.
 *
 * Read mode (`editable === false`) renders through AtlaskitRenderer for
 * 1:1 Jira/Confluence visual parity (tables, panels, layout columns,
 * inline nodes). The previous TipTap prose-class wrapper is gone.
 */
import { useCallback, useMemo } from 'react';
import type { ADFEntity } from '@atlaskit/adf-utils/types';
import AtlaskitEditor from '@/components/shared/AtlaskitEditor';
import AtlaskitRenderer from '@/components/shared/AtlaskitRenderer';
import { parseStoredDescriptionToAdf } from '@/components/shared/rich-text/atlaskit/adfNormalizer';
import { isAdfEmpty } from '@/components/shared/rich-text/atlaskit/adfHelpers';

interface ConfluenceEditorProps {
  content: string;
  onChange: (content: string) => void;
  editable?: boolean;
  placeholder?: string;
}

export function ConfluenceEditor({
  content,
  onChange,
  editable = true,
  placeholder = 'Start writing...',
}: ConfluenceEditorProps) {
  const doc = useMemo(() => parseStoredDescriptionToAdf(content), [content]);

  const handleChange = useCallback(
    (adf: ADFEntity) => {
      onChange(JSON.stringify(adf));
    },
    [onChange]
  );

  if (!editable) {
    if (isAdfEmpty(doc)) {
      return (
        <div
          className="border rounded-lg bg-card"
          style={{
            minHeight: 300,
            padding: '2rem',
            color: 'hsl(var(--muted-foreground))',
            fontSize: 14,
            lineHeight: 1.6,
          }}
        >
          {placeholder}
        </div>
      );
    }
    return (
      <div
        className="border rounded-lg bg-card"
        style={{ padding: '1.5rem 2rem', minHeight: 300 }}
      >
        <AtlaskitRenderer document={doc} appearance="full-page" />
      </div>
    );
  }

  return (
    <div className="border rounded-lg bg-card overflow-hidden">
      <AtlaskitEditor
        appearance="full-page"
        defaultValue={doc}
        placeholder={placeholder}
        onChange={handleChange}
        minHeight={300}
      />
    </div>
  );
}

// Legacy re-export kept for import-path compatibility. The old
// TipTap-based `Editor` type no longer exists; consumers that imported
// it never actually used its shape — the name was re-exported as a
// convenience. Anyone still referring to it will get a TS error and
// should migrate to @atlaskit/editor-core types directly.
export type Editor = never;
