/**
 * DescriptionRendererEnhanced
 * 
 * Extended renderer with:
 * - Diff view (compare two versions)
 * - Inline variant (compact, single-line)
 * - Custom styling hooks
 * - Image modal
 * 
 * Built on @atlaskit/renderer (Phase 2 foundation).
 * All colors use ADS tokens.
 */

import React, { useState, useMemo, useCallback } from 'react';
import { Renderer } from '@atlaskit/renderer';
import { token } from '@atlaskit/tokens';
import Button from '@atlaskit/button';
import Modal, { ModalBody, ModalHeader, ModalTitle } from '@atlaskit/modal-dialog';
import { Box } from '@atlaskit/primitives';

import type { ADFDocument } from './adf';
import { extractPlainText } from './adf';
import { DescriptionRenderer } from './DescriptionRenderer';
import type { DescriptionRendererProps, UUID } from './description.types';

// ============================================================================
// DIFF UTILITIES
// ============================================================================

/**
 * Simple text diff (not visual, just plain-text changes)
 * For production, use a library like 'diff-match-patch'
 */
function getTextDiff(oldText: string, newText: string): {
  added: string[];
  removed: string[];
  unchanged: string[];
} {
  const oldLines = oldText.split('\n');
  const newLines = newText.split('\n');

  const added: string[] = [];
  const removed: string[] = [];
  const unchanged: string[] = [];

  // Simple line-by-line diff (not LCS, but good enough for text content)
  const maxLines = Math.max(oldLines.length, newLines.length);
  for (let i = 0; i < maxLines; i++) {
    const oldLine = oldLines[i] || '';
    const newLine = newLines[i] || '';

    if (oldLine === newLine) {
      unchanged.push(oldLine);
    } else {
      if (oldLine) removed.push(oldLine);
      if (newLine) added.push(newLine);
    }
  }

  return { added, removed, unchanged };
}

// ============================================================================
// DIFF VIEW COMPONENT
// ============================================================================

export interface DiffViewProps {
  oldADF: ADFDocument;
  newADF: ADFDocument;
  className?: string;
}

/**
 * Side-by-side diff view of two ADF documents
 * 
 * DYNAMITE Stage D:
 * - Load two versions from DB (via useDescription)
 * - Extract text from each
 * - Line-by-line diff
 * - Render with added/removed/unchanged styling
 */
