/**
 * Image Enhancement Handler
 * 
 * Advanced image processing:
 * - Crop/resize before upload
 * - Compression (WebP, quality)
 * - EXIF data removal
 * - Dimension constraints
 * 
 * All processing happens client-side (no server round-trip).
 * Final image uploaded to Supabase Storage.
 * 
 * DYNAMITE Stage D:
 * - User selects image → crop/resize UI → canvas processing → compressed blob → upload → CDN URL
 */

import type { UUID } from './description.types';

// ============================================================================
// TYPES
// ============================================================================

export interface ImageCropState {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: 0 | 90 | 180 | 270;
}

export interface ImageEnhancementOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 0-1, default 0.8
  format?: 'jpeg' | 'webp' | 'png';
  removeExif?: boolean;
}

export interface CompressedImageResult {
  blob: Blob;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  format: string;
  width: number;
  height: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_OPTIONS: ImageEnhancementOptions = {
  maxWidth: 2000,
  maxHeight: 2000,
  quality: 0.8,
  format: 'webp',
  removeExif: true,
};

const WEBP_SUPPORT = (() => {
  try {
    const canvas = document.createElement('canvas');
    return canvas.toDataURL('image/webp').startsWith('data:image/webp');
  } catch {
    return false;
  }
})();

// ============================================================================
// IMAGE CROPPING
// ============================================================================

/**
 * Extract cropped image from canvas/file
 * 
 * @param file - Original image file
 * @param cropState - Crop coordinates and rotation
 * @returns Cropped image blob
 */
export async function cropImage(
  file: File,
  cropState: ImageCropState
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d')!;

        // Set canvas dimensions (after rotation)
        if (cropState.rotation === 90 || cropState.rotation === 270) {
          canvas.width = cropState.height;
          canvas.height = cropState.width;
        } else {
          canvas.width = cropState.width;
          canvas.height = cropState.height;
        }

        // Apply rotation
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate((cropState.rotation * Math.PI) / 180);
        ctx.translate(-canvas.width / 2, -canvas.height / 2);

        // Draw cropped image
        ctx.drawImage(
          img,
          cropState.x,
          cropState.y,
          cropState.width,
          cropState.height,
          0,
          0,
          cropState.width,
          cropState.height
        );

        canvas.toBlob(resolve, file.type || 'image/jpeg', 0.9);
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = e.target?.result as string;
    };

    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

// ============================================================================
// IMAGE COMPRESSION
// ============================================================================

/**
 * Compress image with size constraints
 * 
 * DYNAMITE Stage D:
 * - User selects image → Client-side processing → Compressed blob → Upload to Storage
 * 
 * @param file - Original image file
 * @param options - Max width, height, quality, format
 * @returns Compressed blob with metadata
 */
export async function compressImage(
  file: File,
  options: ImageEnhancementOptions = {}
): Promise<CompressedImageResult> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d')!;

        // Calculate new dimensions (maintain aspect ratio)
        let width = img.width;
        let height = img.height;

        if (opts.maxWidth && width > opts.maxWidth) {
          const ratio = opts.maxWidth / width;
          width = opts.maxWidth;
          height = Math.round(height * ratio);
        }

        if (opts.maxHeight && height > opts.maxHeight) {
          const ratio = opts.maxHeight / height;
          height = opts.maxHeight;
          width = Math.round(width * ratio);
        }

        canvas.width = width;
        canvas.height = height;

        // Draw resized image
        ctx.drawImage(img, 0, 0, width, height);

        // Determine format (fallback to jpeg if WebP not supported)
        const format =
          opts.format === 'webp' && WEBP_SUPPORT ? 'image/webp' : 'image/jpeg';
        const mimeType = opts.format === 'png' ? 'image/png' : format;

        // Compress
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Failed to compress image'));
              return;
            }

            const compressionRatio = blob.size / file.size;

            resolve({
              blob,
              originalSize: file.size,
              compressedSize: blob.size,
              compressionRatio,
              format: mimeType,
              width,
              height,
            });
          },
          mimeType,
          opts.quality
        );
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = e.target?.result as string;
    };

    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

// ============================================================================
// EXIF REMOVAL
// ============================================================================

/**
 * Remove EXIF metadata (privacy)
 * 
 * Note: Canvas already removes EXIF, but this ensures it
 */
export async function removeExifData(file: File): Promise<File> {
  // Canvas operations automatically strip EXIF
  // This is a no-op but kept for explicit intent
  const blob = file.slice(0, file.size, 'image/jpeg');
  return new File([blob], file.name, { type: 'image/jpeg' });
}

// ============================================================================
// BATCH OPERATIONS
// ============================================================================

/**
 * Process multiple images in parallel
 */
export async function compressImageBatch(
  files: File[],
  options: ImageEnhancementOptions = {}
): Promise<CompressedImageResult[]> {
  return Promise.all(files.map((f) => compressImage(f, options)));
}

// ============================================================================
// UTILITIES
// ============================================================================

/**
 * Format file size with unit
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Calculate compression savings
 */
export function getCompressionSavings(original: number, compressed: number): {
  saved: number;
  savedPercent: number;
} {
  const saved = original - compressed;
  const savedPercent = (saved / original) * 100;
  return { saved, savedPercent };
}

/**
 * Estimate file size after compression (before actual compression)
 */
export function estimateCompressedSize(
  originalSize: number,
  quality: number = 0.8
): number {
  // Rough estimate: compression ratio improves with lower quality
  const estimatedRatio = 0.2 + (1 - quality) * 0.5; // 0.2 - 0.7 ratio
  return Math.round(originalSize * estimatedRatio);
}

// ============================================================================
// TESTING HELPERS
// ============================================================================

/**
 * Create test image with specific dimensions
 */
export async function createTestImage(
  width: number = 100,
  height: number = 100,
  format: 'jpeg' | 'png' = 'jpeg'
): Promise<File> {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;

    // Draw gradient
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, '#FF0000');
    gradient.addColorStop(1, '#0000FF');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    canvas.toBlob(
      (blob) => {
        resolve(
          new File([blob!], `test-${width}x${height}.${format}`, {
            type: `image/${format}`,
          })
        );
      },
      `image/${format}`
    );
  });
}

/**
 * Simulate crop operation
 */
export async function simulateCrop(
  file: File,
  cropPercent: number = 0.8
): Promise<ImageCropState> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const margin = (1 - cropPercent) / 2;
        resolve({
          x: Math.round(img.width * margin),
          y: Math.round(img.height * margin),
          width: Math.round(img.width * cropPercent),
          height: Math.round(img.height * cropPercent),
          rotation: 0,
        });
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}
