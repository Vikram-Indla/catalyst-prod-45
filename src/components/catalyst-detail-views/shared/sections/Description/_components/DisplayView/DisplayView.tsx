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
import {
  injectMentionStyles,
  markMentionsSelfStatus,
} from '@/components/shared/rich-text/mentions/mentionStyles';
import { useAuth } from '@/hooks/useAuth';
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

/**
 * Walk the rendered DOM and set `dir="rtl"` / `dir="ltr"` on every
 * block-level element whose text content begins with a strong Arabic
 * or Latin character. Mirrors the editor's AutoDirection behaviour so
 * read mode matches edit mode — bullets, numbering, blockquote borders,
 * panel icons follow the content's direction even when Atlaskit's
 * heavy renderer is in use (which doesn't carry our `dir` attribute
 * through ADF).
 */
const ARABIC_DIR_RE_DV =
  /[؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿]/;
const LATIN_DIR_RE_DV = /[A-Za-z]/;
const DIR_BLOCK_SELECTOR =
  'p, h1, h2, h3, h4, h5, h6, ul, ol, li, blockquote, [data-panel-type], [data-block-type="panel"]';

function detectElementDir(el: HTMLElement): 'rtl' | 'ltr' | null {
  const text = el.textContent ?? '';
  for (const ch of text) {
    if (ARABIC_DIR_RE_DV.test(ch)) return 'rtl';
    if (LATIN_DIR_RE_DV.test(ch)) return 'ltr';
  }
  return null;
}

function applyDirectionToTree(root: HTMLElement) {
  const blocks = root.querySelectorAll<HTMLElement>(DIR_BLOCK_SELECTOR);
  blocks.forEach((el) => {
    const detected = detectElementDir(el);
    if (!detected) return;
    if (el.getAttribute('dir') !== detected) {
      el.setAttribute('dir', detected);
    }
  });
}

/**
 * Defensive CSS that runs in the document head once. Overrides any
 * left-locked spacing the Atlaskit renderer applies inline, so once
 * the dir attribute is set above the bullet position / border side
 * actually flips. Uses logical properties so the same rule covers
 * both LTR and RTL — `padding-inline-start` always lands on the
 * inline-start side of the element regardless of writing direction.
 */
const DIRECTION_STYLE_ID = 'catalyst-displayview-direction-styles';
function injectDirectionStyles() {
  if (typeof document === 'undefined') return;
  if (document.getElementById(DIRECTION_STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = DIRECTION_STYLE_ID;
  style.textContent = `
    /* List bullets / numbers always sit on the inline-start side of
       the list — flips to the right side when the list is RTL. */
    .atlaskit-renderer-wrapper ul[dir="rtl"],
    .atlaskit-renderer-wrapper ol[dir="rtl"] {
      padding-inline-start: 24px !important;
      padding-left: 0 !important;
    }
    .atlaskit-renderer-wrapper ul[dir="ltr"],
    .atlaskit-renderer-wrapper ol[dir="ltr"] {
      padding-inline-start: 24px !important;
      padding-right: 0 !important;
    }
    /* Blockquote border always on the inline-start side. */
    .atlaskit-renderer-wrapper blockquote[dir="rtl"],
    .atlaskit-renderer-wrapper blockquote[dir="ltr"] {
      border-inline-start: 2px solid var(--ds-border, rgba(11,18,14,0.14)) !important;
      border-left: none !important;
      border-right: none !important;
    }
  `;
  document.head.appendChild(style);
}

export function DisplayView({ adf, issueKey }: DisplayViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const currentUserId = user?.id ?? null;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    injectDirectionStyles();
    injectMentionStyles();
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
      // Mirror the editor's AutoDirection in read mode: walk every
      // block element and set `dir` based on its content's first
      // strong character. This is what flips list bullets and panel
      // borders to the correct side even when Atlaskit's heavy
      // renderer is in use.
      applyDirectionToTree(container);
      // Stamp current-user vs other-user mentions for the
      // two-tone chip styling.
      markMentionsSelfStatus(container, currentUserId);
    };

    apply();
    // Catch tables / blocks that appear later (Suspense resolution,
    // async content loaders, smart-card hydration, etc.).
    const observer = new MutationObserver(apply);
    observer.observe(container, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [adf, currentUserId]);

  const isComplex = hasComplexAdfNodes(adf as unknown);
  return (
    <div ref={containerRef}>
      {isComplex ? (
        <Suspense
          fallback={
            <div
              style={{
                fontSize: 'var(--ds-font-size-400)',
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
