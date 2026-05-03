/**
 * DescriptionRenderer Component
 * 
 * Read-only renderer for ADF documents using @atlaskit/renderer
 * Displays descriptions in:
 * - Full view (ReleaseHub detail)
 * - Truncated view (SignOffQueue preview)
 * - Expandable view (with "Read more")
 * 
 * Theme: Atlassian Design System (light mode)
 * All colors from ADS tokens.
 */

import React, { useMemo } from 'react';
import { Renderer } from '@atlaskit/renderer';
import { token } from '@atlaskit/tokens';
import Button from '@atlaskit/button';
import type { ADFDocument } from './adf';
import { extractPlainText, isEmptyDocument } from './adf';
import type { DescriptionRendererProps } from './description.types';
import { useDescriptionReadOnly } from './useDescription';

// ============================================================================
// HELPER: Truncate ADF document to N lines
// ============================================================================

/**
 * Truncate ADF document by approximate line count
 * Returns truncated ADF + ellipsis
 */
function truncateADFByLines(adf: ADFDocument, maxLines: number): ADFDocument {
  if (!adf.content || adf.content.length === 0) {
    return adf;
  }

  const text = extractPlainText(adf);
  const lines = text.split('\n');

  if (lines.length <= maxLines) {
    return adf;
  }

  // Take first maxLines, rejoin, then wrap in paragraph
  const truncated = lines.slice(0, maxLines).join('\n');

  return {
    version: 1,
    type: 'doc',
    content: [
      {
        type: 'paragraph',
        content: [
          {
            type: 'text',
            text: truncated + '...',
          },
        ],
      },
    ],
  };
}

// ============================================================================
// COMPONENT: Full Renderer
// ============================================================================

export const DescriptionRenderer = React.forwardRef<
  HTMLDivElement,
  DescriptionRendererProps
>(
  (
    {
      adf,
      entityId,
      entityType,
      expandable = false,
      maxLines,
      className,
      onImageClick,
      onLinkClick,
    },
    ref
  ) => {
    // =====================================================================
    // STATE: Expandable
    // =====================================================================

    const [isExpanded, setIsExpanded] = React.useState(!expandable);

    // =====================================================================
    // DERIVED DATA
    // =====================================================================

    const isEmpty = useMemo(
      () => !adf || isEmptyDocument(adf),
      [adf]
    );

    const displayADF = useMemo(() => {
      if (!adf) return null;
      if (expandable && !isExpanded && maxLines) {
        return truncateADFByLines(adf, maxLines);
      }
      return adf;
    }, [adf, expandable, isExpanded, maxLines]);

    // =====================================================================
    // LOAD FROM DB (if entityId/entityType provided)
    // =====================================================================

    const { content_adf: dbADF, isLoading } = useDescriptionReadOnly(
      entityId as any,
      entityType as any
    );

    const finalADF = adf ?? dbADF;

    // =====================================================================
    // RENDERING
    // =====================================================================

    if (isLoading) {
      return (
        <div
          ref={ref}
          className={className}
          style={{
            padding: token('space.100'),
            color: token('color.text.subtlest'),
            fontSize: '14px',
          }}
        >
          Loading...
        </div>
      );
    }

    if (isEmpty) {
      return (
        <div
          ref={ref}
          className={className}
          style={{
            padding: token('space.100'),
            color: token('color.text.subtlest'),
            fontSize: '14px',
            fontStyle: 'italic',
          }}
        >
          No description provided
        </div>
      );
    }

    return (
      <div
        ref={ref}
        className={className}
        style={{
          width: '100%',
        }}
      >
        {/* ============================================================ */}
        {/* RENDERER (Atlaskit) */}
        {/* ============================================================ */}

        <div
          style={{
            padding: token('space.100'),
            color: token('color.text'),
            fontSize: '14px',
            lineHeight: '1.5',
            wordBreak: 'break-word',
          }}
        >
          {finalADF && (
            <Renderer
              document={finalADF}
              media={{
                allowLinking: true,
              }}
              eventHandlers={{
                link: {
                  onClick: (event) => {
                    if (onLinkClick) {
                      const href =
                        event.currentTarget.getAttribute('href') || '#';
                      onLinkClick(href, event as any);
                    }
                  },
                },
                image: {
                  onClick: (event) => {
                    if (onImageClick) {
                      const src = event.currentTarget.getAttribute('src') || '';
                      onImageClick(src);
                    }
                  },
                },
              }}
            />
          )}
        </div>

        {/* ============================================================ */}
        {/* EXPAND/COLLAPSE BUTTON */}
        {/* ============================================================ */}

        {expandable && (
          <div
            style={{
              marginTop: token('space.100'),
              paddingTop: token('space.100'),
              borderTop: `1px solid ${token('color.border')}`,
              display: 'flex',
              justifyContent: 'center',
            }}
          >
            <Button
              appearance="subtle"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? 'Read less' : 'Read more'}
            </Button>
          </div>
        )}
      </div>
    );
  }
);

DescriptionRenderer.displayName = 'DescriptionRenderer';

// ============================================================================
// VARIANT: Inline Renderer (compact, no padding)
// ============================================================================

export const DescriptionRendererInline = React.forwardRef<
  HTMLDivElement,
  Omit<DescriptionRendererProps, 'expandable'>
>(({ adf, entityId, entityType, maxLines = 3, ...props }, ref) => {
  return (
    <div
      ref={ref}
      style={{
        fontSize: '13px',
        lineHeight: '1.4',
        color: token('color.text'),
      }}
    >
      <DescriptionRenderer
        adf={adf}
        entityId={entityId}
        entityType={entityType}
        expandable={true}
        maxLines={maxLines}
        {...props}
      />
    </div>
  );
});

DescriptionRendererInline.displayName = 'DescriptionRendererInline';

// ============================================================================
// VARIANT: Preview Renderer (truncated, with ellipsis)
// ============================================================================

export const DescriptionRendererPreview = React.forwardRef<
  HTMLDivElement,
  Omit<DescriptionRendererProps, 'expandable' | 'maxLines'>
>(({ adf, entityId, entityType, ...props }, ref) => {
  const truncated = useMemo(() => {
    if (!adf) return null;
    return truncateADFByLines(adf, 2);
  }, [adf]);

  return (
    <div
      ref={ref}
      style={{
        fontSize: '13px',
        lineHeight: '1.4',
        color: token('color.text.subtlest'),
      }}
    >
      <DescriptionRenderer
        adf={truncated || adf}
        entityId={entityId}
        entityType={entityType}
        expandable={false}
        {...props}
      />
    </div>
  );
});

DescriptionRendererPreview.displayName = 'DescriptionRendererPreview';

// ============================================================================
// HOOK VARIANT: Use in components that manage their own state
// ============================================================================

export function useDescriptionRender(adf?: ADFDocument) {
  const isEmpty = useMemo(
    () => !adf || isEmptyDocument(adf),
    [adf]
  );

  const plainText = useMemo(
    () => (adf ? extractPlainText(adf) : ''),
    [adf]
  );

  const preview = useMemo(
    () => (adf ? truncateADFByLines(adf, 3) : null),
    [adf]
  );

  return {
    isEmpty,
    plainText,
    preview,
  };
}

// ============================================================================
// TESTING HELPERS
// ============================================================================

/**
 * Render component in test/dev environment
 */
export function testRenderDescription(adf: ADFDocument) {
  return (
    <DescriptionRenderer
      adf={adf}
      expandable={false}
    />
  );
}
