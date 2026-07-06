/**
 * WorkspaceSearchResultsPanel — right-rail panel listing matched messages
 * for the active query. Clicking a row jumps to that message in the chat
 * panel (parent owns the jump logic).
 */
import React from 'react';
import { PresenceAvatar } from '../shared/PresenceAvatar';
import { XIcon } from '../shared/Icon';
import { formatActivityTime } from '../../lib/formatTimestamp';
import { useWorkspaceSearch, type WorkspaceSearchHit } from '../../hooks/useWorkspaceSearch';

interface WorkspaceSearchResultsPanelProps {
  query: string;
  onSelectHit: (hit: WorkspaceSearchHit) => void;
  onClose: () => void;
}

export function WorkspaceSearchResultsPanel({
  query,
  onSelectHit,
  onClose,
}: WorkspaceSearchResultsPanelProps) {
  const { hits, isLoading } = useWorkspaceSearch(query);
  return (
    <section
      aria-label={`Search results for ${query}`}
      style={{
        gridArea: 'thread',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--cv2-bg-panel)',
        borderLeft: '1px solid var(--cv2-border-strong)',
        minWidth: 0,
        overflow: 'hidden',
      }}
    >
      <header
        style={{
          height: 'var(--cv2-header-h, 56px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          padding: '0 16px',
          borderBottom: '1px solid var(--cv2-border)',
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontFamily: 'var(--cv2-font)',
              font: 'var(--ds-font-body-large)',
              fontWeight: 700,
              color: 'var(--cv2-text-strong)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            Search “{query}”
          </div>
          <div
            style={{
              fontFamily: 'var(--cv2-font)',
              font: 'var(--ds-font-body-small)',
              color: 'var(--cv2-text-muted)',
            }}
          >
            {isLoading ? 'Searching…' : `${hits.length} result${hits.length === 1 ? '' : 's'}`}
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close search results"
          style={{
            width: 32,
            height: 32,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'transparent',
            color: 'var(--cv2-text-subtle)',
            border: 'none',
            borderRadius: 'var(--cv2-radius-sm)',
            cursor: 'pointer',
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.background = 'var(--cv2-bg-row-hover)';
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.background = 'transparent';
          }}
        >
          <XIcon size={16} />
        </button>
      </header>
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '8px 0 16px' }}>
        {isLoading ? (
          <Empty message="Searching…" />
        ) : hits.length === 0 ? (
          <Empty message={`No messages match “${query}”.`} />
        ) : (
          <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
            {hits.map(hit => (
              <li key={hit.id}>
                <button
                  type="button"
                  onClick={() => onSelectHit(hit)}
                  style={{
                    display: 'flex',
                    gap: 8,
                    width: '100%',
                    padding: '8px 16px',
                    background: 'transparent',
                    border: 'none',
                    borderBottom: '1px solid var(--cv2-divider)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    color: 'inherit',
                    fontFamily: 'var(--cv2-font)',
                    font: 'var(--ds-font-body)',
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.background = 'var(--cv2-bg-row-hover)';
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.background = 'transparent';
                  }}
                >
                  <PresenceAvatar
                    name={hit.authorName}
                    avatarUrl={hit.authorAvatarUrl}
                    size={22}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        display: 'flex',
                        gap: 8,
                        alignItems: 'baseline',
                        minWidth: 0,
                      }}
                    >
                      <span
                        style={{
                          font: 'var(--ds-font-body-small)',
                          fontWeight: 700,
                          color: 'var(--cv2-text-strong)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {hit.authorName}
                      </span>
                      <span
                        style={{
                          font: 'var(--ds-font-body-small)',
                          color: 'var(--cv2-text-muted)',
                          whiteSpace: 'nowrap',
                          flex: '0 0 auto',
                        }}
                      >
                        {formatActivityTime(hit.createdAt)}
                      </span>
                    </div>
                    <div
                      style={{
                        font: 'var(--ds-font-body-small)',
                        color: 'var(--cv2-text-muted)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      in <span dir="auto">{hit.conversationTitle}</span>
                    </div>
                    <Snippet body={hit.body} query={query} />
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function Snippet({ body, query }: { body: string; query: string }) {
  const idx = body.toLowerCase().indexOf(query.toLowerCase());
  if (idx < 0) {
    return (
      <p
        dir="auto"
        style={{
          margin: '4px 0 0',
          font: 'var(--ds-font-body-small)',
          color: 'var(--cv2-text)',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}
      >
        {body}
      </p>
    );
  }
  const start = Math.max(0, idx - 24);
  const before = (start > 0 ? '… ' : '') + body.slice(start, idx);
  const hit = body.slice(idx, idx + query.length);
  const after = body.slice(idx + query.length, idx + query.length + 80);
  return (
    <p
      dir="auto"
      style={{
        margin: '4px 0 0',
        font: 'var(--ds-font-body-small)',
        color: 'var(--cv2-text)',
        display: '-webkit-box',
        WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical',
        overflow: 'hidden',
      }}
    >
      {before}
      <mark
        style={{
          background: 'var(--ds-background-warning)',
          color: 'inherit',
          padding: 0,
          borderRadius: 2,
        }}
      >
        {hit}
      </mark>
      {after}
    </p>
  );
}

function Empty({ message }: { message: string }) {
  return (
    <div
      style={{
        padding: '40px 20px',
        textAlign: 'center',
        fontFamily: 'var(--cv2-font)',
        font: 'var(--ds-font-body-small)',
        color: 'var(--cv2-text-muted)',
      }}
    >
      {message}
    </div>
  );
}
