import React, { useCallback, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { catalystToast } from "@/lib/catalystToast";
import { containsArabic } from "@/lib/detectArabic";
import { useTranslation } from "@/hooks/useTranslation";
import "./title-translate.css";

export interface TitleTranslateWrapperProps {
  value: string;
  onValueChange: (next: string) => void;
  children: (helpers: { dir: "rtl" | "ltr" }) => React.ReactNode;
  className?: string;
  buttonClassName?: string;
  /**
   * Jira issue key (e.g. "BAU-5510"). When provided, translations are
   * cached in ph_issue_translations so repeat opens return instantly.
   * Omit (or pass '') for create-form surfaces that have no issue key yet.
   */
  issueKey?: string;
  /**
   * Which field is being translated — used as the cache key discriminator.
   * Defaults to 'summary'. Use 'description' or 'comment:<id>' for other fields.
   */
  field?: string;
}

export function TitleTranslateWrapper({
  value,
  onValueChange,
  children,
  className,
  buttonClassName,
  issueKey = "",
  field = "summary",
}: TitleTranslateWrapperProps) {
  const [showingTranslation, setShowingTranslation] = useState(false);
  const originalRef = useRef<string>("");

  const { translate, isTranslating } = useTranslation();

  const isArabic = useMemo(() => containsArabic(value), [value]);
  const dir: "rtl" | "ltr" = isArabic ? "rtl" : "ltr";
  const target: "ar" | "en" = isArabic ? "en" : "ar";

  const handleTranslate = useCallback(async () => {
    const text = value.trim();
    if (!text || isTranslating) return;
    originalRef.current = text;
    const result = await translate(text, { issueKey, field, target });
    if (result) {
      onValueChange(result);
      setShowingTranslation(true);
    } else {
      catalystToast.error("Translation failed");
    }
  }, [value, target, isTranslating, translate, issueKey, field, onValueChange]);

  const handleShowOriginal = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (originalRef.current) {
        onValueChange(originalRef.current);
      }
      setShowingTranslation(false);
    },
    [onValueChange],
  );

  const hasText = value.trim().length > 0;

  return (
    <div
      className={cn("ttw-root", isTranslating && "ttw-translating", className)}
      data-dir={dir}
    >
      {children({ dir })}
      {hasText && (
        <div className="ttw-action-row">
          {isTranslating ? (
            <span
              className="ttw-caty-translating"
              aria-live="polite"
              aria-label="CATY is translating"
            >
              <span className="ttw-sparkle" aria-hidden="true">
                ✦
              </span>
              <span>CATY is translating</span>
              <span className="ttw-waveform" aria-hidden="true">
                <span />
                <span />
                <span />
                <span />
                <span />
              </span>
            </span>
          ) : showingTranslation ? (
            <span className="ttw-translated-state">
              <span className="ttw-sparkle" aria-hidden="true">
                ✦
              </span>
              <span>CATY translated</span>
              <span className="ttw-sep" aria-hidden="true">
                ·
              </span>
              <button
                type="button"
                className={cn("ttw-revert-btn", buttonClassName)}
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
              className={cn("ttw-translate-btn", buttonClassName)}
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                handleTranslate();
              }}
              disabled={isTranslating}
              aria-label={
                target === "ar" ? "Translate to Arabic" : "Translate to English"
              }
            >
              {target === "ar" ? "Translate to Arabic" : "Translate to English"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
