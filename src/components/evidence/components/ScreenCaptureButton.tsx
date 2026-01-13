// ═══════════════════════════════════════════════════════════════════════════
// SCREEN CAPTURE BUTTON
// ═══════════════════════════════════════════════════════════════════════════

import React, { useState, useEffect, useCallback } from 'react';
import { Camera, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { showCaptureFlash } from '../utils/validation';

interface ScreenCaptureButtonProps {
  onCapture: (blob: Blob) => void;
  disabled?: boolean;
}

export const ScreenCaptureButton: React.FC<ScreenCaptureButtonProps> = ({
  onCapture,
  disabled
}) => {
  const [isCapturing, setIsCapturing] = useState(false);

  const handleCapture = useCallback(async () => {
    if (disabled || isCapturing) return;

    try {
      setIsCapturing(true);

      // Request screen capture
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: 'always' } as any,
        audio: false
      });

      // Get video track
      const track = stream.getVideoTracks()[0];
      
      // Create video element to capture frame
      const video = document.createElement('video');
      video.srcObject = stream;
      await video.play();

      // Wait a moment for the video to stabilize
      await new Promise(resolve => setTimeout(resolve, 100));

      // Create canvas and capture frame
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(video, 0, 0);

      // Stop stream
      track.stop();
      video.srcObject = null;

      // Flash effect
      showCaptureFlash();

      // Get blob
      canvas.toBlob((blob) => {
        if (blob) {
          onCapture(blob);
          toast.success('Screenshot captured');
        }
      }, 'image/png', 1.0);

    } catch (error) {
      if ((error as Error).name !== 'NotAllowedError') {
        console.error('Screen capture failed:', error);
        toast.error('Screen capture failed');
      }
    } finally {
      setIsCapturing(false);
    }
  }, [onCapture, disabled, isCapturing]);

  // Keyboard shortcut: Ctrl+Shift+S
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleCapture();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleCapture]);

  return (
    <button
      onClick={handleCapture}
      disabled={disabled || isCapturing}
      className="flex flex-col items-center gap-2 px-4 py-3 rounded-lg 
                 hover:bg-primary/10 transition-colors group
                 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {isCapturing ? (
        <Loader2 className="w-6 h-6 text-primary animate-spin" />
      ) : (
        <Camera className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors" />
      )}
      <span className="text-sm text-muted-foreground group-hover:text-primary transition-colors">
        {isCapturing ? 'Capturing...' : 'Capture Screen'}
      </span>
    </button>
  );
};
