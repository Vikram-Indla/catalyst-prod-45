/**
 * EpicDescriptionEditor — Epic-only write-mode editor for the description
 * field. Pilot pivot: the original plan wrapped `@atlaskit/editor-core`,
 * but that package's transitive dep tree (~280 @atlaskit packages) does
 * not resolve reliably in this build environment — Rollup fails with
 * missing-import errors on different transitive packages each round
 * (`@atlaskit/media-core`, `react-intl`, …).
 *
 * To keep the pilot regression-safe AND keep Lovable's CI build green,
 * the write-mode editor reuses the existing TipTap-based
 * `CatalystRichTextEditor`. The data contract (ADF JSON in/out) is
 * unchanged. Read-mode still uses `@atlaskit/renderer` via
 * `EpicDescriptionRenderer`, which has a smaller, manageable dep tree.
 *
 * Once the Atlaskit editor-core dep tree is fully resolvable in CI
 * (whether by registry whitelisting or by a Lovable infra fix), this
 * component can be re-wrapped around `<Editor appearance="comment">`
 * without touching any caller — props contract is preserved.
 */
import React, { useMemo } from 'react';
import { CatalystRichTextEditor } from '@/components/shared/rich-text';
import { parseStoredDescriptionToAdf } from './adfNormalizer';

export interface EpicDescriptionEditorProps {
  /** Raw stored description (ADF object, ADF JSON string, or null). */
  initialContent: unknown;
  /** Called with serialized ADF JSON string when the user clicks Save. */
  onSave: (adfJson: string) => void;
  /** Called when the user clicks Cancel. */
  onCancel: () => void;
  /** Work item id — used to scope uploaded image paths. */
  workItemId: string;
  placeholder?: string;
}

export default function EpicDescriptionEditor({
  initialContent,
  onSave,
  onCancel,
  workItemId,
  placeholder = 'Add a description...',
}: EpicDescriptionEditorProps) {
  /* Normalize whatever shape we got from the DB (jsonb object, JSON string,
     plain text, or null) into a canonical ADF doc, then re-serialize to a
     string for CatalystRichTextEditor's `content` prop. */
  const contentString = useMemo(() => {
    const adf = parseStoredDescriptionToAdf(initialContent);
    return JSON.stringify(adf);
  }, [initialContent]);

  return (
    <CatalystRichTextEditor
      content={contentString}
      onSave={onSave}
      onCancel={onCancel}
      placeholder={placeholder}
      minHeight={240}
      mode="save"
      workItemId={workItemId}
      storagePath="description-images"
    />
  );
}
