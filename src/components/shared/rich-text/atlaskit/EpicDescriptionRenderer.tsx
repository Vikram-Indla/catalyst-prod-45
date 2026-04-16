/**
 * EpicDescriptionRenderer — Read-mode ADF rendering for Epic descriptions.
 * Wraps `@atlaskit/renderer`'s ReactRenderer so the read view uses the same
 * ADF rendering pipeline that Jira itself uses, no HTML middleman.
 *
 * Media handling:
 *   - We feed the renderer ADF that has been normalized to use external
 *     media (`media.attrs.type === 'external'`, `attrs.url` set). Atlaskit's
 *     renderer handles external media without a MediaProvider.
 *   - Legacy ADF still using `attrs.url` with `attrs.type === 'file'` is
 *     coerced by the normalizer at parse time.
 */
import React, { useMemo } from 'react';
import { ReactRenderer } from '@atlaskit/renderer';
import { IntlProvider } from 'react-intl-next';
import { parseStoredDescriptionToAdf } from './adfNormalizer';

interface EpicDescriptionRendererProps {
  /** Stored description as ADF object, ADF JSON string, plain text, or null. */
  content: unknown;
}

export default function EpicDescriptionRenderer({ content }: EpicDescriptionRendererProps) {
  const adf = useMemo(() => parseStoredDescriptionToAdf(content), [content]);

  return (
    <IntlProvider locale="en">
      <div className="epic-desc-atlaskit-renderer">
        <ReactRenderer
          document={adf as any}
          appearance="full-page"
          adfStage="stage0"
        />
      </div>
    </IntlProvider>
  );
}
