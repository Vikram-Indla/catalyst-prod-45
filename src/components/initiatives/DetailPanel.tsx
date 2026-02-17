import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Pencil, Paperclip, Copy, Link2, Target, Trash2 } from 'lucide-react';
import type { Initiative, InitiativeStatus } from '@/types/initiative';
import { STATUS_DISPLAY, getPriorityLevel } from '@/types/initiative';
import { StatusBadge } from './StatusBadge';
import { PriorityBadge } from './PriorityBadge';
import { UserAvatar } from './UserAvatar';
import { ProgressBar } from './ProgressBar';
import { RelativeDate } from './RelativeDate';

interface DetailPanelProps {
  initiative: Initiative | null;
  isOpen: boolean;
  onClose: () => void;
  onStatusChange: (id: string, status: InitiativeStatus) => void;
  onScoreSave: (id: string, scores: { strategic_alignment: number; business_impact: number; time_urgency: number; resource_feasibility: number }) => void;
}

const TABS = ['Details', 'Score', 'Budget', 'Risks', 'Milestones', 'Links', 'Audit'] as const;
type Tab = typeof TABS[number];

const ACTION_BUTTONS = [
  { label: 'Edit', icon: Pencil },
  { label: 'Attach', icon: Paperclip },
  { label: 'Clone', icon: Copy },
  { label: 'Link', icon: Link2 },
  { label: 'Score', icon: Target },
];

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <div className="text-[11px] uppercase tracking-wider text-zinc-400 mb-1">{children}</div>;
}

function FieldValue({ children }: { children: React.ReactNode }) {
  return <div className="text-[13px] text-zinc-900 flex items-center gap-1.5">{children}</div>;
}

function RadarChart({ scores }: { scores: [number, number, number, number] }) {
  const size = 140;
  const cx = size / 2;
  const cy = size / 2;
  const r = 52;
  const labels = ['SA', 'BI', 'TU', 'RF'];
  const angles = scores.map((_, i) => (Math.PI / 2) + (2 * Math.PI * i) / 4);

  const axisPoints = angles.map(a => ({ x: cx + r * Math.cos(a), y: cy - r * Math.sin(a) }));
  const dataPoints = scores.map((s, i) => {
    const ratio = (s || 0) / 5;
    return { x: cx + r * ratio * Math.cos(angles[i]), y: cy - r * ratio * Math.sin(angles[i]) };
  });
  const poly = dataPoints.map(p => `${p.x},${p.y}`).join(' ');

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="mx-auto">
      {[0.2, 0.4, 0.6, 0.8, 1].map((s, i) => (
        <polygon key={i} points={angles.map(a => `${cx + r * s * Math.cos(a)},${cy - r * s * Math.sin(a)}`).join(' ')} fill="none" stroke="#e4e4e7" strokeWidth="0.5" />
      ))}
      {axisPoints.map((p, i) => (
        <g key={i}>
          <line x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="#e4e4e7" strokeWidth="0.5" />
          <text x={p.x + (p.x > cx ? 6 : p.x < cx ? -6 : 0)} y={p.y + (p.y > cy ? 12 : p.y < cy ? -4 : 0)} textAnchor="middle" className="fill-zinc-400 text-[9px]">{labels[i]}</text>
        </g>
      ))}
      <polygon points={poly} fill="rgba(37,99,235,0.12)" stroke="#2563eb" strokeWidth="1.5" />
      {dataPoints.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="3" fill="#2563eb" />
      ))}
    </svg>
  );
}

