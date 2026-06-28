/**
 * CatyAiSearch — the canonical COLLAPSED search unit for Catalyst. One clubbed
 * box on every surface (backlog, AllWork list, kanban, filter previews):
 *
 *   [ CatyPulseIcon ] [ search-icon ] [ Search list … ] [ ⌘K | clear ]
 *
 * The magenta CatyPulseIcon sits INSIDE the box (not floating beside it).
 * Typing filters the parent's list immediately (plain substring, via
 * query/onQueryChange). Clicking the Caty mark — or pressing ⌘K / Ctrl+K —
 * fires onAskCaty, which the parent uses to open AskCatyInlineBar (the
 * AI natural-language mode) in place of its toolbar.
 *
 * Arabic plain-text input flips the field to RTL automatically.
 *
 * Parent contract:
 *   <CatyAiSearch
 *     query={search} onQueryChange={setSearch}
 *     onAskCaty={() => setAskCatyOpen(true)}
 *     placeholder="Search list"
 *   />
 */
import React, { useEffect, useRef, useState } from "react";
import SearchIconCore from "@atlaskit/icon/core/search";
import CrossIconCore from "@atlaskit/icon/core/close";
import Tooltip from "@atlaskit/tooltip";
import { CatyPulseIcon } from "@/components/ui/CatyPulseIcon";
import { containsArabic } from "@/lib/detectArabic";

export interface CatyAiSearchProps {
  /** Plain-text quick filter — controlled by the parent surface. */
  query: string;
  onQueryChange: (v: string) => void;
  /** Open the AI natural-language bar (parent renders AskCatyInlineBar). */
  onAskCaty: () => void;
  placeholder?: string;
  /** Width of the collapsed box. Defaults to a flexible 100%. */
  width?: number | string;
}

const isMac =
  typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);

export function CatyAiSearch({
  query,
  onQueryChange,
  onAskCaty,
  placeholder = "Search list",
  width,
}: CatyAiSearchProps) {
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // ⌘K / Ctrl+K opens the AI bar from anywhere on the surface.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === "k" || e.key === "K")) {
        e.preventDefault();
        onAskCaty();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onAskCaty]);

  const isRtl = containsArabic(query);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        width: width ?? "100%",
        height: 36,
        padding: "0 8px 0 6px",
        boxSizing: "border-box",
        background: "var(--ds-surface)",
        border: `1px solid ${
          focused
            ? "var(--ds-border-focused)"
            : "var(--ds-border)"
        }`,
        borderRadius: 8,
        transition: "border-color 120ms ease",
        fontFamily: "var(--cp-font-body)",
      }}
    >
      <Tooltip content="Ask Caty">
        {(tp) => (
          <button
            {...tp}
            type="button"
            onClick={onAskCaty}
            aria-label="Ask Caty"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 24,
              height: 24,
              border: "none",
              borderRadius: 6,
              background: "transparent",
              cursor: "pointer",
              flexShrink: 0,
            }}
          >
            <CatyPulseIcon size={16} />
          </button>
        )}
      </Tooltip>

      <span
        aria-hidden="true"
        style={{
          display: "inline-flex",
          alignItems: "center",
          color: "var(--ds-text-subtlest)",
          flexShrink: 0,
        }}
      >
        <SearchIconCore label="" color="currentColor" />
      </span>

      <input
        ref={inputRef}
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={placeholder}
        aria-label={placeholder}
        autoComplete="off"
        spellCheck={false}
        dir={isRtl ? "rtl" : "ltr"}
        style={{
          flex: 1,
          minWidth: 0,
          height: "100%",
          margin: 0,
          padding: 0,
          border: 0,
          outline: "2px solid var(--ds-border-focused)",
          background: "transparent",
          boxShadow: "none",
          font: "inherit",
          fontSize: 'var(--ds-font-size-400)',
          color: "var(--ds-text)",
          textAlign: isRtl ? "right" : "left",
          appearance: "none",
          WebkitAppearance: "none",
        }}
      />

      {query ? (
        <button
          type="button"
          onClick={() => {
            onQueryChange("");
            inputRef.current?.focus();
          }}
          aria-label="Clear search"
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 20,
            height: 20,
            border: "none",
            borderRadius: 4,
            background: "transparent",
            cursor: "pointer",
            color: "var(--ds-text-subtle)",
            flexShrink: 0,
          }}
        >
          <CrossIconCore label="" color="currentColor" />
        </button>
      ) : (
        <span
          aria-hidden="true"
          style={{
            flexShrink: 0,
            fontSize: 'var(--ds-font-size-100)',
            color: "var(--ds-text-subtlest)",
            border: "0.5px solid var(--ds-border)",
            borderRadius: 4,
            padding: "0px 6px",
          }}
        >
          {isMac ? "⌘K" : "Ctrl K"}
        </span>
      )}
    </div>
  );
}
