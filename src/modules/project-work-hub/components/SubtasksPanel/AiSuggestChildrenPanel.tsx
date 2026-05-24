/**
 * AiSuggestChildrenPanel — "Create suggested work items" panel.
 *
 * Mirrors Jira's auto-fetched AI suggestion panel: a collapsible
 * card with a list of suggested child titles, a refinement prompt
 * input at the bottom, and a "Create all" CTA. Auto-fetches on mount
 * via the dedicated `ai-suggest-children` edge function.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { fetchFunction } from '@/integrations/supabase/functionsRouter';
import { catalystToast } from '@/lib/catalystToast';
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';
/* eslint-disable no-restricted-imports */
import ChevronDown from '@atlaskit/icon/glyph/chevron-down';
import ChevronUp from '@atlaskit/icon/glyph/chevron-up';
import RefreshIcon from '@atlaskit/icon/core/refresh';
import SendIcon from '@atlaskit/icon/core/send';
import InfoIcon from '@atlaskit/icon/core/information';
import ThumbsUpIcon from '@atlaskit/icon/core/thumbs-up';
import ThumbsDownIcon from '@atlaskit/icon/core/thumbs-down';
/* eslint-enable no-restricted-imports */
import './ai-suggest-children-panel.css';

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
        fill="var(--ds-text-subtle, #44546F)"
      />
      <path
        d="M19 14l.6 1.7L21.3 16l-1.7.6L19 18l-.6-1.7L16.7 16l1.7-.6L19 14z"
        fill="var(--ds-text-subtle, #44546F)"
      />
      <path
        d="M5 14l.6 1.7L7.3 16l-1.7.6L5 18l-.6-1.7L2.7 16l1.7-.6L5 14z"
        fill="var(--ds-text-subtle, #44546F)"
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
}: AiSuggestChildrenPanelProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [hint, setHint] = useState('');
  const [feedback, setFeedback] = useState<'up' | 'down' | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const fetchSuggestions = useCallback(
    async (userHint?: string) => {
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
          setError(message);
          return;
        }
        const json = (await res.json()) as { suggestions?: Suggestion[] };
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
        setSuggestions(list);
      } catch (e) {
        if (ctrl.signal.aborted) return;
        setError(e instanceof Error ? e.message : 'Suggestion request failed');
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

  // Auto-fetch on mount.
  useEffect(() => {
    void fetchSuggestions();
    return () => abortRef.current?.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const showRing = loading && !error;

  return (
    <div
      className={`ascp-root ${showRing ? 'ascp-streaming' : 'ascp-static'}`}
    >
      <div className="ascp-surface">
        <button
          type="button"
          className="ascp-header"
          onClick={() => setCollapsed((c) => !c)}
          aria-expanded={!collapsed}
        >
          <span className="ascp-header__left">
            <SparkleIcon size={16} />
            <span className="ascp-header__title">Create suggested work items</span>
          </span>
          <span className="ascp-header__right">
            {!loading && !error && (
              <span
                role="button"
                tabIndex={0}
                aria-label="Refresh suggestions"
                className="ascp-refresh"
                onClick={(e) => {
                  e.stopPropagation();
                  void fetchSuggestions();
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    e.stopPropagation();
                    void fetchSuggestions();
                  }
                }}
              >
                <RefreshIcon label="" />
              </span>
            )}
            <span className="ascp-chevron">
              {collapsed ? <ChevronDown label="" /> : <ChevronUp label="" />}
            </span>
          </span>
        </button>

        {!collapsed && (
          <>
            {error && (
              <div className="ascp-error" role="alert">
                <InfoIcon label="" />
                <span>{error}</span>
                <button
                  type="button"
                  className="ascp-error__retry"
                  onClick={() => void fetchSuggestions(hint || undefined)}
                >
                  Try again
                </button>
              </div>
            )}

            {loading && (
              <div className="ascp-list" aria-busy="true">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="ascp-row ascp-row--skeleton">
                    <span className="ascp-skel-dot" />
                    <span className="ascp-skel-line" />
                  </div>
                ))}
              </div>
            )}

            {!loading && !error && suggestions.length === 0 && (
              <div className="ascp-empty">
                No suggestions right now. Try giving a hint below.
              </div>
            )}

            {!loading && !error && suggestions.length > 0 && (
              <div className="ascp-list">
                {suggestions.map((s, i) => (
                  <button
                    key={`${s.title}-${i}`}
                    type="button"
                    className="ascp-row"
                    disabled={isCreatingAny}
                    onClick={() => onCreate(s)}
                    title={`Create: ${s.title}`}
                  >
                    <span className="ascp-row__icon">
                      <JiraIssueTypeIcon type={s.type} size={16} />
                    </span>
                    <span className="ascp-row__title">{s.title}</span>
                  </button>
                ))}
              </div>
            )}

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
      </div>
    </div>
  );
}
