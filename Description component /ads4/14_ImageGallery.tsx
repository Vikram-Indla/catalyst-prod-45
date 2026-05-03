/**
 * Image Gallery Component
 * 
 * Gallery/carousel for viewing images in descriptions.
 * Features:
 * - Carousel (previous/next)
 * - Grid view (thumbnail grid)
 * - Lightbox modal
 * - Download button
 * 
 * All ADS themed, read-only.
 */

import React, { useState, useCallback, useMemo } from 'react';
import Button from '@atlaskit/button';
import { token } from '@atlaskit/tokens';
import Modal, { ModalBody, ModalHeader, ModalTitle } from '@atlaskit/modal-dialog';
import { Box } from '@atlaskit/primitives';

import type { ADFDocument, ImageNode } from './adf';

// ============================================================================
// TYPES
// ============================================================================

export interface GalleryImage {
  src: string;
  alt?: string;
  title?: string;
  width?: number;
  height?: number;
  index: number;
}

export interface ImageGalleryProps {
  adf: ADFDocument;
  viewMode?: 'carousel' | 'grid';
  onlyImages?: boolean; // If true, hide text content
}

// ============================================================================
// UTILITIES
// ============================================================================

/**
 * Extract all images from ADF document
 */
function extractImagesFromADF(adf: ADFDocument): GalleryImage[] {
  const images: GalleryImage[] = [];
  let index = 0;

  function walk(nodes: any[] = []) {
    for (const node of nodes) {
      if (node.type === 'image') {
        images.push({
          src: node.attrs?.src || '',
          alt: node.attrs?.alt,
          title: node.attrs?.title,
          width: node.attrs?.width,
          height: node.attrs?.height,
          index,
        });
        index++;
      } else if (node.content && Array.isArray(node.content)) {
        walk(node.content);
      }
    }
  }

  walk(adf.content);
  return images;
}

// ============================================================================
// CAROUSEL VIEW
// ============================================================================

interface CarouselProps {
  images: GalleryImage[];
  onClose?: () => void;
}

const CarouselView: React.FC<CarouselProps> = ({ images, onClose }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (images.length === 0) {
    return (
      <div
        style={{
          padding: token('space.200'),
          textAlign: 'center',
          color: token('color.text.subtlest'),
        }}
      >
        No images found
      </div>
    );
  }

  const current = images[currentIndex];
  const hasNext = currentIndex < images.length - 1;
  const hasPrev = currentIndex > 0;

  const handlePrev = () => {
    if (hasPrev) setCurrentIndex(currentIndex - 1);
  };

  const handleNext = () => {
    if (hasNext) setCurrentIndex(currentIndex + 1);
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: token('space.200'),
      }}
    >
      {/* ============================================================ */}
      {/* IMAGE DISPLAY */}
      {/* ============================================================ */}

      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '400px',
          backgroundColor: token('color.background.neutral'),
          borderRadius: token('border.radius.100'),
          overflow: 'hidden',
        }}
      >
        <img
          src={current.src}
          alt={current.alt || `Image ${currentIndex + 1}`}
          style={{
            maxWidth: '100%',
            maxHeight: '500px',
            objectFit: 'contain',
          }}
        />
      </div>

      {/* ============================================================ */}
      {/* CAPTION */}
      {/* ============================================================ */}

      {current.alt && (
        <p
          style={{
            margin: 0,
            fontSize: '13px',
            color: token('color.text.subtlest'),
            textAlign: 'center',
          }}
        >
          {current.alt}
        </p>
      )}

      {/* ============================================================ */}
      {/* NAVIGATION */}
      {/* ============================================================ */}

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Button
          appearance="default"
          onClick={handlePrev}
          isDisabled={!hasPrev}
        >
          ← Previous
        </Button>

        <span
          style={{
            fontSize: '13px',
            color: token('color.text.subtlest'),
          }}
        >
          {currentIndex + 1} / {images.length}
        </span>

        <Button
          appearance="default"
          onClick={handleNext}
          isDisabled={!hasNext}
        >
          Next →
        </Button>
      </div>

      {/* ============================================================ */}
      {/* DOWNLOAD */}
      {/* ============================================================ */}

      <Button
        appearance="subtle"
        onClick={() => {
          const a = document.createElement('a');
          a.href = current.src;
          a.download = current.alt || `image-${currentIndex}.jpg`;
          a.click();
        }}
      >
        ⬇️ Download
      </Button>
    </div>
  );
};

// ============================================================================
// GRID VIEW
// ============================================================================

