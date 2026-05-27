import React, { useCallback, useMemo, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { fetchFunction } from '@/integrations/supabase/functionsRouter';
import { containsArabic } from '@/lib/detectArabic';
import './title-translate.css';

export interface TitleTranslateWrapperProps {
  value: string;
  onValueChange: (next: string) => void;
  children: (helpers: { dir: 'rtl' | 'ltr' }) => React.ReactNode;
  className?: string;
  buttonClassName?: string;
}

export function TitleTranslateWrapper({
  value,
  onValueChange,
  children,
  className,
  buttonClassName,
}: TitleTranslateWrapperProps) {
  const [isTranslating, setIsTranslating] = useState(false);
  const [showingTranslation, setShowingTranslation] = useState(false);
  const originalRef = useRef<string>('');

  const isArabic = useMemo(() => containsArabic(value), [value]);
  const dir: 'rtl' | 'ltr' = isArabic ? 'rtl' : 'ltr';
  const target: 'ar' | 'en' = isArabic ? 'en' : 'ar';

  const handleTranslate = useCallback(async () => {
    const text = value.trim();
    if (!text || isTranslating) return;
    originalRef.current = text;
    setIsTranslating(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token ?? null;
      const res = await fetchFunction('ai-translate-title', {
        method: 'POST',
        accessToken,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, target }),
      });
      if (!res.ok) {
        let message = `Translation failed (${res.status})`;
        try {
          const errJson = await res.json();
          if (errJson?.message) message = errJson.message;
        } catch {
          /* not JSON */
        }
        toast.error(message);
        return;
      }
      const json = (await res.json()) as { translated?: string };
      if (json.translated && json.translated.trim()) {
        onValueChange(json.translated.trim());
        setShowingTranslation(true);
      } else {
        toast.error('Translation returned empty text');
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Translation failed');
    } finally {
      setIsTranslating(false);
    }
  }, [value, target, isTranslating, onValueChange]);

  const handleShowOriginal = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (originalRef.current) {
      onValueChange(originalRef.current);
    }
    setShowingTranslation(false);
  }, [onValueChange]);

  const hasText = value.trim().length > 0;

  return (
    <div
      className={cn('ttw-root', isTranslating && 'ttw-translating', className)}
      data-dir={dir}
    >
      {children({ dir })}
      {hasText && (
        <div className="ttw-action-row">
          {isTranslating ? (
            <span className="ttw-caty-translating" aria-live="polite" aria-label="CATY is translating">
              <span className="ttw-sparkle" aria-hidden="true">✦</span>
              <span>CATY is translating</span>
              <span className="ttw-waveform" aria-hidden="true">
                <span /><span /><span /><span /><span />
              </span>
            </span>
          ) : showingTranslation ? (
            <span className="ttw-translated-state">
              <span className="ttw-sparkle" aria-hidden="true">✦</span>
              <span>CATY translated</span>
              <span className="ttw-sep" aria-hidden="true">·</span>
              <button
                type="button"
                className={cn('ttw-revert-btn', buttonClassName)}
                onMouseDown={(e) => e.stopPropagation()}
                onClick={handleShowOriginal}
                aria-label="Show original text"
              >
                ↩ Show original
              </button>
            </span>
          ) : (
            <button
              type="button"
              className={cn('ttw-translate-btn', buttonClassName)}
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                handleTranslate();
              }}
              disabled={isTranslating}
              aria-label={
                target === 'ar' ? 'Translate to Arabic' : 'Translate to English'
              }
            >
              {target === 'ar' ? 'Translate to Arabic' : 'Translate to English'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
