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
  done: { bg: 'var(--ds-background-success, #DCFCE7)', text: 'var(--ds-background-success-bold, #1F845A)' },
  in_progress: { bg: 'var(--ds-background-information, #E9F2FF)', text: 'var(--ds-link-pressed, #1e40af)' },
  todo: { bg: 'var(--ds-surface-sunken, var(--cp-bg-sunken, var(--cp-bg-sunken, #F1F5F9)))', text: 'var(--ds-text-subtle, #475569)' },
};

export function WorkItemTag({ workItemKey, title, type, status, onClick }: Props) {
  const st = STATUS_MINI[status] || STATUS_MINI.todo;

  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1.5 h-6 px-2 rounded border border-[var(--bd-default,var(--cp-border, var(--cp-bg-sunken, #E2E8F0)))] bg-white hover:bg-[var(--ds-background-success, #DFFCF0)] hover:border-[var(--ds-background-success, #DFFCF0)] transition-colors max-w-[280px] group"
      style={{ fontFamily: RH.fontBody }}
    >
      <WorkItemTypeIcon type={type} size={12} />
      <span className="text-[11px] font-bold text-[var(--sem-success)] shrink-0" style={{ fontFamily: RH.fontMono }}>
        {workItemKey}
      </span>
      <span className="text-[11px] text-[var(--ds-text-subtle,#475569)] truncate">{title}</span>
      <span className="text-[9px] font-bold uppercase px-1 rounded shrink-0" style={{ background: st.bg, color: st.text }}>
        {status.replace(/_/g, ' ')}
      </span>
    </button>
  );
}
