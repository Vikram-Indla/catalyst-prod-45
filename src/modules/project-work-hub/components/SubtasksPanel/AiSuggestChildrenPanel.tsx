/**
 * AiSuggestChildrenPanel — "Create suggested work items" panel.
 *
 * Header state machine (2026-07-02 Jira-parity):
 *   idle      → title "Create suggested work items", right = "Suggest" button
 *   loading   → title "Generating work item suggestions", right = spinner
 *   fetched   → title "Create suggested work items", right = "View n suggestions"
 *   expanded  → title "Create suggested work items", right = chevron-down + "Hide suggestions" tooltip
 *
 * Suggestion rows:
 *   - Hover reveals check / cross / edit action icons with tooltips.
 *   - Check → onCreate(suggestion) (SubtasksPanel handles the actual create).
 *   - Cross → removes the suggestion locally from the list.
 *   - Edit  → inline-edits the suggestion title.
 */
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '@/integrations/supabase/client';
import { fetchFunction } from '@/integrations/supabase/functionsRouter';
import { catalystToast } from '@/lib/catalystToast';
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';
/* eslint-disable no-restricted-imports */
import ChevronDown from '@atlaskit/icon/glyph/chevron-down';
import SendIcon from '@atlaskit/icon/core/send';
import InfoIcon from '@atlaskit/icon/core/information';
import ThumbsUpIcon from '@atlaskit/icon/core/thumbs-up';
import ThumbsDownIcon from '@atlaskit/icon/core/thumbs-down';
import CheckMarkIcon from '@atlaskit/icon/core/check-mark';
import CloseIcon from '@atlaskit/icon/core/close';
import EditIcon from '@atlaskit/icon/core/edit';
import WarningIcon from '@atlaskit/icon/core/warning';
import Tooltip from '@atlaskit/tooltip';
/* eslint-enable no-restricted-imports */
import './ai-suggest-children-panel.css';
// Canonical animated rainbow border + bouncing dots + typewriter caret
// live in ai-link-similar-panel.css (als-* classes). Reused here so both
// AI panels share the same generation affordance — do NOT duplicate.
import '../dialogs/story-detail-modules/ai-link-similar-panel.css';

// Canonical Jira subtask type order per Vikram directive — sub-task family
// only. Rendered in this exact order inside the row-level type picker.
const SUBTASK_TYPE_OPTIONS = ['Sub-task', 'Figma', 'Frontend', 'Backend', 'Integration'];

// Typewriter copy shown while streaming — matches Jira's Rovo affordance.
const GENERATING_COPY = 'Generating work item suggestions';

interface Suggestion {
  title: string;
  type: string;
}

export interface AiSuggestChildrenPanelProps {
  parentSummary: string;
  parentType: string;
  allowedChildTypes: string[];
  siblingSummaries: string[];
  defaultDraftType: string;
  isCreatingAny: boolean;
  onCreate: (suggestion: Suggestion) => void;
  onCreateAll: (suggestions: Suggestion[]) => void;
  /** Fires when the user clicks the Edit action on a suggestion row.
   *  Consumer prefills its create input with the suggestion so the user
   *  can tweak title / type before submitting (no auto-create) — Jira
   *  parity: Edit hands off to the primary create surface, it does not
   *  inline-edit the suggestion. */
  onEditRequest?: (suggestion: Suggestion) => void;
  /** When true, fires the AI fetch immediately on mount. When false,
   *  the panel stays idle showing the "Suggest" button until the user
   *  clicks it. Default true (back-compat). Used by SubtasksPanel to
   *  distinguish quick-actions-triggered create (auto-fetch) from
   *  panel-header-triggered create (manual Suggest). */
  autoFetch?: boolean;
}