export const DiffView = React.forwardRef<HTMLDivElement, DiffViewProps>(
  ({ oldADF, newADF, className }, ref) => {
    const oldText = useMemo(() => extractPlainText(oldADF), [oldADF]);
    const newText = useMemo(() => extractPlainText(newADF), [newADF]);

    const diff = useMemo(() => getTextDiff(oldText, newText), [oldText, newText]);

    const hasChanges = diff.added.length > 0 || diff.removed.length > 0;

    return (
      <div
        ref={ref}
        className={className}
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: token('space.200'),
          width: '100%',
        }}
      >
        {/* ============================================================ */}
        {/* REMOVED (old version) */}
        {/* ============================================================ */}

        <div
          style={{
            border: `1px solid ${token('color.border.danger')}`,
            borderRadius: token('border.radius.100'),
            padding: token('space.100'),
            backgroundColor: token('color.background.danger'),
          }}
        >
          <h4
            style={{
              margin: 0,
              marginBottom: token('space.100'),
              color: token('color.text.danger'),
              fontSize: '13px',
            }}
          >
            Removed
          </h4>
          {diff.removed.length === 0 ? (
            <p
              style={{
                margin: 0,
                fontSize: '12px',
                color: token('color.text.subtlest'),
                fontStyle: 'italic',
              }}
            >
              (no changes)
            </p>
          ) : (
            diff.removed.map((line, i) => (
              <div
                key={i}
                style={{
                  fontSize: '12px',
                  color: token('color.text.danger'),
                  padding: '2px 0',
                  textDecoration: 'line-through',
                }}
              >
                {line}
              </div>
            ))
          )}
        </div>

        {/* ============================================================ */}
        {/* ADDED (new version) */}
        {/* ============================================================ */}

        <div
          style={{
            border: `1px solid ${token('color.border.success')}`,
            borderRadius: token('border.radius.100'),
            padding: token('space.100'),
            backgroundColor: token('color.background.success'),
          }}
        >
          <h4
            style={{
              margin: 0,
              marginBottom: token('space.100'),
              color: token('color.text.success'),
              fontSize: '13px',
            }}
          >
            Added
          </h4>
          {diff.added.length === 0 ? (
            <p
              style={{
                margin: 0,
                fontSize: '12px',
                color: token('color.text.subtlest'),
                fontStyle: 'italic',
              }}
            >
              (no changes)
            </p>
          ) : (
            diff.added.map((line, i) => (
              <div
                key={i}
                style={{
                  fontSize: '12px',
                  color: token('color.text.success'),
                  padding: '2px 0',
                  fontWeight: 'bold',
                }}
              >
                {line}
              </div>
            ))
          )}
        </div>

        {/* ============================================================ */}
        {/* CHANGE SUMMARY */}
        {/* ============================================================ */}

        {hasChanges && (
          <div
            style={{
              gridColumn: '1 / -1',
              marginTop: token('space.100'),
              paddingTop: token('space.100'),
              borderTop: `1px solid ${token('color.border')}`,
              fontSize: '12px',
              color: token('color.text.subtlest'),
            }}
          >
            <span style={{ marginRight: token('space.200') }}>
              ➖ {diff.removed.length} removed
            </span>
            <span style={{ marginRight: token('space.200') }}>
              ➕ {diff.added.length} added
            </span>
            {diff.unchanged.length > 0 && (
              <span>➡️ {diff.unchanged.length} unchanged</span>
            )}
          </div>
        )}
      </div>
    );
  }
);

DiffView.displayName = 'DiffView';

// ============================================================================
// INLINE VARIANT (COMPACT)
// ============================================================================

export interface InlineRendererProps extends DescriptionRendererProps {
  truncateAt?: number; // Character count to truncate at
}

/**
 * Inline/compact renderer for limited space (e.g., list items)
 * 
 * Features:
 * - Single line (no line breaks)
 * - Truncate if too long
 * - No expand/collapse
 * - Minimal padding
 */
export const InlineRenderer = React.forwardRef<
  HTMLDivElement,
  InlineRendererProps
>(({ adf, truncateAt = 100, className, ...props }, ref) => {
  const text = useMemo(() => {
    if (!adf) return '';
    const full = extractPlainText(adf);
    if (truncateAt && full.length > truncateAt) {
      return full.substring(0, truncateAt) + '…';
    }
    return full;
  }, [adf, truncateAt]);

  if (!text) {
    return (
      <span
        ref={ref}
        className={className}
        style={{
          color: token('color.text.subtlest'),
          fontStyle: 'italic',
          fontSize: '13px',
        }}
      >
        (no description)
      </span>
    );
  }

  return (
    <span
      ref={ref}
      className={className}
      style={{
        color: token('color.text'),
        fontSize: '13px',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        display: 'inline-block',
        maxWidth: '100%',
      }}
    >
      {text}
    </span>
  );
});

InlineRenderer.displayName = 'InlineRenderer';

// ============================================================================
// IMAGE MODAL (LIGHTBOX)
// ============================================================================

interface ImageModalProps {
  src: string;
  alt?: string;
  onClose: () => void;
}

/**
 * Full-screen image viewer modal
 */
const ImageModal: React.FC<ImageModalProps> = ({ src, alt, onClose }) => {
  return (
    <Modal onClose={onClose} width="xlarge">
      <ModalHeader>
        <ModalTitle>Image</ModalTitle>
      </ModalHeader>
      <ModalBody>
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '400px',
          }}
        >
          <img
            src={src}
            alt={alt || 'Image'}
            style={{
              maxWidth: '100%',
              maxHeight: '600px',
              objectFit: 'contain',
            }}
          />
        </div>
      </ModalBody>
    </Modal>
  );
};

