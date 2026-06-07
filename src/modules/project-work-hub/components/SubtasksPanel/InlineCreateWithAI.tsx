/**
 * InlineCreateWithAI — the "+" / ⇧C create row.
 *
 * Text input + AI-suggested titles + "Choose existing" fuzzy search, rendered
 * as a combobox-style listbox below the input. Matches the Jira screenshot
 * shared by Vikram (BAU-4771 — two sections under the textfield, type
 * selector to the right of the input).
 *
 * Composition:
 *   @atlaskit/textfield  — input field
 *   useAIPredictTitles   — debounced Lovable-gateway suggestions
 *   useFuzzyChildSearch  — existing-issue search (ILIKE on summary/key)
 *
 * Keyboard model:
 *   ↓ / ↑  — move highlight through (suggestions, then existing results)
 *   Enter  — if highlight is on a suggestion → insert title + create
 *            if highlight is on an existing  → link-existing
 *            otherwise                       → create from current draft
 *   Esc    — cancel
 */
import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Textfield from '@atlaskit/textfield';
import { CornerDownLeft, Loader2, Search, Sparkles } from '@/lib/atlaskit-icons';
import { useAIPredictTitles } from './hooks/useAIPredictTitles';
import { useFuzzyChildSearch } from './hooks/useFuzzyChildSearch';
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';
import { TitleTranslateWrapper } from '@/components/shared/title-translate/TitleTranslateWrapper';

export interface InlineCreateWithAIProps {
  /** Allowed child types for this parent — from hierarchy.ts */
  allowedTypes: string[];
  draftType: string;
  onDraftTypeChange: (t: string) => void;
  /** Slot for the TypeSelector (rendered by parent so hierarchy logic stays there). */
  typeSelectorSlot: React.ReactNode;
  parentSummary: string;
  parentType: string;
  siblingSummaries: string[];
  excludedIds: string[];
  projectKey: string;
  isSubmitting: boolean;
  onCreate: (summary: string) => void;
  onLinkExisting: (issueId: string) => void;
  onCancel: () => void;
  /** Override the input placeholder text. Defaults to Jira's "What needs to be done?". */
  placeholder?: string;
  /** Forwarded to the underlying input so parents can refocus it programmatically. */
  inputRef?: React.RefObject<HTMLInputElement | null>;
}

type HighlightKind = 'suggestion' | 'existing';

