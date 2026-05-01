import React from 'react';
import { WorkItemTypeIcon } from './WorkItemTypeIcon';
import { RH } from '@/constants/releasehub.design';

interface Props {
  workItemKey: string;
  title: string;
  type: string;
  status: string;
  onClick?: () => void;
}

const STATUS_MINI: Record<string, { bg: string; text: string }> = {
  done: { bg: 'var(--ds-background-success, #DCFCE7)', text: '#15803D' },
  in_progress: { bg: '#DBEAFE', text: '#1E40AF' },
  todo: { bg: 'var(--ds-surface-sunken, #F1F5F9)', text: 'var(--ds-text-subtle, #475569)' },
};

export function WorkItemTag({ workItemKey, title, type, status, onClick }: Props) {
  const st = STATUS_MINI[status] || STATUS_MINI.todo;

  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1.5 h-6 px-2 rounded border border-[var(--bd-default, #E2E8F0)] bg-white hover:bg-[#F0FDFA] hover:border-[#99F6E4] transition-colors max-w-[280px] group"
      style={{ fontFamily: RH.fontBody }}
    >
      <WorkItemTypeIcon type={type} size={12} />
      <span className="text-[11px] font-bold text-[var(--sem-success)] shrink-0" style={{ fontFamily: RH.fontMono }}>
        {workItemKey}
      </span>
      <span className="text-[11px] text-[var(--ds-text-subtle, #475569)] truncate">{title}</span>
      <span className="text-[9px] font-bold uppercase px-1 rounded shrink-0" style={{ background: st.bg, color: st.text }}>
        {status.replace(/_/g, ' ')}
      </span>
    </button>
  );
}
