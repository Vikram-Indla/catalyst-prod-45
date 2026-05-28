/**
 * DisplayView — read-mode renderer for the Description.
 *
 * Reuses the canonical Catalyst ADF renderers (AdfLightRenderer for prose,
 * Atlaskit Renderer for complex docs with media / tables / panels). Visual
 * parity with the existing CatalystDescriptionSection is intentional — only
 * the edit experience changes in v1.
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
