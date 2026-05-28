/**
 * DisplayView — read-mode renderer for the Description.
 *
 * Mirrors CatalystDescriptionSection's read path 1:1:
 *   - hasComplexAdfNodes → EpicDescriptionRenderer (Atlaskit + Catalyst
 *     mediaNodeComponents that natively render external image URLs).
 *   - prose-only → AdfLightRenderer.
 *
 * No DOM injection layer here. EpicDescriptionRenderer's mediaNodeComponents
 * already handle external images (they call useMediaUrl to read the URL
 * from the media node attrs and render a plain <img src={url}/>).
 */
import { Suspense } from 'react';
import {
  AdfLightRenderer,
  hasComplexAdfNodes,
} from '@/components/shared/rich-text/atlaskit/adfLightRenderer';
import EpicDescriptionRenderer from '@/components/shared/rich-text/atlaskit/EpicDescriptionRenderer';
import { adfToPlainText } from '@/components/shared/rich-text/atlaskit/adfHelpers';
import type { AdfDoc } from '../../utils/adfToTiptap';

interface DisplayViewProps {
  adf: AdfDoc | string | null | undefined;
  issueKey?: string;
}

export function DisplayView({ adf, issueKey }: DisplayViewProps) {
  const isComplex = hasComplexAdfNodes(adf as unknown);
  if (isComplex) {
    return (
      <Suspense
        fallback={
          <div
            style={{
              fontSize: 14,
              fontWeight: 400,
              color: 'var(--ds-text, #292A2E)',
              lineHeight: '24px',
              whiteSpace: 'pre-wrap',
            }}
          >
            {adfToPlainText(adf as unknown)}
          </div>
        }
      >
        <EpicDescriptionRenderer content={adf as unknown} issueKey={issueKey} />
      </Suspense>
    );
  }
  return <AdfLightRenderer adf={adf as unknown} />;
}
