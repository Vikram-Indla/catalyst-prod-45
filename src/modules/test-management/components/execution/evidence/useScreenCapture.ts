/**
 * Screen Capture Hook
 * Handles browser screen/window/tab capture functionality
 */

import { useState, useCallback } from 'react';
import { toast } from 'sonner';

interface ScreenCaptureResult {
  file: File;
  width: number;
  height: number;
}

interface UseScreenCaptureOptions {
  onCapture?: (file: File) => void;
}

export function useScreenCapture(options?: UseScreenCaptureOptions) {
  const [isCapturing, setIsCapturing] = useState(false);
  const [isSupported] = useState(() => {
    // Check if screen capture is supported
    return typeof navigator !== 'undefined' && 
           'mediaDevices' in navigator && 
           'getDisplayMedia' in navigator.mediaDevices;
  });

  /**
   * Capture the screen and return a File
   */
  const captureScreen = useCallback(async (): Promise<ScreenCaptureResult | null> => {
    if (!isSupported) {
      toast.error('Screen capture is not supported in this browser');
      return null;
    }

    setIsCapturing(true);

    try {
      // Request screen capture
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          displaySurface: 'monitor', // Prefer entire screen
        },
        audio: false,
      });

      // Get the video track
      const track = stream.getVideoTracks()[0];
      const settings = track.getSettings();
      const width = settings.width || 1920;
      const height = settings.height || 1080;

      // Create video element to capture frame
      const video = document.createElement('video');
      video.srcObject = stream;
      video.muted = true;

      await new Promise<void>((resolve) => {
        video.onloadedmetadata = () => {
          video.play();
          resolve();
        };
      });

      // Wait a frame for the video to be ready
      await new Promise(resolve => requestAnimationFrame(resolve));

      // Create canvas and capture frame
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) throw new Error('Failed to get canvas context');
      
      ctx.drawImage(video, 0, 0, width, height);

      // Stop all tracks
      stream.getTracks().forEach(t => t.stop());

      // Convert to blob
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (b) => b ? resolve(b) : reject(new Error('Failed to capture screenshot')),
          'image/png',
          1.0
        );
      });

      // Create file with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = `screenshot-${timestamp}.png`;
      const file = new File([blob], fileName, { type: 'image/png' });

      // Visual feedback - flash effect
      showCaptureFlash();

      // Call callback if provided
      options?.onCapture?.(file);

      toast.success('Screenshot captured');

      return { file, width, height };
    } catch (error) {
      if ((error as Error).name === 'NotAllowedError') {
        toast.error('Screen capture permission denied. Enable in browser settings.');
      } else if ((error as Error).name === 'AbortError') {
        // User cancelled - no error toast needed
      } else {
        console.error('Screen capture error:', error);
        toast.error('Failed to capture screen');
      }
      return null;
    } finally {
      setIsCapturing(false);
    }
  }, [isSupported, options]);

  return {
    captureScreen,
    isCapturing,
    isSupported,
  };
}

/**
 * Show a brief flash effect to indicate capture
 */
function showCaptureFlash() {
  const flash = document.createElement('div');
  flash.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: white;
    opacity: 0.8;
    z-index: 99999;
    pointer-events: none;
    animation: captureFlash 200ms ease-out forwards;
  `;

  // Add animation style
  const style = document.createElement('style');
  style.textContent = `
    @keyframes captureFlash {
      0% { opacity: 0.8; }
      100% { opacity: 0; }
    }
  `;
  document.head.appendChild(style);
  document.body.appendChild(flash);

  // Remove after animation
  setTimeout(() => {
    flash.remove();
    style.remove();
  }, 200);
}
