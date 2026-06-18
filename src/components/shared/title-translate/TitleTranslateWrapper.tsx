import React, { useCallback, useMemo, useRef, useState } from "react";
import EditorUndoIcon from "@atlaskit/icon/glyph/editor/undo";
import { cn } from "@/lib/utils";
import { CatyPulseIcon } from "@/components/ui/CatyPulseIcon";
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
              <span className="ttw-caty-pulse"><CatyPulseIcon size={16} /></span>
              <span>Translating…</span>
            </span>
          ) : isArabic && !showingTranslation ? (
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
              <CatyPulseIcon size={14} />
              {translateLabel}
              <span className="ttw-translate-chip__arrow" aria-hidden="true">→</span>
            </button>
          ) : null}
        </div>
      )}
    </div>
  );
}
