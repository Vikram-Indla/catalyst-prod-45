/**
 * ReleaseSummaryCard — inline panel rendered above the work-items
 * section on the release detail page. Mirrors `CommentsSummaryCard`
 * (same CSS class set → identical gradient border + animations +
 * typewriter caret + footer toggle/feedback). Only the title differs.
 */
import React, { useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import { catalystToast } from '@/lib/catalystToast';
import SparklesIcon from '@atlaskit/icon/core/atlassian-intelligence';
import LockIcon from '@atlaskit/icon/core/lock-locked';
import CloseIcon from '@atlaskit/icon/core/close';
import ThumbsUpIcon from '@atlaskit/icon/core/thumbs-up';
import ThumbsDownIcon from '@atlaskit/icon/core/thumbs-down';
import CopyIcon from '@atlaskit/icon/core/copy';
import type { ReleaseSummarizeStatus } from './catyReleaseSummarizeStore';
// Reuse the canonical comments-summary-card.css so the gradient border,
// bouncing dots, caret, and footer toggle render identically.
import '@/components/catalyst-detail-views/improve/comments-summary-card.css';

export interface ReleaseSummaryCardProps {
  status: ReleaseSummarizeStatus;
  text: string;
  errorMessage: string | null;
  releaseId: string;
  onDismiss: () => void;
  autoEnabled: boolean;
  onToggleAuto: (next: boolean) => void;
  onFeedback?: (vote: 'up' | 'down') => void;
  selectedVote?: 'up' | 'down' | null;
}

export function ReleaseSummaryCard({
  status,
  text,
  errorMessage,
  releaseId,
  onDismiss,
  autoEnabled,
  onToggleAuto,
  onFeedback,
  selectedVote,
}: ReleaseSummaryCardProps) {
  const isStreaming = status === 'fetching' || status === 'streaming';
  const isDone = status === 'done';
  const isError = status === 'error';
  const isEmptyStreaming = status === 'fetching' || (status === 'streaming' && text.length === 0);
  const showFooter = (status === 'streaming' && text.length > 0) || isDone;

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      catalystToast.success('Summary copied');
    } catch {
      catalystToast.error('Could not copy');
    }
  }, [text]);

  const handleVote = useCallback(
    (vote: 'up' | 'down') => onFeedback?.(vote),
    [onFeedback],
  );

  return (
    <div
      className={`csc-root ${isStreaming ? 'csc-streaming' : 'csc-static'}`}
      data-testid="catalyst-release-summary-card"
      data-release-id={releaseId}
      data-status={status}
    >
      <div className="csc-surface">
        <header className="csc-header">
          <SparklesIcon size="small" label="" primaryColor="var(--ds-icon, #44546F)" />
          <span className="csc-header__title">Release summary</span>
          <span className="csc-header__lock">
            <LockIcon size="small" label="" primaryColor="var(--ds-icon-subtle, #6b6e76)" />
            Only visible to you
          </span>
          <button
            type="button"
            className="csc-header__close"
            onClick={onDismiss}
            aria-label="Dismiss summary"
            data-testid="rsc-dismiss"
          >
            <CloseIcon size="small" label="" primaryColor="var(--ds-icon-subtle, #6b6e76)" />
          </button>
        </header>

        <div className="csc-divider" />

        <div className="csc-body">
          {isError ? (
            <div className="csc-error">
              {errorMessage || 'AI features temporarily unavailable. Try again.'}
            </div>
          ) : isEmptyStreaming ? (
            <div className="csc-generating">
              <span className="csc-bouncing-dots" aria-hidden>
                <span />
                <span />
                <span />
              </span>
              Generating summary
            </div>
          ) : (
            <>
              <ReactMarkdown skipHtml>{text}</ReactMarkdown>
              {status === 'streaming' && <span className="csc-caret" aria-hidden />}
            </>
          )}
        </div>

        {showFooter && (
          <>
            <div className="csc-divider" />
            <footer className="csc-footer">
              <button
                type="button"
                className="csc-auto"
                onClick={() => onToggleAuto(!autoEnabled)}
                aria-pressed={autoEnabled}
                data-testid="rsc-auto-toggle"
              >
                <span className={`csc-auto__switch${autoEnabled ? ' is-on' : ''}`}>
                  <span className="csc-auto__switch__icon csc-auto__switch__icon--check" aria-hidden>
                    <svg viewBox="0 0 10 10" width="10" height="10">
                      <path d="M2 5.2 L4.2 7.4 L8 3.2" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                  <span className="csc-auto__switch__icon csc-auto__switch__icon--cross" aria-hidden>
                    <svg viewBox="0 0 10 10" width="10" height="10">
                      <path d="M2.5 2.5 L7.5 7.5 M7.5 2.5 L2.5 7.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                    </svg>
                  </span>
                  <span className="csc-auto__switch__knob" />
                </span>
                Make summaries automatic
              </button>
              <div className="csc-actions">
                <button
                  type="button"
                  className={`csc-action${selectedVote === 'up' ? ' is-selected' : ''}`}
                  onClick={() => handleVote('up')}
                  aria-label="Helpful"
                  aria-pressed={selectedVote === 'up'}
                  data-testid="rsc-thumbs-up"
                >
                  <ThumbsUpIcon
                    size="small"
                    label=""
                    primaryColor={selectedVote === 'up' ? 'var(--ds-text-information, #0c66e4)' : 'var(--ds-icon-subtle, #6b6e76)'}
                  />
                </button>
                <button
                  type="button"
                  className={`csc-action${selectedVote === 'down' ? ' is-selected' : ''}`}
                  onClick={() => handleVote('down')}
                  aria-label="Not helpful"
                  aria-pressed={selectedVote === 'down'}
                  data-testid="rsc-thumbs-down"
                >
                  <ThumbsDownIcon
                    size="small"
                    label=""
                    primaryColor={selectedVote === 'down' ? 'var(--ds-text-information, #0c66e4)' : 'var(--ds-icon-subtle, #6b6e76)'}
                  />
                </button>
                <button
                  type="button"
                  className="csc-action"
                  onClick={handleCopy}
                  aria-label="Copy summary"
                  data-testid="rsc-copy"
                >
                  <CopyIcon size="small" label="" primaryColor="var(--ds-icon-subtle, #6b6e76)" />
                </button>
              </div>
            </footer>
          </>
        )}
      </div>
    </div>
  );
}
