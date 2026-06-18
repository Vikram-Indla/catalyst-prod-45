/**
 * LaterPanel — "Later" left-panel surface (Slack Saved-for-Later parity).
 *
 * Header: title · filter or wipe icon · + add reminder
 * Tabs:   In progress (count) · Archived · Completed
 * Rows:   LaterRow with hover strip + per-tab menu
 *
 * Top filter on the In progress / Archived tabs offers Show/Hide upcoming
 * reminders. On Completed tab the filter icon is replaced by a wipe icon
 * that clears all completed.
 */
import React, { useMemo, useRef, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { FilterIcon, PlusIcon } from '../shared/Icon';
import {
  useLaterItems,
  useSetLaterState,
  useRemoveLater,
  useSnoozeLater,
  useCreateReminder,
  useClearCompletedLater,
  type LaterItem,
  type LaterState,
} from '../../hooks/useLaterItems';
import { LaterRow } from './LaterRow';
import { LaterRowMenu } from './LaterRowMenu';
import { LaterFilterMenu } from './LaterFilterMenu';
import { SnoozeSubmenu } from './SnoozeSubmenu';
import { CreateReminderModal } from './CreateReminderModal';
import { ClearCompletedDialog } from './ClearCompletedDialog';

type Tab = 'in_progress' | 'archived' | 'completed';

interface LaterPanelProps {
  selectedItemId: string | null;
  onSelectItem: (item: LaterItem) => void;
  showRightBorder?: boolean;
}

export function LaterPanel({ selectedItemId, onSelectItem, showRightBorder = true }: LaterPanelProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { items, counts, isLoading } = useLaterItems();
  const setState = useSetLaterState();
  const removeMut = useRemoveLater();
  const snoozeMut = useSnoozeLater();
  const createMut = useCreateReminder();
  const clearCompleted = useClearCompletedLater();

  const [tab, setTab] = useState<Tab>('in_progress');
  const [hideUpcoming, setHideUpcoming] = useState(true);
  const [filterAnchor, setFilterAnchor] = useState<DOMRect | null>(null);
  const [snoozeAnchor, setSnoozeAnchor] = useState<{ item: LaterItem; rect: DOMRect } | null>(null);
  const [moreAnchor, setMoreAnchor] = useState<{ item: LaterItem; rect: DOMRect } | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [clearOpen, setClearOpen] = useState(false);

  const filterBtnRef = useRef<HTMLButtonElement>(null);

  const visible = useMemo(() => {
    const now = Date.now();
    let list = items.filter(i => i.state === tab);
    if (tab === 'in_progress' && hideUpcoming) {
      // Hide reminders whose remind_at is still in the future.
      list = list.filter(i => !(i.kind === 'reminder' && i.remindAt && new Date(i.remindAt).getTime() > now));
    }
    return list;
  }, [items, tab, hideUpcoming]);

  const handleSetState = async (item: LaterItem, state: LaterState) => {
    try {
      await setState.mutateAsync({ id: item.id, state });
    } catch (e) {
      toast({ title: 'Could not update item', description: (e as Error).message, variant: 'destructive' });
    }
  };

  const handleRemove = async (item: LaterItem) => {
    try {
      await removeMut.mutateAsync(item.id);
    } catch (e) {
      toast({ title: 'Could not remove', description: (e as Error).message, variant: 'destructive' });
    }
  };

  const handleSnooze = async (item: LaterItem, remindAt: string | null) => {
    try {
      await snoozeMut.mutateAsync({ id: item.id, remindAt });
    } catch (e) {
      toast({ title: 'Could not snooze', description: (e as Error).message, variant: 'destructive' });
    }
  };

  const handleCreate = async (input: { reminderText: string; remindAtIso: string }) => {
    if (!user) return;
    try {
      await createMut.mutateAsync({ reminderText: input.reminderText, remindAt: input.remindAtIso });
      setCreateOpen(false);
      toast({ title: 'Reminder created' });
    } catch (e) {
      toast({ title: 'Could not create reminder', description: (e as Error).message, variant: 'destructive' });
    }
  };

  const handleClear = async () => {
    try {
      await clearCompleted.mutateAsync();
      setClearOpen(false);
    } catch (e) {
      toast({ title: 'Could not clear', description: (e as Error).message, variant: 'destructive' });
    }
  };

  return (
    <section
      aria-label="Later"
      style={{
        gridArea: 'sidebar',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--cv2-bg-panel)',
        borderRight: showRightBorder ? '1px solid var(--cv2-border)' : 'none',
        minWidth: 0,
        width: '100%',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 16px 6px',
        }}
      >
        <h1
          style={{
            margin: 0,
            fontFamily: 'var(--cv2-font)',
            fontSize: 'var(--cv2-fs-sidebar-header)',
            fontWeight: 700,
            color: 'var(--cv2-text-strong)',
            letterSpacing: '-0.01em',
          }}
        >
          Later
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {tab === 'completed' ? (
            <HeaderIconBtn
              label="Clear completed"
              onClick={() => setClearOpen(true)}
            >
              <BroomIcon size={18} />
            </HeaderIconBtn>
          ) : (
            <HeaderIconBtn
              refEl={filterBtnRef}
              label="Filter"
              active={!!filterAnchor}
              onClick={() => {
                if (filterAnchor) {
                  setFilterAnchor(null);
                } else if (filterBtnRef.current) {
                  setFilterAnchor(filterBtnRef.current.getBoundingClientRect());
                }
              }}
            >
              <FilterIcon size={18} />
            </HeaderIconBtn>
          )}
          <HeaderIconBtn label="Add reminder" onClick={() => setCreateOpen(true)}>
            <PlusIcon size={18} />
          </HeaderIconBtn>
        </div>
      </div>

      {/* Tabs */}
      <div
        role="tablist"
        style={{
          display: 'flex',
          gap: 18,
          padding: '0 16px',
          borderBottom: '1px solid var(--cv2-divider)',
        }}
      >
        <TabBtn label="In progress" count={counts.in_progress} active={tab === 'in_progress'} onClick={() => setTab('in_progress')} />
        <TabBtn label="Archived" active={tab === 'archived'} onClick={() => setTab('archived')} />
        <TabBtn label="Completed" active={tab === 'completed'} onClick={() => setTab('completed')} />
      </div>

      {/* List */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
        {isLoading ? (
          <Empty message="Loading…" />
        ) : visible.length === 0 ? (
          <Empty
            message={
              tab === 'in_progress'
                ? 'Nothing here yet. Save a message or create a reminder.'
                : tab === 'archived'
                  ? 'No archived items.'
                  : 'No completed items.'
            }
          />
        ) : (
          visible.map(item => (
            <LaterRow
              key={item.id}
              item={item}
              tab={tab}
              selected={selectedItemId === item.id}
              onSelect={() => onSelectItem(item)}
              onComplete={() => void handleSetState(item, 'completed')}
              onSnooze={rect => setSnoozeAnchor({ item, rect })}
              onMore={rect => setMoreAnchor({ item, rect })}
            />
          ))
        )}
      </div>

      {filterAnchor && (
        <LaterFilterMenu
          anchorRect={filterAnchor}
          hideUpcoming={hideUpcoming}
          onChange={setHideUpcoming}
          onClose={() => setFilterAnchor(null)}
        />
      )}
      {snoozeAnchor && (
        <SnoozeSubmenu
          anchorRect={snoozeAnchor.rect}
          onPick={iso => {
            void handleSnooze(snoozeAnchor.item, iso);
            setSnoozeAnchor(null);
          }}
          onClose={() => setSnoozeAnchor(null)}
        />
      )}
      {moreAnchor && (
        <LaterRowMenu
          anchorRect={moreAnchor.rect}
          tab={tab}
          onArchive={() => void handleSetState(moreAnchor.item, 'archived')}
          onMoveToInProgress={() => void handleSetState(moreAnchor.item, 'in_progress')}
          onRemove={() => void handleRemove(moreAnchor.item)}
          onClose={() => setMoreAnchor(null)}
        />
      )}
      {createOpen && (
        <CreateReminderModal
          onCancel={() => setCreateOpen(false)}
          onSave={input => void handleCreate(input)}
        />
      )}
      {clearOpen && (
        <ClearCompletedDialog
          count={counts.completed}
          onCancel={() => setClearOpen(false)}
          onConfirm={() => void handleClear()}
        />
      )}
    </section>
  );
}

function HeaderIconBtn({
  refEl, label, active, onClick, children,
}: {
  refEl?: React.RefObject<HTMLButtonElement>;
  label: string;
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      ref={refEl}
      type="button"
      aria-label={label}
      onClick={onClick}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--cv2-bg-row-hover)'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = active ? 'var(--cv2-bg-row-selected)' : 'transparent'; }}
      style={{
        width: 30,
        height: 30,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: active ? 'var(--cv2-bg-row-selected)' : 'transparent',
        color: 'var(--cv2-text-subtle)',
        border: 'none',
        borderRadius: 'var(--cv2-radius-sm)',
        cursor: 'pointer',
      }}
    >
      {children}
    </button>
  );
}

