/**
 * CommentsSummaryCard — inline panel rendered above the comments list
 * in `CatalystActivitySection`. Subscribes to `useCatySummarize` and
 * mounts when an active payload matches the current issue.
 *
 * States (driven by store.status):
 *   - 'fetching'   gradient border + bouncing dots + "Generating summary"
 *   - 'streaming'  gradient border + streaming text + blinking caret
 *   - 'done'       neutral border + final text + footer (auto-toggle + feedback)
 *   - 'error'      neutral border + error pill + retry-by-closing
 *
 * Visual reference: screenshots 2026-05-21 (Jira "Comments summary").
 */
import React, { useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import { toast } from 'sonner';
import SparklesIcon from '@atlaskit/icon/core/atlassian-intelligence';
import LockIcon from '@atlaskit/icon/core/lock-locked';
import CloseIcon from '@atlaskit/icon/core/close';
import ThumbsUpIcon from '@atlaskit/icon/core/thumbs-up';
import ThumbsDownIcon from '@atlaskit/icon/core/thumbs-down';
import CopyIcon from '@atlaskit/icon/core/copy';
import type { SummarizeStatus } from './catySummarizeStore';
import './comments-summary-card.css';

export interface CommentsSummaryCardProps {
  status: SummarizeStatus;
  text: string;
  errorMessage: string | null;
  /** Issue key — passed through to feedback handler for audit context. */
  issueKey: string;
  onDismiss: () => void;
  autoEnabled: boolean;
  onToggleAuto: (next: boolean) => void;
  /** Feedback recorder. Wired by parent (Step 4/5). */
  onFeedback?: (vote: 'up' | 'down') => void;
  /** Currently selected feedback vote, if any. */
  selectedVote?: 'up' | 'down' | null;
}

export function CommentsSummaryCard({
  status,
  text,
  errorMessage,
  issueKey,
  onDismiss,
  autoEnabled,
  onToggleAuto,
  onFeedback,
  selectedVote,
}: CommentsSummaryCardProps) {
  const isStreaming = status === 'fetching' || status === 'streaming';
  const isDone = status === 'done';
  const isError = status === 'error';
  const isEmptyStreaming = status === 'fetching' || (status === 'streaming' && text.length === 0);
  // Footer shows once there's content to act on — during streaming AND
  // after done. Matches the spec screenshot where toggle + thumbs +
  // copy are visible while the summary is still being written.
  const showFooter = (status === 'streaming' && text.length > 0) || isDone;

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Summary copied');
    } catch {
      toast.error('Could not copy');
    }
  }, [text]);

  const handleVote = useCallback(
    (vote: 'up' | 'down') => {
      onFeedback?.(vote);
    },
    [onFeedback],
  );

  return (
    <div
      className={`csc-root ${isStreaming ? 'csc-streaming' : 'csc-static'}`}
      data-testid="catalyst-comments-summary-card"
      data-issue-key={issueKey}
      data-status={status}
    >
      <div className="csc-surface">
        <header className="csc-header">
          <SparklesIcon size="small" label="" primaryColor="var(--ds-icon, #44546F)" />
          <span className="csc-header__title">Comments summary</span>
          <span className="csc-header__lock">
            <LockIcon size="small" label="" primaryColor="var(--ds-icon-subtle, #6b6e76)" />
            Only visible to you
          </span>
          <button
            type="button"
            className="csc-header__close"
            onClick={onDismiss}
            aria-label="Dismiss summary"
            data-testid="csc-dismiss"
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
              <ReactMarkdown
                // Disable HTML — content comes from an LLM that we ask for
                // Markdown only; rendering arbitrary HTML would be unsafe.
                skipHtml
              >
                {text}
              </ReactMarkdown>
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
                data-testid="csc-auto-toggle"
              >
                <span className={`csc-auto__switch${autoEnabled ? ' is-on' : ''}`}>
                  <span className="csc-auto__switch__icon csc-auto__switch__icon--check" aria-hidden>
                    <svg viewBox="0 0 10 10" width="10" height="10">
                      <path
                        d="M2 5.2 L4.2 7.4 L8 3.2"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>
                  <span className="csc-auto__switch__icon csc-auto__switch__icon--cross" aria-hidden>
                    <svg viewBox="0 0 10 10" width="10" height="10">
                      <path
                        d="M2.5 2.5 L7.5 7.5 M7.5 2.5 L2.5 7.5"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                      />
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
                  data-testid="csc-thumbs-up"
                >
                  <ThumbsUpIcon
                    size="small"
                    label=""
                    primaryColor={
                      selectedVote === 'up'
                        ? 'var(--ds-text-information, #0c66e4)'
                        : 'var(--ds-icon-subtle, #6b6e76)'
                    }
                  />
                </button>
                <button
                  type="button"
                  className={`csc-action${selectedVote === 'down' ? ' is-selected' : ''}`}
                  onClick={() => handleVote('down')}
                  aria-label="Not helpful"
                  aria-pressed={selectedVote === 'down'}
                  data-testid="csc-thumbs-down"
                >
                  <ThumbsDownIcon
                    size="small"
                    label=""
                    primaryColor={
                      selectedVote === 'down'
                        ? 'var(--ds-text-information, #0c66e4)'
                        : 'var(--ds-icon-subtle, #6b6e76)'
                    }
                  />
                </button>
                <button
                  type="button"
                  className="csc-action"
                  onClick={handleCopy}
                  aria-label="Copy summary"
                  data-testid="csc-copy"
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
