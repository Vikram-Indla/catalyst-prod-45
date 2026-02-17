import { format } from 'date-fns';
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
  return <div className="text-[11px] uppercase tracking-wider text-zinc-400/80 mb-1.5 font-medium">{children}</div>;
}

function FieldValue({ children }: { children: React.ReactNode }) {
  return <div className="text-[14px] text-zinc-900 flex items-center gap-2">{children}</div>;
}

function RadarChart({ scores }: { scores: [number, number, number, number] }) {
  const size = 160;
  const cx = size / 2;
  const cy = size / 2;
  const r = 56;
  const labels = ['Strategic', 'Impact', 'Urgency', 'Feasibility'];
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
          <text x={p.x + (p.x > cx ? 8 : p.x < cx ? -8 : 0)} y={p.y + (p.y > cy ? 14 : p.y < cy ? -6 : 0)} textAnchor="middle" className="fill-zinc-400 text-[9px]">{labels[i]}</text>
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
  const fillPercent = ((value - 1) / 4) * 100;
  return (
    <div className="mb-5">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[14px] font-medium text-zinc-800">{label}</span>
        <span className="text-[14px] font-semibold text-zinc-900 tabular-nums">{value % 1 === 0 ? value : value.toFixed(1)}</span>
      </div>
      <div className="relative w-full h-[6px]">
        <div className="absolute inset-0 bg-zinc-200 rounded-full" />
        <div className="absolute top-0 left-0 h-full bg-blue-600 rounded-full" style={{ width: `${fillPercent}%` }} />
        <input
          type="range"
          min="1"
          max="5"
          step="0.5"
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="absolute inset-0 w-full opacity-0 cursor-pointer z-10"
          style={{ height: '24px', top: '-9px' }}
        />
        <div
          className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white border-2 border-blue-600 rounded-full shadow-sm pointer-events-none"
          style={{ left: `calc(${fillPercent}% - 8px)` }}
        />
      </div>
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
              {/* Row 1: ID + Title + Status + Close */}
              <div className="flex items-center gap-3 mb-3">
                <span className="font-mono text-[12px] font-medium text-blue-600 bg-yellow-50 border border-yellow-200 px-2.5 py-1 rounded-md whitespace-nowrap flex-shrink-0">
                  {initiative.initiative_key}
                </span>
                <h2 className="text-[18px] font-semibold text-zinc-900 truncate flex-1 leading-snug">
                  {initiative.title}
                </h2>
                <StatusBadge status={initiative.status} />
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
              <div className="flex -mb-px">
                {TABS.map(tab => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveTab(tab)}
                    className={`py-2.5 px-4 text-[14px] border-b-2 transition-colors ${
                      activeTab === tab
                        ? 'text-zinc-900 font-semibold border-blue-600'
                        : 'text-zinc-400 hover:text-zinc-600 border-transparent'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-7 py-6">
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

function formatAbsoluteDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '—';
  return format(d, 'MMM dd, yyyy');
}

const MOCK_COMMENTS: Record<string, { author: string; content: string; timeAgo: string }[]> = {
  'MIM-001': [
    { author: 'Ahmed M.', content: 'Reviewed the architecture proposal. Aligning with the cloud migration timeline is critical.', timeAgo: '2 days ago' },
    { author: 'Sarah K.', content: "Agreed. I've updated the dependency map to reflect the Q1 milestones.", timeAgo: '1 day ago' },
  ],
  'MIM-002': [
    { author: 'Ahmed M.', content: 'Migration plan finalized. Ready for stakeholder review.', timeAgo: '3 hours ago' },
  ],
};

function DetailsContent({ initiative, onStatusChange }: { initiative: Initiative; onStatusChange: (id: string, s: InitiativeStatus) => void }) {
  const comments = MOCK_COMMENTS[initiative.initiative_key] || [];
  const fields: [string, React.ReactNode][] = [
    ['Status', <StatusBadge status={initiative.status} editable onChange={(s) => onStatusChange(initiative.id, s)} />],
    ['EA Review', <span className="text-zinc-600">Not Required</span>],
    ['Priority', <PriorityBadge score={initiative.computed_score} />],
    ['Target Quarter', <span>{initiative.target_quarter || '—'}</span>],
    ['Reporter', <UserAvatar name="Mohammed A." size={24} showName />],
    ['Assignee', <UserAvatar name={initiative.assignee_name} size={24} showName />],
    ['Department', <span>{initiative.department_name || '—'}</span>],
    ['Business Owner', <UserAvatar name={initiative.business_owner_name} size={24} showName />],
    ['Business Ask Date', <span className="text-zinc-600">{formatAbsoluteDate(initiative.business_ask_date)}</span>],
    ['Kickoff Date', <span className="text-zinc-600">{formatAbsoluteDate(initiative.kickoff_date)}</span>],
    ['Target Complete', <span className="text-zinc-600">{formatAbsoluteDate(initiative.target_complete)}</span>],
    ['Progress', <ProgressBar value={initiative.progress} status={initiative.status} />],
  ];

  return (
    <>
      <div className="grid grid-cols-2 gap-x-8 gap-y-5 pt-2">
        {fields.map(([label, value]) => (
          <div key={label as string}>
            <FieldLabel>{label}</FieldLabel>
            <FieldValue>{value}</FieldValue>
          </div>
        ))}
      </div>

      {initiative.description && (
        <div className="mt-8 pt-6 border-t border-zinc-100">
          <h3 className="text-[15px] font-semibold text-zinc-900 mb-2">Description</h3>
          <p className="text-[14px] leading-relaxed text-zinc-600">{initiative.description}</p>
        </div>
      )}

      <div className="mt-8 pt-6 border-t border-zinc-100">
        <h3 className="text-[15px] font-semibold text-zinc-900 mb-4">Comments ({comments.length})</h3>
        {comments.length > 0 && (
          <div className="space-y-5 mb-5">
            {comments.map((c, i) => (
              <div key={i} className="flex items-start gap-3">
                <UserAvatar name={c.author} size={36} showTooltip={false} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className="text-[14px] font-semibold text-zinc-900">{c.author}</span>
                    <span className="text-[12px] text-zinc-400">{c.timeAgo}</span>
                  </div>
                  <p className="text-[14px] text-zinc-600 mt-1 leading-relaxed">{c.content}</p>
                </div>
              </div>
            ))}
          </div>
        )}
        {comments.length > 0 && <div className="border-t border-zinc-100 mb-4" />}
        <div className="flex items-center gap-3">
          <UserAvatar name="AK" size={36} showTooltip={false} />
          <input
            type="text"
            placeholder="Write a comment..."
            className="flex-1 h-10 px-4 text-[14px] bg-white border border-zinc-200 rounded-lg outline-none placeholder:text-zinc-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
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
    <div className="flex gap-6 pt-2">
      {/* Left: Sliders */}
      <div className="flex-[3] min-w-0">
        <ScoreSlider label="Strategic Alignment" value={scores.sa} onChange={(v) => onScoreChange({ ...scores, sa: v })} />
        <ScoreSlider label="Business Impact" value={scores.bi} onChange={(v) => onScoreChange({ ...scores, bi: v })} />
        <ScoreSlider label="Time & Urgency" value={scores.tu} onChange={(v) => onScoreChange({ ...scores, tu: v })} />
        <ScoreSlider label="Resource & Feasibility" value={scores.rf} onChange={(v) => onScoreChange({ ...scores, rf: v })} />
        <button
          type="button"
          onClick={onSave}
          className="w-full h-10 bg-blue-600 text-white text-[14px] font-semibold rounded-lg hover:bg-blue-700 transition-colors mt-3"
        >
          Save Score
        </button>
      </div>

      {/* Right: Summary */}
      <div className="flex-[2] bg-zinc-50 rounded-xl p-6 flex flex-col items-center gap-2">
        <div className="text-[48px] font-bold text-zinc-900 leading-none">{computedScore.toFixed(1)}</div>
        <PriorityBadge score={computedScore} size="md" showScore={false} />
        <div className="mt-2">
          <RadarChart scores={[scores.sa, scores.bi, scores.tu, scores.rf]} />
        </div>
        <div className="border-t border-zinc-200 w-full mt-2 pt-3">
          <p className="text-[12px] text-zinc-500 text-center leading-relaxed">
            {priority.level === 'High' && <>Score of {computedScore.toFixed(1)} falls in the <strong className="text-zinc-700">High</strong> range (4.0-5.0). This initiative is rated as high priority based on strong strategic alignment and significant business impact.</>}
            {priority.level === 'Medium' && <>Score of {computedScore.toFixed(1)} falls in the <strong className="text-zinc-700">Medium</strong> range (3.0-3.9). This initiative has moderate priority with balanced scores across criteria.</>}
            {priority.level === 'Low' && <>Score of {computedScore.toFixed(1)} falls in the <strong className="text-zinc-700">Low</strong> range (2.0-2.9). This initiative scores below the threshold for high prioritization.</>}
            {priority.level === 'Rejected' && <>Score of {computedScore.toFixed(1)} falls in the <strong className="text-zinc-700">Rejected</strong> range (1.0-1.9). This initiative does not meet minimum priority thresholds.</>}
            {priority.level === 'Unscored' && 'This initiative has not been scored yet.'}
          </p>
        </div>
      </div>
    </div>
  );
}
