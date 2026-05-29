/**
 * DisplayView — read-mode renderer for the Description.
 *
 * Mirrors CatalystDescriptionSection's read path 1:1:
 *   - hasComplexAdfNodes → EpicDescriptionRenderer (Atlaskit + Catalyst
 *     mediaNodeComponents that natively render external image URLs).
 *   - prose-only → AdfLightRenderer.
 *
 * Table width injection: the editor stores a custom `width` attribute
 * on table nodes (persisted via the ADF round-trip). The Atlaskit
 * renderers don't know about it, so after mount we walk the rendered
 * DOM, match tables by order to the ADF table nodes, and apply
 * `width: Npx !important` inline. A MutationObserver re-applies on
 * any subsequent DOM update (e.g. Suspense resolution).
 */
import { Suspense, useEffect, useRef } from 'react';
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

function extractTableWidths(adf: unknown): (number | undefined)[] {
  const widths: (number | undefined)[] = [];
  const walk = (node: unknown) => {
    if (!node || typeof node !== 'object') return;
    const n = node as { type?: string; attrs?: { width?: unknown }; content?: unknown[] };
    if (n.type === 'table') {
      const w = n.attrs?.width;
      widths.push(typeof w === 'number' ? w : undefined);
      return; // tables don't nest
    }
    if (Array.isArray(n.content)) n.content.forEach(walk);
  };
  const root = adf as { content?: unknown[] } | null | undefined;
  if (root && Array.isArray(root.content)) root.content.forEach(walk);
  else walk(adf);
  return widths;
}

export function DisplayView({ adf, issueKey }: DisplayViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const widths = extractTableWidths(adf);

    const apply = () => {
      const tables = container.querySelectorAll('table');
      tables.forEach((table, i) => {
        const w = widths[i];
        if (typeof w === 'number' && w > 0) {
          (table as HTMLElement).style.setProperty(
            'width',
            `${w}px`,
            'important',
          );
        } else {
          (table as HTMLElement).style.removeProperty('width');
        }
      });
    };

    apply();
    // Catch tables that appear later (Suspense resolution, async
    // content loaders, etc.). Cheap because we only re-query <table>.
    const observer = new MutationObserver(apply);
    observer.observe(container, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [adf]);

  const isComplex = hasComplexAdfNodes(adf as unknown);
  return (
    <div ref={containerRef}>
      {isComplex ? (
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
          <EpicDescriptionRenderer
            content={adf as unknown}
            issueKey={issueKey}
          />
        </Suspense>
      ) : (
        <AdfLightRenderer adf={adf as unknown} />
      )}
    </div>
  );
}
