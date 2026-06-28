import React from 'react';
import { WorkItemTypeIcon } from '@/components/icons/WorkItemTypeIcon';
import { RH } from '@/constants/releasehub.design';

interface Props {
  workItemKey: string;
  title: string;
  type: string;
  status: string;
  onClick?: () => void;
}

const STATUS_MINI: Record<string, { bg: string; text: string }> = {
  done: { bg: 'var(--ds-background-success)', text: 'var(--ds-background-success-bold)' },
  in_progress: { bg: 'var(--ds-background-information)', text: 'var(--ds-link-pressed)' },
  todo: { bg: 'var(--ds-surface-sunken, var(--cp-bg-sunken, var(--cp-bg-sunken)))', text: 'var(--ds-text-subtle)' },
};

export function WorkItemTag({ workItemKey, title, type, status, onClick }: Props) {
  const st = STATUS_MINI[status] || STATUS_MINI.todo;

  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1.5 h-6 px-2 rounded border border-[var(--bd-default,var(--cp-border, var(--cp-bg-sunken)))] bg-white hover:bg-[var(--ds-background-success)] hover:border-[var(--ds-background-success)] transition-colors max-w-[280px] group"
      style={{ fontFamily: RH.fontBody }}
    >
      <WorkItemTypeIcon type={type} size={12} />
      <span className="text-[11px] font-bold text-[var(--sem-success)] shrink-0" style={{ fontFamily: RH.fontMono }}>
        {workItemKey}
      </span>
      <span className="text-[11px] text-[var(--ds-text-subtle)] truncate">{title}</span>
      <span className="text-[9px] font-bold uppercase px-1 rounded shrink-0" style={{ background: st.bg, color: st.text }}>
        {status.replace(/_/g, ' ')}
      </span>
    </button>
  );
}