function ScoreSlider({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="mb-5">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[13px] font-medium text-zinc-700">{label}</span>
        <span className="text-sm font-semibold text-zinc-900">{value.toFixed(1)}</span>
      </div>
      <input
        type="range"
        min="1"
        max="5"
        step="0.5"
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-1.5 bg-zinc-200 rounded-full appearance-none cursor-pointer
          [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4
          [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border-2
          [&::-webkit-slider-thumb]:border-blue-600 [&::-webkit-slider-thumb]:shadow-sm [&::-webkit-slider-thumb]:cursor-pointer"
      />
    </div>
  );
}

export function DetailPanel({ initiative, isOpen, onClose, onStatusChange, onScoreSave }: DetailPanelProps) {
  const [activeTab, setActiveTab] = useState<Tab>('Details');
  const [scores, setScores] = useState({ sa: 3.0, bi: 3.0, tu: 3.0, rf: 3.0 });
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (initiative) {
      setScores({
        sa: initiative.score_strategic_alignment ?? 3.0,
        bi: initiative.score_business_impact ?? 3.0,
        tu: initiative.score_time_urgency ?? 3.0,
        rf: initiative.score_resource_feasibility ?? 3.0,
      });
      setActiveTab('Details');
    }
  }, [initiative]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  const computedScore = +((scores.sa + scores.bi + scores.tu + scores.rf) / 4).toFixed(1);
  const priority = getPriorityLevel(computedScore);

  if (!initiative) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/15 z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={onClose}
          />
          {/* Panel */}
          <motion.div
            ref={panelRef}
            className="fixed top-0 right-0 h-screen w-[55%] min-w-[500px] max-w-[720px] bg-white z-50 flex flex-col"
            style={{ boxShadow: '-8px 0 24px rgba(0,0,0,0.12)' }}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
          >
            {/* Header */}
            <div className="p-5 pb-0 border-b border-zinc-200">
              {/* Row 1: ID + Title + Close */}
              <div className="flex items-start gap-3 mb-3">
                <span className="font-mono text-[12px] font-medium text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md whitespace-nowrap flex-shrink-0">
                  {initiative.initiative_key}
                </span>
                <h2 className="text-lg font-semibold text-zinc-900 truncate flex-1 leading-snug pt-0.5">
                  {initiative.title}
                </h2>
                <button
                  type="button"
                  onClick={onClose}
                  className="w-8 h-8 flex items-center justify-center rounded-md text-zinc-400 hover:bg-zinc-100 hover:text-zinc-900 transition-colors flex-shrink-0"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Row 2: Actions */}
              <div className="flex items-center gap-1 mb-3">
                {ACTION_BUTTONS.map(({ label, icon: Icon }) => (
                  <button
                    key={label}
                    type="button"
                    className="h-[30px] px-2.5 flex items-center gap-1 text-xs text-zinc-600 rounded-md hover:bg-zinc-100 transition-colors"
                  >
                    <Icon size={14} />
                    {label}
                  </button>
                ))}
                <button
                  type="button"
                  className="h-[30px] px-2.5 flex items-center gap-1 text-xs text-red-600 rounded-md hover:bg-red-50 transition-colors ml-auto"
                >
                  <Trash2 size={14} />
                  Delete
                </button>
              </div>

              {/* Row 3: Tabs */}
              <div className="flex border-b border-zinc-200 -mb-px">
                {TABS.map(tab => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveTab(tab)}
                    className={`py-2 px-4 text-[13px] border-b-2 transition-colors ${
                      activeTab === tab
                        ? 'text-zinc-900 font-medium border-blue-600'
                        : 'text-zinc-500 hover:text-zinc-700 border-transparent'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-5">
              {activeTab === 'Details' && (
                <DetailsContent initiative={initiative} onStatusChange={onStatusChange} />
              )}
              {activeTab === 'Score' && (
                <ScoreContent
                  initiative={initiative}
                  scores={scores}
                  computedScore={computedScore}
                  priority={priority}
                  onScoreChange={setScores}
                  onSave={() => onScoreSave(initiative.id, {
                    strategic_alignment: scores.sa,
                    business_impact: scores.bi,
                    time_urgency: scores.tu,
                    resource_feasibility: scores.rf,
                  })}
                />
              )}
              {!['Details', 'Score'].includes(activeTab) && (
                <div className="flex items-center justify-center h-48 text-zinc-400 text-sm">
                  {activeTab} — Coming Soon
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function DetailsContent({ initiative, onStatusChange }: { initiative: Initiative; onStatusChange: (id: string, s: InitiativeStatus) => void }) {
  const fields: [string, React.ReactNode][] = [
    ['Status', <StatusBadge status={initiative.status} editable onChange={(s) => onStatusChange(initiative.id, s)} />],
    ['Priority', <PriorityBadge score={initiative.computed_score} />],
    ['Assignee', <UserAvatar name={initiative.assignee_name} size={24} showName />],
    ['Business Owner', <UserAvatar name={initiative.business_owner_name} size={24} showName />],
    ['Department', <span>{initiative.department_name || '—'}</span>],
    ['Target Quarter', <span>{initiative.target_quarter || '—'}</span>],
    ['Target Complete', <RelativeDate date={initiative.target_complete} />],
    ['Progress', <ProgressBar value={initiative.progress} status={initiative.status} />],
  ];

  return (
    <>
      <div className="grid grid-cols-2 gap-x-6 gap-y-4">
        {fields.map(([label, value]) => (
          <div key={label as string}>
            <FieldLabel>{label}</FieldLabel>
            <FieldValue>{value}</FieldValue>
          </div>
        ))}
      </div>

      {initiative.description && (
        <div className="mt-6">
          <h3 className="text-[13px] font-semibold text-zinc-900 mb-2">Description</h3>
          <p className="text-[13px] leading-relaxed text-zinc-700">{initiative.description}</p>
        </div>
      )}

      <div className="mt-6">
        <h3 className="text-[13px] font-semibold text-zinc-900 mb-3">Comments (0)</h3>
        <div className="flex items-start gap-2">
          <UserAvatar name="Current User" size={28} showTooltip={false} />
          <input
            type="text"
            placeholder="Add a comment…"
            className="flex-1 h-9 px-3 text-[13px] bg-zinc-50 border border-zinc-200 rounded-md outline-none placeholder:text-zinc-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
          />
        </div>
      </div>
    </>
  );
}

function ScoreContent({
  initiative,
  scores,
  computedScore,
  priority,
  onScoreChange,
  onSave,
}: {
  initiative: Initiative;
  scores: { sa: number; bi: number; tu: number; rf: number };
  computedScore: number;
  priority: ReturnType<typeof getPriorityLevel>;
  onScoreChange: (s: typeof scores) => void;
  onSave: () => void;
}) {
  return (
    <div className="flex gap-6">
      {/* Left: Sliders */}
      <div className="flex-[3] min-w-0">
        <ScoreSlider label="Strategic Alignment" value={scores.sa} onChange={(v) => onScoreChange({ ...scores, sa: v })} />
        <ScoreSlider label="Business Impact" value={scores.bi} onChange={(v) => onScoreChange({ ...scores, bi: v })} />
        <ScoreSlider label="Time Urgency" value={scores.tu} onChange={(v) => onScoreChange({ ...scores, tu: v })} />
        <ScoreSlider label="Resource Feasibility" value={scores.rf} onChange={(v) => onScoreChange({ ...scores, rf: v })} />
        <button
          type="button"
          onClick={onSave}
          className="w-full h-9 bg-blue-600 text-white text-[13px] font-medium rounded-md hover:bg-blue-700 transition-colors mt-2"
        >
          Save Score
        </button>
      </div>

      {/* Right: Summary */}
      <div className="flex-[2] bg-zinc-50 rounded-lg p-5 flex flex-col items-center gap-3">
        <div className="text-5xl font-bold text-zinc-900">{computedScore.toFixed(1)}</div>
        <PriorityBadge score={computedScore} size="md" />
        <RadarChart scores={[scores.sa, scores.bi, scores.tu, scores.rf]} />
        <p className="text-[12px] text-zinc-600 text-center leading-relaxed mt-1">
          {priority.level === 'High' && 'High-priority initiative with strong strategic value and feasibility.'}
          {priority.level === 'Medium' && 'Moderate priority — consider resource allocation and timing.'}
          {priority.level === 'Low' && 'Lower priority — may benefit from scope refinement.'}
          {priority.level === 'Rejected' && 'Below threshold — review justification before proceeding.'}
          {priority.level === 'Unscored' && 'Not yet scored — complete all dimensions to calculate priority.'}
        </p>
      </div>
    </div>
  );
}
