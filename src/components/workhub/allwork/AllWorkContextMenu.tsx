/**
 * AllWorkContextMenu — 12-action context menu for work items
 */
import { useEffect, useRef } from 'react';
import {
  Eye, MessageSquare, Clock, ArrowUpToLine, ArrowDownToLine,
  Plus, Link2, Copy, Move, Tag, Paperclip, Trash2,
} from 'lucide-react';
import type { AllWorkItem } from '@/types/allwork.types';
import { toast } from 'sonner';

interface Props {
  item: AllWorkItem;
  x: number;
  y: number;
  onClose: () => void;
  onOpenItem: (key: string) => void;
}

const ACTIONS = [
  { id: 'view', icon: Eye, label: 'View work item' },
  { id: 'comment', icon: MessageSquare, label: 'Comment' },
  { id: 'log', icon: Clock, label: 'Log work' },
  { id: 'divider1', icon: null, label: '' },
  { id: 'rank-top', icon: ArrowUpToLine, label: 'Rank to top' },
  { id: 'rank-bottom', icon: ArrowDownToLine, label: 'Rank to bottom' },
  { id: 'divider2', icon: null, label: '' },
  { id: 'subtask', icon: Plus, label: 'Create sub-task' },
  { id: 'link', icon: Link2, label: 'Link work item' },
  { id: 'clone', icon: Copy, label: 'Clone' },
  { id: 'move', icon: Move, label: 'Move' },
  { id: 'labels', icon: Tag, label: 'Labels' },
  { id: 'attach', icon: Paperclip, label: 'Attach files' },
  { id: 'divider3', icon: null, label: '' },
  { id: 'delete', icon: Trash2, label: 'Delete', danger: true },
] as const;

export function AllWorkContextMenu({ item, x, y, onClose, onOpenItem }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const escHandler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('mousedown', handler);
    document.addEventListener('keydown', escHandler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('keydown', escHandler);
    };
  }, [onClose]);

  // Position adjustment to stay within viewport
  const adjustedY = Math.min(y, window.innerHeight - 400);
  const adjustedX = Math.min(x, window.innerWidth - 220);

  const handleAction = (actionId: string) => {
    onClose();
    switch (actionId) {
      case 'view':
        onOpenItem(item.issue_key);
        break;
      default:
        toast.info(`${actionId} action for ${item.issue_key} — coming soon`);
    }
  };

  return (
    <div
      ref={ref}
      className="fixed z-[9999] w-52 rounded-lg border bg-[var(--bg-app)] shadow-xl py-1"
      style={{ left: adjustedX, top: adjustedY, borderColor: 'var(--ds-border, #DFE1E6)' }}
    >
      {ACTIONS.map((action) => {
        if (action.id.startsWith('divider')) {
          return <div key={action.id} className="my-1 border-t" style={{ borderColor: 'var(--divider)' }} />;
        }
        const Icon = action.icon!;
        const isDanger = 'danger' in action && action.danger;
        return (
          <button
            key={action.id}
            onClick={() => handleAction(action.id)}
            className="w-full flex items-center gap-2.5 px-3 py-1.5 text-[13px] hover:bg-[var(--ds-background-input-hovered,#f8f8f8)] transition-colors text-left"
            style={{ color: isDanger ? 'var(--sem-danger)' : '#1A1D23' }}
          >
            <Icon className="w-4 h-4 shrink-0" style={{ color: isDanger ? 'var(--sem-danger)' : 'var(--ds-text-subtlest, #6b6e76)' }} />
            {action.label}
          </button>
        );
      })}
    </div>
  );
}