interface GridProps {
  images: GalleryImage[];
  onImageClick?: (image: GalleryImage) => void;
}

const GridView: React.FC<GridProps> = ({ images, onImageClick }) => {
  if (images.length === 0) {
    return (
      <div
        style={{
          padding: token('space.200'),
          textAlign: 'center',
          color: token('color.text.subtlest'),
        }}
      >
        No images found
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
        gap: token('space.100'),
      }}
    >
      {images.map((img) => (
        <button
          key={img.index}
          onClick={() => onImageClick?.(img)}
          style={{
            border: 'none',
            padding: 0,
            cursor: 'pointer',
            borderRadius: token('border.radius.100'),
            overflow: 'hidden',
            backgroundColor: token('color.background.neutral'),
            aspectRatio: '1',
          }}
        >
          <img
            src={img.src}
            alt={img.alt || `Thumbnail ${img.index + 1}`}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              transition: 'transform 0.2s',
            }}
            onMouseEnter={(e) => {
              (e.target as HTMLImageElement).style.transform = 'scale(1.05)';
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLImageElement).style.transform = 'scale(1)';
            }}
          />
        </button>
      ))}
    </div>
  );
};

// ============================================================================
// MAIN GALLERY COMPONENT
// ============================================================================

export const ImageGallery = React.forwardRef<
  HTMLDivElement,
  ImageGalleryProps
>(({ adf, viewMode = 'carousel', onlyImages = false }, ref) => {
  const [selectedImage, setSelectedImage] = useState<GalleryImage | null>(null);
  const [mode, setMode] = useState<'carousel' | 'grid'>(viewMode);

  const images = useMemo(() => extractImagesFromADF(adf), [adf]);

  if (images.length === 0) {
    return (
      <div
        ref={ref}
        style={{
          padding: token('space.200'),
          color: token('color.text.subtlest'),
          textAlign: 'center',
        }}
      >
        No images in this description
      </div>
    );
  }

  return (
    <div
      ref={ref}
      style={{
        padding: token('space.200'),
      }}
    >
      {/* ============================================================ */}
      {/* VIEW MODE TOGGLE */}
      {/* ============================================================ */}

      <div
        style={{
          marginBottom: token('space.200'),
          display: 'flex',
          gap: token('space.050'),
        }}
      >
        <Button
          appearance={mode === 'carousel' ? 'primary' : 'default'}
          size="small"
          onClick={() => setMode('carousel')}
        >
          Carousel
        </Button>
        <Button
          appearance={mode === 'grid' ? 'primary' : 'default'}
          size="small"
          onClick={() => setMode('grid')}
        >
          Grid
        </Button>
      </div>

      {/* ============================================================ */}
      {/* VIEW CONTENT */}
      {/* ============================================================ */}

      {mode === 'carousel' ? (
        <CarouselView images={images} />
      ) : (
        <GridView images={images} onImageClick={setSelectedImage} />
      )}

      {/* ============================================================ */}
      {/* LIGHTBOX MODAL */}
      {/* ============================================================ */}

      {selectedImage && (
        <Modal onClose={() => setSelectedImage(null)} width="xlarge">
          <ModalHeader>
            <ModalTitle>
              Image {selectedImage.index + 1} of {images.length}
            </ModalTitle>
          </ModalHeader>
          <ModalBody>
            <CarouselView
              images={images}
              onClose={() => setSelectedImage(null)}
            />
          </ModalBody>
        </Modal>
      )}
    </div>
  );
});

ImageGallery.displayName = 'ImageGallery';

// ============================================================================
// STANDALONE GALLERY PAGE
// ============================================================================

export interface FullPageGalleryProps {
  adf: ADFDocument;
  title?: string;
}

/**
 * Full-page gallery view (for dedicated image showcase)
 */
export const FullPageGallery: React.FC<FullPageGalleryProps> = ({
  adf,
  title,
}) => {
  const images = useMemo(() => extractImagesFromADF(adf), [adf]);

  return (
    <div
      style={{
        padding: token('space.400'),
        maxWidth: '1200px',
        margin: '0 auto',
      }}
    >
      {title && (
        <h1
          style={{
            marginTop: 0,
            marginBottom: token('space.300'),
            color: token('color.text'),
          }}
        >
          {title}
        </h1>
      )}

      <p
        style={{
          marginBottom: token('space.200'),
          color: token('color.text.subtlest'),
          fontSize: '13px',
        }}
      >
        {images.length} image{images.length !== 1 ? 's' : ''} found
      </p>

      <ImageGallery adf={adf} viewMode="grid" onlyImages={true} />
    </div>
  );
};
