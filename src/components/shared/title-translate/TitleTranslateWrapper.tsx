import React, { useCallback, useMemo, useRef, useState } from "react";
import Spinner from "@atlaskit/spinner";
import EditorUndoIcon from "@atlaskit/icon/glyph/editor/undo";
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
  issueKey?: string;
  field?: string;
  onTranslated?: (info: {
    original: string;
    translated: string;
    direction: "en_to_ar" | "ar_to_en";
  }) => void;
}

export function TitleTranslateWrapper({
  value,
  onValueChange,
  children,
  className,
  buttonClassName,
  issueKey = "",
  field = "summary",
  onTranslated,
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
      onTranslated?.({
        original: text,
        translated: result,
        direction: target === "ar" ? "en_to_ar" : "ar_to_en",
      });
      onValueChange(result);
      setShowingTranslation(true);
    } else {
      catalystToast.error("Translation failed");
    }
  }, [value, target, isTranslating, translate, issueKey, field, onValueChange, onTranslated]);

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
  const langLabel = target === "ar" ? "EN → AR" : "AR → EN";
  const translateLabel = target === "ar" ? "Translate to Arabic" : "Translate to English";

  return (
    <div
      className={cn("ttw-root", className)}
      data-dir={dir}
    >
      {children({ dir })}
      {hasText && (
        <div className="ttw-action-row">
          {isTranslating ? (
            <span
              className="ttw-translating-chip"
              aria-live="polite"
              aria-label="Translating"
            >
              <Spinner size="small" />
              <span>Translating…</span>
            </span>
          ) : showingTranslation ? (
            <span className="ttw-translated-chip">
              <span className="ttw-translated-chip__lang">{langLabel}</span>
              <span>Translated</span>
              <span className="ttw-translated-chip__sep" aria-hidden="true">·</span>
              <button
                type="button"
                className={cn("ttw-translated-chip__revert", buttonClassName)}
                onMouseDown={(e) => e.stopPropagation()}
                onClick={handleShowOriginal}
                aria-label="Show original text"
              >
                <EditorUndoIcon label="" size="small" />
                Show original
              </button>
            </span>
          ) : isArabic ? (
            <button
              type="button"
              className={cn("ttw-translate-chip", buttonClassName)}
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                handleTranslate();
              }}
              disabled={isTranslating}
              aria-label={translateLabel}
            >
              <span className="ttw-translate-chip__globe" aria-hidden="true" style={{display:"inline-flex"}}><svg width="14" height="14" viewBox="0 0 512 512" fill="none" style={{flexShrink:0}}><rect width="512" height="512" rx="129.62" fill="#1868DB"/><path d="M421.802 200.297V93.9736H259.279L233.457 127.39L210.674 93.9736H154.474C39.037 223.992 106.375 363.833 154.474 417.501H421.802V309.659H279.025L236.495 374.972C170.878 271.686 209.155 173.97 236.495 138.022L279.025 200.297H421.802Z" fill="white"/></svg></span>
              {translateLabel}
              <span className="ttw-translate-chip__arrow" aria-hidden="true">→</span>
            </button>
          ) : null}
        </div>
      )}
    </div>
  );
}
