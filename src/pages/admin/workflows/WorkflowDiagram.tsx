/**
 * WorkflowDiagram — Read-only visual flowchart of statuses + transitions.
 * Renders a horizontal layout with status nodes and directional arrows.
 */
import React from 'react';
import type { WorkflowStatus, WorkflowTransition } from '@/hooks/useCatalystWorkflow';
import { cn } from '@/lib/utils';
import { ArrowRight, Zap } from 'lucide-react';

interface Props {
  statuses: WorkflowStatus[];
  transitions: WorkflowTransition[];
  schemeName: string;
}

const CATEGORY_STYLE: Record<string, { bg: string; border: string; text: string }> = {
  todo:        { bg: 'var(--ds-border, #DFE1E6)', border: '#A5ADBA', text: 'var(--ds-text, #253858)' },
  in_progress: { bg: '#DEEBFF', border: '#4C9AFF', text: '#0747A6' },
  done:        { bg: '#E3FCEF', border: '#57D9A3', text: '#006644' },
};

export function WorkflowDiagram({ statuses, transitions, schemeName }: Props) {
  const groups = {
    todo: statuses.filter(s => s.category === 'todo'),
    in_progress: statuses.filter(s => s.category === 'in_progress'),
    done: statuses.filter(s => s.category === 'done'),
  };

  // Find global transitions
  const globalTransitions = transitions.filter(t => t.is_global);
  const directTransitions = transitions.filter(t => !t.is_global && t.from_status_id);

  return (
    <div className="p-6 space-y-6">
      {/* Scheme name */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-sm font-semibold text-[var(--ds-text, #EDEDED)] font-['Sora']">{schemeName}</span>
        <span className="text-[11px] text-[var(--ds-text-subtlest, #878787)]">
          {statuses.length} statuses · {transitions.length} transitions
        </span>
      </div>

      {/* Category lanes */}
      <div className="flex gap-4">
        {(['todo', 'in_progress', 'done'] as const).map(cat => {
          const label = cat === 'todo' ? 'TO DO' : cat === 'in_progress' ? 'IN PROGRESS' : 'DONE';
          const style = CATEGORY_STYLE[cat];
          const items = groups[cat];
          return (
            <div
              key={cat}
              className="flex-1 rounded-lg border p-4 min-h-[200px]"
              style={{ borderColor: style.border + '40', backgroundColor: style.bg + '0A' }}
            >
              <div className="mb-3 flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: style.bg }}
                />
                <span
                  className="text-[10px] font-bold uppercase tracking-wider"
                  style={{ color: style.text }}
                >
                  {label}
                </span>
                <span className="text-[10px] text-[var(--ds-text-subtlest, #878787)]">({items.length})</span>
              </div>
              <div className="space-y-2">
                {items.map(s => (
                  <StatusNode key={s.id} status={s} style={style} />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Transition list */}
      <div className="space-y-2">
        <h4 className="text-xs font-semibold text-[var(--ds-text-subtlest, #A1A1A1)] uppercase tracking-wider mb-3">
          Transitions ({transitions.length})
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
          {globalTransitions.map(t => {
            const toStatus = statuses.find(s => s.id === t.to_status_id);
            return (
              <div
                key={t.id}
                className="flex items-center gap-2 px-3 py-2 rounded border border-[var(--ds-border, #2E2E2E)] bg-[var(--ds-surface-raised, #1A1A1A)]"
              >
                <Zap size={12} className="text-amber-400 shrink-0" />
                <span className="text-xs text-amber-400 font-medium">Any</span>
                <ArrowRight size={12} className="text-[var(--ds-border-bold, #454545)] shrink-0" />
                <span className="text-xs text-[var(--ds-text, #EDEDED)]">{toStatus?.name || '?'}</span>
              </div>
            );
          })}
          {directTransitions.map(t => {
            const fromStatus = statuses.find(s => s.id === t.from_status_id);
            const toStatus = statuses.find(s => s.id === t.to_status_id);
            return (
              <div
                key={t.id}
                className="flex items-center gap-2 px-3 py-2 rounded border border-[var(--ds-border, #2E2E2E)] bg-[var(--ds-surface-raised, #1A1A1A)]"
              >
                <StatusDot category={fromStatus?.category || 'todo'} />
                <span className="text-xs text-[var(--ds-text, #EDEDED)] truncate">{fromStatus?.name || '?'}</span>
                <ArrowRight size={12} className="text-[var(--ds-border-bold, #454545)] shrink-0" />
                <StatusDot category={toStatus?.category || 'todo'} />
                <span className="text-xs text-[var(--ds-text, #EDEDED)] truncate">{toStatus?.name || '?'}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function StatusNode({ status, style }: { status: WorkflowStatus; style: typeof CATEGORY_STYLE.todo }) {
  return (
    <div
      className="px-3 py-2 rounded border flex items-center gap-2"
      style={{
        backgroundColor: style.bg + '20',
        borderColor: style.border + '50',
      }}
    >
      {status.is_initial && (
        <span className="text-[9px] font-bold text-[var(--ds-text, #EDEDED)] bg-[var(--ds-border, #292929)] px-1 py-0.5 rounded">
          START
        </span>
      )}
      <span className="text-xs font-medium" style={{ color: style.text }}>
        {status.name}
      </span>
      {status.is_final && (
        <span className="text-[9px] font-bold text-[var(--ds-text, #EDEDED)] bg-[var(--ds-border, #292929)] px-1 py-0.5 rounded ml-auto">
          END
        </span>
      )}
    </div>
  );
}

function StatusDot({ category }: { category: string }) {
  const bg = CATEGORY_STYLE[category]?.bg || 'var(--ds-border, #DFE1E6)';
  return <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: bg }} />;
}
