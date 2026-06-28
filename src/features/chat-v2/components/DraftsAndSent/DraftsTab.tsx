import React from 'react';
import { useAllDrafts, type DraftListItem } from '../../hooks/useAllDrafts';
import { DraftRow } from './DraftRow';
import { SelectAllRow } from './SelectAllRow';
import type { ChatConversation } from '@/types/chat';

interface DraftsTabProps {
  selectMode: boolean;
  selectedIds: Set<string>;
  conversationById: Map<string, ChatConversation>;
  onSelectDraft: (draft: DraftListItem) => void;
  onToggleSelected: (id: string) => void;
  onToggleSelectAll: (allIds: string[], allSelected: boolean) => void;
  onCountChange?: (count: number) => void;
  onNewMessage: () => void;
}

export function DraftsTab({
  selectMode,
  selectedIds,
  conversationById,
  onSelectDraft,
  onToggleSelected,
  onToggleSelectAll,
  onCountChange,
  onNewMessage,
}: DraftsTabProps) {
  const { data: drafts = [], isLoading } = useAllDrafts();

  React.useEffect(() => {
    onCountChange?.(drafts.length);
  }, [drafts.length, onCountChange]);

  const allIds = React.useMemo(() => drafts.map(d => d.conversationId), [drafts]);
  const allSelected = selectedIds.size > 0 && selectedIds.size === allIds.length;

  if (isLoading) {
    return null;
  }

  if (drafts.length === 0) {
    return <DraftsEmptyState onNewMessage={onNewMessage} />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      {selectMode && (
        <SelectAllRow
          totalCount={allIds.length}
          selectedCount={selectedIds.size}
          onToggle={() => onToggleSelectAll(allIds, allSelected)}
        />
      )}
      <ul
        style={{
          listStyle: 'none',
          margin: 0,
          padding: '0 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          overflowY: 'auto',
        }}
      >
        {drafts.map(d => (
          <li key={d.conversationId}>
            <DraftRow
              draft={d}
              conversation={conversationById.get(d.conversationId)}
              onClick={() => onSelectDraft(d)}
              selectMode={selectMode}
              selected={selectedIds.has(d.conversationId)}
              onToggleSelected={() => onToggleSelected(d.conversationId)}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}

function DraftsEmptyState({ onNewMessage }: { onNewMessage: () => void }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1,
        padding: '40px 24px',
        textAlign: 'center',
      }}
    >
      <div
        aria-hidden="true"
        style={{
          width: 72,
          height: 72,
          marginBottom: 16,
          borderRadius: '50%',
          background: 'var(--cv2-bg-row-hover)',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--cv2-accent)',
        }}
      >
        <svg
          width={36}
          height={36}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4z" />
        </svg>
      </div>
      <div
        style={{
          fontFamily: 'var(--cv2-font)',
          fontSize: 'var(--ds-font-size-600)',
          fontWeight: 700,
          color: 'var(--cv2-text)',
          marginBottom: 8,
        }}
      >
        Draft messages to send when you&rsquo;re ready
      </div>
      <div
        style={{
          fontFamily: 'var(--cv2-font)',
          fontSize: 'var(--ds-font-size-400)',
          color: 'var(--cv2-text-subtle)',
          maxWidth: 340,
          lineHeight: 1.5,
          marginBottom: 16,
        }}
      >
        Start typing a message anywhere, then find it here. Re-read, revise, and send whenever you&rsquo;d like.
      </div>
      <button
        type="button"
        onClick={onNewMessage}
        style={{
          padding: '8px 16px',
          borderRadius: 6,
          border: '1px solid var(--cv2-border)',
          background: 'transparent',
          color: 'var(--cv2-text)',
          fontFamily: 'var(--cv2-font)',
          fontSize: 'var(--ds-font-size-400)',
          fontWeight: 500,
          cursor: 'pointer',
        }}
      >
        New Message
      </button>
    </div>
  );
}
