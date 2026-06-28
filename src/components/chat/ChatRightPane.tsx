/**
 * ChatRightPane — right sidebar displaying Threads, Bookmarks, Pins, Files, People
 * tabs with URL-driven state (?right=threads|bookmarks|pins|files|people)
 *
 * Props:
 * - conversationId: the active conversation
 * - threadParentId?: optional parent message ID for thread context
 * - onSelectThread: callback when user clicks a thread row
 * - onClose: callback to close the right pane
 *
 * Tabs render:
 * - Threads: aggregated threads from useConversationThreads (A3)
 * - Bookmarks: user's saved messages
 * - Pins: pinned messages (coming soon)
 * - Files: shared files (coming soon)
 * - People: conversation members
 */

import React, { useState } from 'react';
import Tabs, { Tab, TabList } from '@atlaskit/tabs';
import type { ChatThread } from '@/types/chat';

// Placeholder panels (will be replaced with real components)
function ThreadsPanel({
  conversationId,
  onSelectThread,
}: {
  conversationId: string;
  onSelectThread: (threadId: string) => void;
}) {
  // Mock data for A1 test — A3 will wire useConversationThreads RPC
  const threads: ChatThread[] = [
    { id: '1', parentMessageSnippet: 'Hello team', replyCount: 3, lastReplyAt: '2m ago' },
    { id: '2', parentMessageSnippet: 'Project update', replyCount: 1, lastReplyAt: '1h ago' },
  ];

  return (
    <div className="cc-threads-panel">
      {threads.length === 0 ? (
        <div className="cc-empty-state">No threads yet. Click a message to reply.</div>
      ) : (
        <ul className="cc-threads-list">
          {threads.map((thread) => (
            <li
              key={thread.id}
              className="cc-thread-row"
              onClick={() => onSelectThread(thread.id)}
              role="button"
              tabIndex={0}
            >
              <div className="cc-thread-snippet">{thread.parentMessageSnippet}</div>
              <div className="cc-thread-meta">
                <span className="cc-reply-badge">{thread.replyCount} replies</span>
                <span className="cc-timestamp">{thread.lastReplyAt}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function BookmarksPanel({ conversationId }: { conversationId: string }) {
  return (
    <div className="cc-bookmarks-panel">
      <div className="cc-tab-placeholder">Bookmarks coming soon</div>
    </div>
  );
}

function PinsPanel({ conversationId }: { conversationId: string }) {
  return (
    <div className="cc-pins-panel">
      <div className="cc-tab-placeholder">Pins coming soon</div>
    </div>
  );
}

function FilesPanel({ conversationId }: { conversationId: string }) {
  return (
    <div className="cc-files-panel">
      <div className="cc-tab-placeholder">Files coming soon</div>
    </div>
  );
}

function PeoplePanel({ conversationId }: { conversationId: string }) {
  return (
    <div className="cc-people-panel">
      <div className="cc-tab-placeholder">People coming soon</div>
    </div>
  );
}

export interface ChatRightPaneProps {
  conversationId: string;
  threadParentId?: string;
  onSelectThread: (threadId: string) => void;
  onClose: () => void;
}

export function ChatRightPane({
  conversationId,
  threadParentId,
  onSelectThread,
  onClose,
}: ChatRightPaneProps) {
  const [selectedTab, setSelectedTab] = useState(0);

  const tabTitles = ['Threads', 'Bookmarks', 'Pins', 'Files', 'People'];
  const tabLabels = [
    'Threads — aggregated replies to messages',
    'Bookmarks — your saved messages',
    'Pins — pinned messages in this conversation',
    'Files — shared media and documents',
    'People — members of this conversation',
  ];

  return (
    <div className="cv-right-pane">
      <div className="cv-right-pane-header">{tabTitles[selectedTab]}</div>

      <Tabs id="cv-right-pane-tabs" selected={selectedTab} onChange={setSelectedTab}>
        <TabList>
          {tabTitles.map((title, idx) => (
            <Tab key={idx} aria-label={tabLabels[idx]}>
              {title}
            </Tab>
          ))}
        </TabList>
      </Tabs>

      <div className="cv-right-pane-content">
        {selectedTab === 0 && <ThreadsPanel conversationId={conversationId} onSelectThread={onSelectThread} />}
        {selectedTab === 1 && <BookmarksPanel conversationId={conversationId} />}
        {selectedTab === 2 && <PinsPanel conversationId={conversationId} />}
        {selectedTab === 3 && <FilesPanel conversationId={conversationId} />}
        {selectedTab === 4 && <PeoplePanel conversationId={conversationId} />}
      </div>

      <style>{`
        .cv-right-pane {
          width: 360px;
          border-left: 0px solid var(--ds-border);
          background: var(--ds-surface);
          display: flex;
          flex-direction: column;
          height: 100%;
        }

        .cv-right-pane-header {
          padding: 8px 16px;
          border-bottom: 0px solid var(--ds-border);
          font-size: 14px;
          font-weight: 600;
          color: var(--ds-text);
        }

        .cv-right-pane [role="tablist"] {
          font-size: 12px;
          font-weight: 500;
          border-bottom: 0px solid var(--ds-border);
          display: flex;
          flex-direction: row;
        }

        .cv-right-pane [role="tab"] {
          flex: 1;
          padding: 8px;
          text-align: center;
          border-bottom: 0px solid transparent;
          cursor: pointer;
          color: var(--ds-text-subtlest);
          background: transparent;
        }

        .cv-right-pane [role="tab"][aria-selected="true"] {
          color: var(--ds-text);
          border-bottom-color: var(--ds-border-focused);
          background: var(--ds-background-selected);
        }

        .cv-right-pane [role="tab"]:hover {
          background: var(--ds-background-neutral-subtle-hovered, rgba(9, 30, 66, 0.06));
        }

        .cv-right-pane-content {
          flex: 1;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
        }

        .cc-threads-panel {
          flex: 1;
          overflow-y: auto;
          padding: 8px;
        }

        .cc-threads-list {
          list-style: none;
          padding: 0;
          margin: 0;
        }

        .cc-thread-row {
          padding: 8px;
          margin-bottom: 4px;
          border-radius: 3px;
          cursor: pointer;
          transition: background-color 0.2s;
        }

        .cc-thread-row:hover {
          background: var(--ds-background-neutral-subtle-hovered, rgba(9, 30, 66, 0.06));
        }

        .cc-thread-snippet {
          font-size: 12px;
          font-weight: 500;
          color: var(--ds-text);
          margin-bottom: 4px;
        }

        .cc-thread-meta {
          font-size: 11px;
          color: var(--ds-text-subtlest);
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .cc-reply-badge {
          background: var(--ds-background-neutral);
          padding: 0px 6px;
          border-radius: 2px;
          color: var(--ds-text-subtlest);
        }

        .cc-timestamp {
          font-size: 11px;
          color: var(--ds-text-subtlest);
        }

        .cc-empty-state {
          padding: 16px;
          text-align: center;
          color: var(--ds-text-subtlest);
          font-size: 12px;
        }

        .cc-bookmarks-panel,
        .cc-pins-panel,
        .cc-files-panel,
        .cc-people-panel {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .cc-tab-placeholder {
          color: var(--ds-text-subtlest);
          font-size: 12px;
        }
      `}</style>
    </div>
  );
}