function SparkleIcon({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M12 2.5l1.7 5.3a2 2 0 0 0 1.3 1.3l5.3 1.7-5.3 1.7a2 2 0 0 0-1.3 1.3L12 19.1l-1.7-5.3a2 2 0 0 0-1.3-1.3L3.7 10.8l5.3-1.7a2 2 0 0 0 1.3-1.3L12 2.5z"
        fill="var(--ds-text-subtle)"
      />
      <path
        d="M19 14l.6 1.7L21.3 16l-1.7.6L19 18l-.6-1.7L16.7 16l1.7-.6L19 14z"
        fill="var(--ds-text-subtle)"
      />
      <path
        d="M5 14l.6 1.7L7.3 16l-1.7.6L5 18l-.6-1.7L2.7 16l1.7-.6L5 14z"
        fill="var(--ds-text-subtle)"
      />
    </svg>
  );
}

export function AiSuggestChildrenPanel({
  parentSummary,
  parentType,
  allowedChildTypes,
  siblingSummaries,
  defaultDraftType,
  isCreatingAny,
  onCreate,
  onCreateAll,
  onEditRequest,
  autoFetch = true,
}: AiSuggestChildrenPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [hint, setHint] = useState('');
  const [feedback, setFeedback] = useState<'up' | 'down' | null>(null);
  const [typedText, setTypedText] = useState('');
  const abortRef = useRef<AbortController | null>(null);

  const fetchSuggestions = useCallback(
    async (userHint?: string) => {
      console.info('[AiSuggestChildrenPanel] fetch start', {
        parentType, allowedChildTypes, hint: userHint,
      });
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      setLoading(true);
      setError(null);
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const accessToken = sessionData?.session?.access_token ?? null;
        const res = await fetchFunction('ai-suggest-children', {
          method: 'POST',
          accessToken,
          headers: { 'Content-Type': 'application/json' },
          signal: ctrl.signal,
          body: JSON.stringify({
            parent_summary: parentSummary,
            parent_type: parentType,
            allowed_child_types: allowedChildTypes,
            sibling_summaries: siblingSummaries,
            user_hint: userHint ?? '',
          }),
        });
        if (!res.ok) {
          let message = `Suggestion request failed (${res.status})`;
          try {
            const errJson = await res.json();
            if (errJson?.message) message = errJson.message;
          } catch {
            /* not JSON */
          }
          console.error('[AiSuggestChildrenPanel] fetch failed:', res.status, message);
          setError(message);
          setHasFetched(true);
          return;
        }
        const json = (await res.json()) as { suggestions?: Suggestion[]; error?: string; message?: string; defaultType?: string };
        console.info('[AiSuggestChildrenPanel] raw response', json);
        if (ctrl.signal.aborted) return;
        const list = (json.suggestions ?? [])
          .filter((s) => s && typeof s.title === 'string' && s.title.trim())
          .map((s) => ({
            title: s.title.trim(),
            type:
              typeof s.type === 'string' && s.type.trim()
                ? s.type.trim()
                : defaultDraftType,
          }));
        console.info('[AiSuggestChildrenPanel] fetch ok', { count: list.length, sample: list.slice(0, 2) });
        setSuggestions(list);
        setHasFetched(true);
      } catch (e) {
        if (ctrl.signal.aborted) return;
        const msg = e instanceof Error ? e.message : 'Suggestion request failed';
        console.error('[AiSuggestChildrenPanel] exception:', msg, e);
        setError(msg);
        setHasFetched(true);
      } finally {
        if (!ctrl.signal.aborted) setLoading(false);
      }
    },
    [
      parentSummary,
      parentType,
      allowedChildTypes,
      siblingSummaries,
      defaultDraftType,
    ],
  );

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  // Auto-fetch on mount — matches the pre-refactor behaviour so the
  // panel starts streaming as soon as the user opens Create subtask,
  // instead of requiring an extra click on Suggest. Gated on autoFetch
  // (2026-07-02 Vikram): quick-actions "Create subtask" auto-fetches,
  // panel-header "+ Add subtask" waits for the user to click Suggest.
  useEffect(() => {
    if (!autoFetch) return;
    if (!hasFetched && !loading) {
      void fetchSuggestions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Typewriter for the streaming header title — mirrors the pattern in
  // AiLinkSimilarPanel exactly (setInterval typing 1 char every 55ms).
  useEffect(() => {
    if (!(loading && !hasFetched)) {
      setTypedText('');
      return;
    }
    let i = 0;
    setTypedText('');
    const interval = setInterval(() => {
      i += 1;
      if (i > GENERATING_COPY.length) {
        clearInterval(interval);
        return;
      }
      setTypedText(GENERATING_COPY.substring(0, i));
    }, 55);
    return () => clearInterval(interval);
  }, [loading, hasFetched]);

  const handleSuggest = () => {
    if (loading) return;
    void fetchSuggestions();
  };

  const handleHintSubmit = () => {
    const h = hint.trim();
    if (!h || loading) return;
    void fetchSuggestions(h);
  };

  const handleCreateAll = () => {
    if (suggestions.length === 0 || isCreatingAny) return;
    onCreateAll(suggestions);
  };

  const handleFeedback = (next: 'up' | 'down') => {
    setFeedback((cur) => (cur === next ? null : next));
    catalystToast({ title: 'Thanks for the feedback' });
  };

  const handleRowCreate = (s: Suggestion, i: number) => {
    onCreate(s);
    setSuggestions((prev) => prev.filter((_, idx) => idx !== i));
  };

  const handleRowRemove = (i: number) => {
    setSuggestions((prev) => prev.filter((_, idx) => idx !== i));
  };

  // Edit action hands the suggestion to the parent's primary create
  // surface (InlineCreateWithAI) via `onEditRequest`. Removes the row
  // from the AI list so the same suggestion isn't shown twice.
  const handleEditRequest = (s: Suggestion, i: number) => {
    if (onEditRequest) onEditRequest(s);
    setSuggestions((prev) => prev.filter((_, idx) => idx !== i));
  };

  const handleTypeChange = (i: number, nextType: string) => {
    setSuggestions((prev) =>
      prev.map((s, idx) => (idx === i ? { ...s, type: nextType } : s)),
    );
    setOpenPickerIndex(null);
  };

  // Row-type picker — manual portal + fixed positioning via
  // getBoundingClientRect, same pattern used by InlineCreateWithAI. Atlaskit
  // DropdownMenu / Popup misplaced under this app's layout (container
  // queries + transformed ancestors), so we render the menu ourselves.
  const [openPickerIndex, setOpenPickerIndex] = useState<number | null>(null);
  const [pickerRect, setPickerRect] = useState<{ top: number; left: number } | null>(null);
  const pickerTriggerRefs = useRef<Map<number, HTMLButtonElement>>(new Map());

  useLayoutEffect(() => {
    if (openPickerIndex === null) {
      setPickerRect(null);
      return;
    }
    const el = pickerTriggerRefs.current.get(openPickerIndex);
    if (!el) return;
    const update = () => {
      const r = el.getBoundingClientRect();
      setPickerRect({ top: r.bottom + 4, left: r.left });
    };
    update();
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
    };
  }, [openPickerIndex]);

  useEffect(() => {
    if (openPickerIndex === null) return;
    const onDown = (e: MouseEvent) => {
      const target = e.target as Node;
      const trigger = pickerTriggerRefs.current.get(openPickerIndex);
      if (trigger && trigger.contains(target)) return;
      const menu = document.getElementById('ascp-type-picker-menu');
      if (menu && menu.contains(target)) return;
      setOpenPickerIndex(null);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [openPickerIndex]);

  // Row-level type picker options — orders the canonical subtask family
  // (Sub-task → Figma → Frontend → Backend → Integration) filtered by
  // the parent-provided `allowedChildTypes`. Falls back to the raw
  // allowed list if none intersect (e.g. non-subtask parent types).
  const pickerOptions = (() => {
    const allowedLower = new Set(allowedChildTypes.map((t) => t.toLowerCase()));
    const canonical = SUBTASK_TYPE_OPTIONS.filter((t) => allowedLower.has(t.toLowerCase()));
    return canonical.length > 0 ? canonical : allowedChildTypes;
  })();

  // Show the animated colored border only while an initial fetch is in
  // flight. `hasFetched` is set after the first successful (or error'd)
  // fetch completes.
  const streaming = loading && !hasFetched;

  // "No results" collapses into the same error surface — Vikram directive
  // (2026-07-02): if the AI returned nothing, user sees the same "View
  // error" + "No suggestions" buttons and the warning banner, not a bare
  // Suggest button that looks like nothing happened.
  const noResults = hasFetched && !loading && !error && suggestions.length === 0;
  const showErrorSurface = !!error || noResults;

  return (
    <div className={`ascp-root ${streaming ? 'als-loading-frame' : ''}`}>
      <div className="ascp-surface">
        <div className="ascp-header">
          <span className="ascp-header__left">
            <SparkleIcon size={16} />
            {streaming ? (
              <span className="ascp-header__title ascp-header__title--loading" role="status" aria-live="polite">
                <span className="als-bouncing-dots" aria-hidden="true">
                  <span />
                  <span />
                  <span />
                </span>
                <span>
                  {typedText}
                  <span className="als-typewriter-caret" aria-hidden="true" />
                </span>
                <span className="sr-only">{GENERATING_COPY}</span>
              </span>
            ) : (
              <span className="ascp-header__title">
                Create suggested work items
                {showErrorSurface && (
                  <span className="ascp-header__title-note"> An error occurred.</span>
                )}
              </span>
            )}
          </span>
          <span className="ascp-header__right">
            {!streaming && !hasFetched && (
              <button
                type="button"
                className="ascp-header__cta"
                onClick={handleSuggest}
              >
                Suggest
              </button>
            )}
            {!streaming && hasFetched && !expanded && !showErrorSurface && suggestions.length > 0 && (
              <button
                type="button"
                className="ascp-header__cta"
                onClick={() => setExpanded(true)}
              >
                View {suggestions.length} suggestion{suggestions.length === 1 ? '' : 's'}
              </button>
            )}
            {!streaming && hasFetched && !expanded && showErrorSurface && (
              <>
                <button
                  type="button"
                  className="ascp-header__cta"
                  onClick={() => setExpanded(true)}
                >
                  View error
                </button>
                <button
                  type="button"
                  className="ascp-header__cta"
                  onClick={handleSuggest}
                >
                  No suggestions
                </button>
              </>
            )}
            {expanded && (
              <Tooltip content={showErrorSurface ? 'Hide error' : 'Hide suggestions'} position="bottom">
                <button
                  type="button"
                  aria-label={showErrorSurface ? 'Hide error' : 'Hide suggestions'}
                  className="ascp-header__chevron"
                  onClick={() => setExpanded(false)}
                >
                  <ChevronDown label="" />
                </button>
              </Tooltip>
            )}
          </span>
        </div>

        {expanded && (
          <>
            {showErrorSurface && (
              <div className="ascp-warning" role="alert">
                <span className="ascp-warning__icon" aria-hidden="true">
                  <WarningIcon label="" color="var(--ds-icon-warning)" />
                </span>
                <div className="ascp-warning__body">
                  <div className="ascp-warning__title">
                    We can&apos;t make suggestions for this work item
                  </div>
                  <div className="ascp-warning__message">
                    Try rewriting the description or any existing child work items, then try again.
                  </div>
                </div>
              </div>
            )}

            {!showErrorSurface && suggestions.length > 0 && (
              <div className="ascp-list">
                {suggestions.map((s, i) => (
                  <div
                    key={`${s.title}-${i}`}
                    className="ascp-row"
                    aria-disabled={isCreatingAny || undefined}
                  >
                    <button
                      ref={(el) => {
                        if (el) pickerTriggerRefs.current.set(i, el);
                        else pickerTriggerRefs.current.delete(i);
                      }}
                      type="button"
                      aria-label={`Change type — current: ${s.type}`}
                      aria-haspopup="menu"
                      aria-expanded={openPickerIndex === i}
                      className="ascp-row__type-trigger"
                      onClick={() =>
                        setOpenPickerIndex((cur) => (cur === i ? null : i))
                      }
                    >
                      <span className="ascp-row__icon">
                        <JiraIssueTypeIcon type={s.type} size={16} />
                      </span>
                      <span className="ascp-row__type-chevron" aria-hidden="true">
                        <ChevronDown label="" />
                      </span>
                    </button>
                    <span className="ascp-row__title" title={s.title}>{s.title}</span>
                    <span className="ascp-row__actions">
                      <Tooltip content="Create" position="top">
                        <button
                          type="button"
                          aria-label="Create"
                          className="ascp-row__action"
                          disabled={isCreatingAny}
                          onClick={() => handleRowCreate(s, i)}
                        >
                          <CheckMarkIcon label="" />
                        </button>
                      </Tooltip>
                      <Tooltip content="Remove" position="top">
                        <button
                          type="button"
                          aria-label="Remove"
                          className="ascp-row__action"
                          onClick={() => handleRowRemove(i)}
                        >
                          <CloseIcon label="" />
                        </button>
                      </Tooltip>
                      <Tooltip content="Edit" position="top">
                        <button
                          type="button"
                          aria-label="Edit"
                          className="ascp-row__action"
                          onClick={() => handleEditRequest(s, i)}
                        >
                          <EditIcon label="" />
                        </button>
                      </Tooltip>
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Hint input + AI-verify footer only when there are usable
                suggestions to iterate on. Error / empty-response state
                hides both — nothing to refine or approve. */}
            {!showErrorSurface && (
              <>
                <div className="ascp-hint">
                  <input
                    type="text"
                    value={hint}
                    onChange={(e) => setHint(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleHintSubmit();
                      }
                    }}
                    placeholder="What should I do next?"
                    disabled={loading}
                    className="ascp-hint__input"
                  />
                  <button
                    type="button"
                    onClick={handleHintSubmit}
                    disabled={!hint.trim() || loading}
                    className="ascp-hint__send"
                    aria-label="Send hint"
                    title="Send hint"
                  >
                    <SendIcon label="" />
                  </button>
                </div>

                <div className="ascp-footer">
                  <span className="ascp-footer__note">
                    <InfoIcon label="" />
                    <span>Uses AI. Verify results.</span>
                  </span>
                  <span className="ascp-footer__feedback">
                    <button
                      type="button"
                      className={`ascp-feedback ${feedback === 'up' ? 'ascp-feedback--on' : ''}`}
                      onClick={() => handleFeedback('up')}
                      aria-label="Helpful"
                      title="Helpful"
                    >
                      <ThumbsUpIcon label="" />
                    </button>
                    <button
                      type="button"
                      className={`ascp-feedback ${feedback === 'down' ? 'ascp-feedback--on' : ''}`}
                      onClick={() => handleFeedback('down')}
                      aria-label="Not helpful"
                      title="Not helpful"
                    >
                      <ThumbsDownIcon label="" />
                    </button>
                  </span>
                  <button
                    type="button"
                    className="ascp-create-all"
                    disabled={suggestions.length === 0 || isCreatingAny || loading}
                    onClick={handleCreateAll}
                  >
                    Create all
                  </button>
                </div>
              </>
            )}
          </>
        )}
      </div>
      {/* Portal menu — rendered to document.body with position:fixed so
          ancestor transforms / container queries don't reflow it. */}
      {openPickerIndex !== null && pickerRect && createPortal(
        <div
          id="ascp-type-picker-menu"
          role="menu"
          style={{
            position: 'fixed',
            top: pickerRect.top,
            left: pickerRect.left,
            zIndex: 10000,
            minWidth: 180,
            padding: '4px 0',
            background: 'var(--ds-surface-overlay)',
            border: '1px solid var(--ds-border)',
            borderRadius: 4,
            boxShadow: 'var(--ds-shadow-overlay)',
          }}
        >
          {pickerOptions.map((opt) => (
            <button
              key={opt}
              type="button"
              role="menuitem"
              className="ascp-type-menu__item"
              onClick={() => handleTypeChange(openPickerIndex, opt)}
            >
              <span className="ascp-type-menu__icon">
                <JiraIssueTypeIcon type={opt} size={16} />
              </span>
              <span className="ascp-type-menu__label">{opt}</span>
            </button>
          ))}
        </div>,
        document.body,
      )}
    </div>
  );
}
