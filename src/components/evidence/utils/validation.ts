// ═══════════════════════════════════════════════════════════════════════════
// FILE VALIDATION UTILITIES
// ═══════════════════════════════════════════════════════════════════════════

import { toast } from 'sonner';
import { ALLOWED_TYPES, MAX_FILE_SIZE } from '../types';

export const validateFile = (file: File): boolean => {
  if (!ALLOWED_TYPES.includes(file.type as any)) {
    toast.error(`Invalid file type: ${file.name}`);
    return false;
  }

  if (file.size > MAX_FILE_SIZE) {
    toast.error(`File too large: ${file.name} (max 10MB)`);
    return false;
  }

  if (file.size === 0) {
    toast.error(`Empty file: ${file.name}`);
    return false;
  }

  return true;
};

export const getImageDimensions = (file: File | Blob): Promise<{ width: number; height: number }> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.width, height: img.height });
      URL.revokeObjectURL(img.src);
    };
    img.onerror = () => {
      resolve({ width: 0, height: 0 });
      URL.revokeObjectURL(img.src);
    };
    img.src = URL.createObjectURL(file);
  });
};

export const showCaptureFlash = () => {
  const flash = document.createElement('div');
  flash.className = 'fixed inset-0 bg-white pointer-events-none z-[9999]';
  flash.style.animation = 'flash 0.2s ease-out forwards';
  document.body.appendChild(flash);

  setTimeout(() => flash.remove(), 200);
};

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};
