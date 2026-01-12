/**
 * Screenshot Capture Hook
 * Uses html-to-image to capture screenshots and uploads to Supabase storage
 */

import { useState, useCallback } from 'react';
import { toPng, toBlob } from 'html-to-image';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';

interface ScreenshotOptions {
  quality?: number;
  backgroundColor?: string;
  cacheBust?: boolean;
}

interface CapturedScreenshot {
  id: string;
  url: string;
  fileName: string;
  timestamp: Date;
  size: number;
}

export function useScreenshotCapture() {
  const [isCapturing, setIsCapturing] = useState(false);
  const [screenshots, setScreenshots] = useState<CapturedScreenshot[]>([]);

  /**
   * Capture screenshot of an element or the entire viewport
   */
  const captureScreenshot = useCallback(async (
    element?: HTMLElement | null,
    options: ScreenshotOptions = {}
  ): Promise<CapturedScreenshot | null> => {
    setIsCapturing(true);

    try {
      const targetElement = element || document.body;
      
      const blob = await toBlob(targetElement, {
        quality: options.quality || 0.95,
        backgroundColor: options.backgroundColor || '#ffffff',
        cacheBust: options.cacheBust ?? true,
        pixelRatio: 2, // Higher quality
      });

      if (!blob) {
        throw new Error('Failed to capture screenshot');
      }

      // Generate unique filename
      const timestamp = new Date();
      const fileName = `screenshot-${timestamp.toISOString().replace(/[:.]/g, '-')}-${uuidv4().slice(0, 8)}.png`;
      const filePath = `execution-screenshots/${fileName}`;

      // Upload to Supabase storage
      const { data, error } = await supabase.storage
        .from('test-attachments')
        .upload(filePath, blob, {
          contentType: 'image/png',
          cacheControl: '3600',
        });

      if (error) {
        // If bucket doesn't exist, create it (first time only)
        if (error.message.includes('not found')) {
          toast.error('Storage bucket not configured. Please contact admin.');
          throw error;
        }
        throw error;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('test-attachments')
        .getPublicUrl(filePath);

      const screenshot: CapturedScreenshot = {
        id: uuidv4(),
        url: urlData.publicUrl,
        fileName,
        timestamp,
        size: blob.size,
      };

      setScreenshots(prev => [...prev, screenshot]);
      toast.success('Screenshot captured!');
      
      return screenshot;
    } catch (error) {
      console.error('Screenshot capture failed:', error);
      toast.error('Failed to capture screenshot');
      return null;
    } finally {
      setIsCapturing(false);
    }
  }, []);

  /**
   * Capture screenshot of current viewport
   */
  const captureViewport = useCallback(async (options?: ScreenshotOptions) => {
    return captureScreenshot(document.documentElement, options);
  }, [captureScreenshot]);

  /**
   * Download screenshot as PNG
   */
  const downloadScreenshot = useCallback(async (
    element?: HTMLElement | null,
    filename = 'screenshot.png'
  ) => {
    try {
      const targetElement = element || document.body;
      const dataUrl = await toPng(targetElement, { quality: 0.95, pixelRatio: 2 });
      
      const link = document.createElement('a');
      link.download = filename;
      link.href = dataUrl;
      link.click();
      
      toast.success('Screenshot downloaded!');
    } catch (error) {
      console.error('Screenshot download failed:', error);
      toast.error('Failed to download screenshot');
    }
  }, []);

  /**
   * Clear all captured screenshots
   */
  const clearScreenshots = useCallback(() => {
    setScreenshots([]);
  }, []);

  /**
   * Delete a specific screenshot
   */
  const deleteScreenshot = useCallback(async (screenshot: CapturedScreenshot) => {
    try {
      const filePath = `execution-screenshots/${screenshot.fileName}`;
      await supabase.storage.from('test-attachments').remove([filePath]);
      setScreenshots(prev => prev.filter(s => s.id !== screenshot.id));
      toast.success('Screenshot deleted');
    } catch (error) {
      console.error('Failed to delete screenshot:', error);
      toast.error('Failed to delete screenshot');
    }
  }, []);

  return {
    isCapturing,
    screenshots,
    captureScreenshot,
    captureViewport,
    downloadScreenshot,
    clearScreenshots,
    deleteScreenshot,
  };
}