export function InlineCreateWithAI({
  allowedTypes,
  typeSelectorSlot,
  parentSummary,
  parentType,
  siblingSummaries,
  excludedIds,
  projectKey,
  isSubmitting,
  onCreate,
  onLinkExisting,
  onCancel,
  placeholder = 'What needs to be done?',
  inputRef: externalInputRef,
}: InlineCreateWithAIProps) {
  const [draft, setDraft] = useState('');
  const [showPanel, setShowPanel] = useState(false);
  const [highlight, setHighlight] = useState<{ kind: HighlightKind; index: number } | null>(null);
  const internalInputRef = useRef<HTMLInputElement>(null);
  const inputRef = externalInputRef ?? internalInputRef;

  // The dropdown panel is rendered via React portal into document.body
  // so it escapes any ancestor overflow:hidden / overflow:auto clipping
  // (cv-drawer-body in fullPageMode, JiraTable's scroll container, etc.).
  // We track the input-row wrapper's bounding rect and anchor the portal
  // with position:fixed so it stays glued to the input as the user
  // scrolls or resizes the window.
  const wrapRef = useRef<HTMLDivElement>(null);
  const [panelRect, setPanelRect] = useState<{ top: number; left: number; width: number } | null>(null);

  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    // `preventScroll: true` suppresses focus()'s native instant-scroll so it
    // doesn't fight with the smooth scroll below.
    el.focus({ preventScroll: true });
    // Defer the smooth scroll one frame so React's layout commit (e.g.
    // SubtasksPanel just expanded + creating row mounted) finishes BEFORE
    // the scroll animation begins — otherwise the smooth scroll chases a
    // moving target and the motion feels glitchy.
    // `block:'center'` lands the input in the middle of the scroll
    // container — much more comfortable than the edge that `block:'nearest'`
    // produces.
    requestAnimationFrame(() => {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { suggestions, isLoading: aiLoading } = useAIPredictTitles({
    draft,
    parentSummary,
    parentType,
    siblingSummaries,
    disabled: allowedTypes.length === 0,
  });

  const { results: existing, isLoading: searchLoading } = useFuzzyChildSearch({
    query: draft,
    projectKey,
    excludedIds,
    // Apr 28, 2026 (jira-compare cycle 3): wire allowedTypes through so
    // the typeahead respects Jira's hierarchy. Without this an Epic
    // could surface another Epic as a linkable child (architectural
    // hierarchy bug Vikram flagged in cycle 2 critique).
    allowedTypes,
    disabled: allowedTypes.length === 0,
  });

  // Show the dropdown whenever there's something to show. We dropped the
  // previous `draft.trim().length >= 2` gate so the "Choose existing"
  // results render the moment the input is focused — `useFuzzyChildSearch`
  // returns the top N recent issues for an empty query.
  const hasAnyPanelContent = aiLoading || searchLoading
    || suggestions.length > 0 || existing.length > 0;

  useEffect(() => {
    // Reset highlight when the two result arrays change — keeps highlight in
    // bounds without forcing a specific selection.
    setHighlight(null);
  }, [suggestions.length, existing.length]);

  // Compute + track the portal panel position relative to the input wrapper.
  // useLayoutEffect so the first measurement runs before paint (no flash).
  // Scroll listener uses capture phase so it catches ANY ancestor scroll
  // container, not just window-level scroll.
  const panelOpen = showPanel && hasAnyPanelContent;
  useLayoutEffect(() => {
    if (!panelOpen) {
      setPanelRect(null);
      return;
    }
    const updatePosition = () => {
      const el = wrapRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      setPanelRect({
        top: rect.bottom + 2,
        left: rect.left,
        width: rect.width,
      });
    };
    updatePosition();
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);
    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [panelOpen]);

  const commitDraft = () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    onCreate(trimmed);
    setDraft('');
  };

  const moveHighlight = (dir: 1 | -1) => {
    const flat: Array<{ kind: HighlightKind; index: number }> = [
      ...suggestions.map((_, index) => ({ kind: 'suggestion' as const, index })),
      ...existing.map((_, index) => ({ kind: 'existing' as const, index })),
    ];
    if (flat.length === 0) return;
    const currentIdx = highlight
      ? flat.findIndex(h => h.kind === highlight.kind && h.index === highlight.index)
      : -1;
    const nextIdx = currentIdx === -1
      ? (dir === 1 ? 0 : flat.length - 1)
      : (currentIdx + dir + flat.length) % flat.length;
    setHighlight(flat[nextIdx]);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); moveHighlight(1); return; }
    if (e.key === 'ArrowUp') { e.preventDefault(); moveHighlight(-1); return; }
    if (e.key === 'Escape') { e.preventDefault(); onCancel(); return; }
    if (e.key === 'Enter') {
      e.preventDefault();
      if (highlight?.kind === 'suggestion' && suggestions[highlight.index]) {
        onCreate(suggestions[highlight.index]);
        setDraft('');
        return;
      }
      if (highlight?.kind === 'existing' && existing[highlight.index]) {
        onLinkExisting(existing[highlight.index].id);
        setDraft('');
        return;
      }
      commitDraft();
    }
  };

  const panelId = useMemo(() => `sp-create-panel-${Math.random().toString(36).slice(2, 8)}`, []);

  return (
    <div ref={wrapRef} className="sp-create-wrap" role="combobox" aria-expanded={showPanel && hasAnyPanelContent} aria-controls={panelId} aria-haspopup="listbox">
      <div className="sp-create-row">
        <div className="sp-create-input-wrap">
          <TitleTranslateWrapper value={draft} onValueChange={setDraft}>
            {({ dir }) => (
              <Textfield
                ref={inputRef}
                placeholder={placeholder}
                value={draft}
                onChange={(e) => setDraft((e.target as HTMLInputElement).value)}
                onFocus={() => setShowPanel(true)}
                onBlur={() => {
                  setTimeout(() => setShowPanel(false), 150);
                }}
                onKeyDown={onKeyDown}
                maxLength={255}
                isCompact
                appearance="subtle"
                dir={dir}
              />
            )}
          </TitleTranslateWrapper>
        </div>
        <div className="sp-create-actions">
          {typeSelectorSlot}
          <button
            type="button"
            onClick={commitDraft}
            disabled={!draft.trim() || isSubmitting}
            title="Create (Enter)"
            className="sp-create-submit"
            style={{
              cursor: draft.trim() ? 'pointer' : 'not-allowed',
              opacity: draft.trim() ? 1 : 0.5,
            }}
          >
            {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <CornerDownLeft size={14} />}
          </button>
        </div>
      </div>

      {showPanel && hasAnyPanelContent && panelRect && createPortal(
        <div
          id={panelId}
          className="sp-create-panel"
          role="listbox"
          data-sp-create-portal="true"
          onMouseDown={(e) => e.preventDefault()}
          style={{
            position: 'fixed',
            top: panelRect.top,
            left: panelRect.left,
            width: panelRect.width,
            right: 'auto',
            zIndex: 9999,
          }}
        >
          {/* Suggestions section */}
          {(suggestions.length > 0 || aiLoading) && (
            <>
              <div className="sp-create-section-label">
                <Sparkles size={11} color="var(--cp-purple-60, #7C3AED)" />
                <span>Suggestions</span>
                {aiLoading && <Loader2 size={11} className="animate-spin" color="var(--cp-purple-60, #7C3AED)" />}
              </div>
              {suggestions.map((s, i) => {
                const active = highlight?.kind === 'suggestion' && highlight.index === i;
                return (
                  <button
                    key={`sugg-${i}`}
                    type="button"
                    role="option"
                    aria-selected={active}
                    className={`sp-create-option ${active ? 'is-active' : ''}`}
                    onClick={() => { onCreate(s); setDraft(''); }}
                  >
                    <Sparkles size={12} color="var(--cp-purple-60, #7C3AED)" />
                    <span>{s}</span>
                  </button>
                );
              })}
            </>
          )}

          {/* Choose existing section */}
          {(existing.length > 0 || searchLoading) && (
            <>
              {(suggestions.length > 0 || aiLoading) && <div className="sp-pop-divider" />}
              <div className="sp-create-section-label">
                <Search size={11} color="var(--ds-text-subtlest, var(--cp-text-secondary, #6B778C))" />
                <span>Choose existing</span>
                {searchLoading && <Loader2 size={11} className="animate-spin" color="var(--ds-text-subtlest, var(--cp-text-secondary, #6B778C))" />}
              </div>
              {existing.map((r, i) => {
                const active = highlight?.kind === 'existing' && highlight.index === i;
                return (
                  <button
                    key={`ex-${r.id}`}
                    type="button"
                    role="option"
                    aria-selected={active}
                    className={`sp-create-option ${active ? 'is-active' : ''}`}
                    onClick={() => { onLinkExisting(r.id); setDraft(''); }}
                  >
                    <JiraIssueTypeIcon type={r.issue_type} size={14} />
                    <span style={{ fontFamily: 'var(--cp-font-mono)', fontSize: 12, color: 'var(--ds-text-selected, #1868DB)', marginRight: 8 }}>
                      {r.issue_key}
                    </span>
                    <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {r.summary}
                    </span>
                  </button>
                );
              })}
            </>
          )}
        </div>,
        document.body
      )}

      <div style={{ textAlign: 'right', padding: '6px 0 2px' }}>
        <button
          type="button"
          onClick={onCancel}
          className="sp-create-cancel"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