function TabBtn({
  label, count, active, onClick,
}: {
  label: string;
  count?: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '10px 0 12px',
        background: 'transparent',
        color: active ? 'var(--cv2-text-strong)' : 'var(--cv2-text-subtle)',
        border: 'none',
        borderBottom: active ? '2px solid var(--cv2-accent)' : '2px solid transparent',
        cursor: 'pointer',
        fontFamily: 'var(--cv2-font)',
        fontSize: 14,
        fontWeight: active ? 700 : 500,
      }}
    >
      <span>{label}</span>
      {typeof count === 'number' && count > 0 && (
        <span style={{ fontSize: 13, color: active ? 'var(--cv2-text)' : 'var(--cv2-text-muted)' }}>
          {count}
        </span>
      )}
    </button>
  );
}

function Empty({ message }: { message: string }) {
  return (
    <div
      style={{
        padding: '40px 20px',
        textAlign: 'center',
        color: 'var(--cv2-text-muted)',
        fontFamily: 'var(--cv2-font)',
        fontSize: 13,
      }}
    >
      {message}
    </div>
  );
}

function BroomIcon({ size = 18 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M19.36 2.72L14.86 7.2l1.41 1.42 4.5-4.5z" />
      <path d="M5.5 21l-2.5-2.5 9.5-9.5 2.5 2.5z" />
      <path d="M14 13l-4 4M11 10l-4 4M16 16l-1 4M19 17l1 4M14 18l2 3" />
    </svg>
  );
}