// ============================================================================
// ENHANCED RENDERER (WITH IMAGE MODAL + DIFF TOGGLE)
// ============================================================================

export interface EnhancedRendererProps extends DescriptionRendererProps {
  showImageModal?: boolean;
  compareWith?: ADFDocument; // If provided, show diff toggle
}

/**
 * Full-featured renderer with:
 * - Image modal (click image to enlarge)
 * - Diff toggle (if compareWith provided)
 * - All ADS styling
 */
export const EnhancedRenderer = React.forwardRef<
  HTMLDivElement,
  EnhancedRendererProps
>(
  (
    {
      adf,
      entityId,
      entityType,
      className,
      showImageModal = true,
      compareWith,
      ...props
    },
    ref
  ) => {
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [showDiff, setShowDiff] = useState(false);

    const handleImageClick = useCallback(
      (src: string) => {
        if (showImageModal) {
          setSelectedImage(src);
        }
      },
      [showImageModal]
    );

    return (
      <div ref={ref} className={className}>
        {/* ============================================================ */}
        {/* DIFF TOGGLE */}
        {/* ============================================================ */}

        {compareWith && adf && (
          <div
            style={{
              marginBottom: token('space.100'),
              display: 'flex',
              gap: token('space.050'),
            }}
          >
            <Button
              appearance={showDiff ? 'primary' : 'default'}
              size="small"
              onClick={() => setShowDiff(!showDiff)}
            >
              {showDiff ? 'Hide diff' : 'Show diff'}
            </Button>
          </div>
        )}

        {/* ============================================================ */}
        {/* CONTENT OR DIFF */}
        {/* ============================================================ */}

        {showDiff && compareWith && adf ? (
          <DiffView oldADF={compareWith} newADF={adf} />
        ) : (
          <DescriptionRenderer
            adf={adf}
            entityId={entityId}
            entityType={entityType}
            onImageClick={handleImageClick}
            {...props}
          />
        )}

        {/* ============================================================ */}
        {/* IMAGE MODAL */}
        {/* ============================================================ */}

        {selectedImage && (
          <ImageModal
            src={selectedImage}
            alt="Full image"
            onClose={() => setSelectedImage(null)}
          />
        )}
      </div>
    );
  }
);

EnhancedRenderer.displayName = 'EnhancedRenderer';

// ============================================================================
// BATCH RENDERER (multiple descriptions)
// ============================================================================

export interface BatchRendererProps {
  descriptions: Array<{ id: string; adf: ADFDocument; label?: string }>;
  className?: string;
}

/**
 * Render multiple descriptions in a grid
 */
export const BatchRenderer = React.forwardRef<
  HTMLDivElement,
  BatchRendererProps
>(({ descriptions, className }, ref) => {
  return (
    <div
      ref={ref}
      className={className}
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: token('space.200'),
      }}
    >
      {descriptions.map((desc) => (
        <div
          key={desc.id}
          style={{
            border: `1px solid ${token('color.border')}`,
            borderRadius: token('border.radius.100'),
            padding: token('space.100'),
          }}
        >
          {desc.label && (
            <h5
              style={{
                margin: 0,
                marginBottom: token('space.050'),
                fontSize: '14px',
                color: token('color.text.subtlest'),
              }}
            >
              {desc.label}
            </h5>
          )}
          <DescriptionRenderer adf={desc.adf} expandable={true} maxLines={5} />
        </div>
      ))}
    </div>
  );
});

BatchRenderer.displayName = 'BatchRenderer';

// ============================================================================
// TESTING & EXPORT
// ============================================================================

export function useDiffView(oldADF: ADFDocument, newADF: ADFDocument) {
  const oldText = useMemo(() => extractPlainText(oldADF), [oldADF]);
  const newText = useMemo(() => extractPlainText(newADF), [newADF]);
  const diff = useMemo(() => getTextDiff(oldText, newText), [oldText, newText]);

  return {
    oldText,
    newText,
    diff,
    hasChanges: diff.added.length > 0 || diff.removed.length > 0,
  };
}
