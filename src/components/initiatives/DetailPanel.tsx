import { format } from 'date-fns';
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Pencil, Paperclip, Copy, Link2, Target, Trash2 } from 'lucide-react';
import type { Initiative, InitiativeStatus } from '@/types/initiative';
import { STATUS_DISPLAY, getPriorityLevel } from '@/types/initiative';
import { StatusBadge } from './StatusBadge';
import { PriorityBadge } from './PriorityBadge';
import { UserAvatar } from './UserAvatar';

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

/* ── V5 Spec: Avatar Colors (deterministic by first name) ── */
const AVATAR_COLORS: Record<string, string> = {
  'Sarah': '#6366f1',
  'Ahmed': '#10b981',
  'Fatima': '#ec4899',
  'Omar': '#f97316',
  'Layla': '#06b6d4',
  'Khalid': '#8b5cf6',
  'Nora': '#f43f5e',
  'Mohammed': '#0d9488',
};

function getV5AvatarColor(name: string): string {
  const firstName = name.split(' ')[0];
  return AVATAR_COLORS[firstName] || '#6366f1';
}

function getInitials(name: string): string {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

/* ── V5 Spec: Inline Avatar (circle, white text) ── */
function InlineAvatar({ name, size = 20 }: { name: string; size?: number }) {
  const fontSize = size <= 20 ? 9 : size <= 24 ? 10 : size <= 28 ? 10 : 11;
  return (
    <div
      className="rounded-full flex items-center justify-center text-white flex-shrink-0"
      style={{
        width: size,
        height: size,
        backgroundColor: getV5AvatarColor(name),
        fontSize,
        fontWeight: 600,
        lineHeight: 1,
      }}
    >
      {getInitials(name)}
    </div>
  );
}

/* ── V5 Spec: Field Label ── */
function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: 11,
      fontWeight: 500,
      textTransform: 'uppercase' as const,
      letterSpacing: '0.05em',
      color: '#a1a1aa',
      lineHeight: 1,
      marginBottom: 4,
    }}>
      {children}
    </div>
  );
}

/* ── V5 Spec: Field Value ── */
function FieldValue({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: 13,
      fontWeight: 400,
      color: '#18181b',
      lineHeight: 1.4,
      display: 'flex',
      alignItems: 'center',
      gap: 6,
    }}>
      {children}
    </div>
  );
}

/* ── V5 Spec: Progress Bar (80px wide, 6px tall) ── */
function DetailProgressBar({ value, status }: { value: number; status?: InitiativeStatus }) {
  const clamped = Math.min(Math.max(value, 0), 100);
  const fillColor = status === 'delivered' ? '#10b981' : '#2563eb';
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      <div style={{ width: 80, height: 6, background: '#e4e4e7', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${clamped}%`, background: fillColor, borderRadius: 3 }} />
      </div>
      <span style={{ fontSize: 13, fontWeight: 500, color: '#18181b', fontVariantNumeric: 'tabular-nums' }}>
        {clamped}%
      </span>
    </div>
  );
}

/* ── V5 Spec: Radar Chart (160×160, SA/BI/TU/RF) ── */
function RadarChart({ scores }: { scores: [number, number, number, number] }) {
  const size = 160;
  const cx = size / 2;
  const cy = size / 2;
  const r = 56;
  const labels = ['SA', 'BI', 'TU', 'RF'];
  const angles = scores.map((_, i) => (Math.PI / 2) + (2 * Math.PI * i) / 4);

  const axisPoints = angles.map(a => ({ x: cx + r * Math.cos(a), y: cy - r * Math.sin(a) }));
  const dataPoints = scores.map((s, i) => {
    const ratio = (s || 0) / 5;
    return { x: cx + r * ratio * Math.cos(angles[i]), y: cy - r * ratio * Math.sin(angles[i]) };
  });
  const poly = dataPoints.map(p => `${p.x},${p.y}`).join(' ');

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {[0.2, 0.4, 0.6, 0.8, 1].map((s, i) => (
        <polygon key={i} points={angles.map(a => `${cx + r * s * Math.cos(a)},${cy - r * s * Math.sin(a)}`).join(' ')} fill="none" stroke="#e4e4e7" strokeWidth="0.5" />
      ))}
      {axisPoints.map((p, i) => (
        <g key={i}>
          <line x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="#e4e4e7" strokeWidth="0.5" />
          <text
            x={p.x + (p.x > cx ? 8 : p.x < cx ? -8 : 0)}
            y={p.y + (p.y > cy ? 14 : p.y < cy ? -6 : 0)}
            textAnchor="middle"
            style={{ fontSize: 9, fill: '#71717a' }}
          >
            {labels[i]}
          </text>
        </g>
      ))}
      <polygon points={poly} fill="rgba(37,99,235,0.10)" stroke="#2563eb" strokeWidth="1.5" />
      {dataPoints.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="3" fill="#2563eb" />
      ))}
    </svg>
  );
}

/* ── V5 Spec: Score Slider ── */
function ScoreSlider({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  const fillPercent = ((value - 1) / 4) * 100;
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
        <span style={{ fontSize: 13, fontWeight: 500, color: '#3f3f46' }}>{label}</span>
        <span style={{ fontSize: 15, fontWeight: 700, color: '#18181b', fontVariantNumeric: 'tabular-nums', minWidth: 28, textAlign: 'right' }}>
          {value % 1 === 0 ? value : value.toFixed(1)}
        </span>
      </div>
      <div style={{ position: 'relative', width: '100%', height: 28, display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
        {/* Rail */}
        <div style={{ position: 'absolute', left: 0, right: 0, height: 6, background: '#e4e4e7', borderRadius: 3 }} />
        {/* Fill */}
        <div style={{ position: 'absolute', left: 0, height: 6, background: '#2563eb', borderRadius: 3, width: `${fillPercent}%`, pointerEvents: 'none' }} />
        {/* Hidden input for interaction */}
        <input
          type="range"
          min="1"
          max="5"
          step="0.5"
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          style={{ position: 'absolute', inset: 0, width: '100%', height: 28, opacity: 0, cursor: 'pointer', zIndex: 10 }}
        />
        {/* Thumb */}
        <div style={{
          position: 'absolute',
          width: 18,
          height: 18,
          background: '#ffffff',
          border: '2.5px solid #2563eb',
          borderRadius: '50%',
          boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
          transform: 'translateX(-50%)',
          left: `${fillPercent}%`,
          pointerEvents: 'none',
          zIndex: 2,
        }} />
      </div>
    </div>
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

/* ════════════════════════════════════════════════════
   MAIN DETAIL PANEL
   ════════════════════════════════════════════════════ */
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
          {/* V5: Overlay — rgba(0,0,0,0.20), z-55 */}
          <motion.div
            className="fixed inset-0 z-[55]"
            style={{ background: 'rgba(0,0,0,0.20)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />
          {/* V5: Drawer — 55%, min 560, max 840, z-60 */}
          <motion.div
            ref={panelRef}
            className="fixed top-0 right-0 h-screen z-[60] flex flex-col overflow-hidden"
            style={{
              width: '55%',
              maxWidth: 840,
              minWidth: 560,
              background: '#ffffff',
              boxShadow: '-8px 0 24px rgba(0,0,0,0.12)',
            }}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
          >
            {/* ── HEADER (flex-shrink: 0) ── */}
            <div style={{ flexShrink: 0, padding: '20px 24px 0', background: '#ffffff' }}>

              {/* Title Bar */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                <span style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 12,
                  fontWeight: 500,
                  color: '#2563eb',
                  background: '#eff6ff',
                  border: '1px solid #bfdbfe',
                  padding: '4px 10px',
                  borderRadius: 6,
                  flexShrink: 0,
                  letterSpacing: '0.01em',
                  lineHeight: 1,
                }}>
                  {initiative.initiative_key}
                </span>
                <h2 style={{
                  fontSize: 17,
                  fontWeight: 600,
                  color: '#18181b',
                  lineHeight: 1.3,
                  flex: 1,
                  minWidth: 0,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  letterSpacing: '-0.01em',
                  margin: 0,
                }}>
                  {initiative.title}
                </h2>
                <StatusBadge status={initiative.status} />
                <button
                  type="button"
                  onClick={onClose}
                  style={{
                    width: 32,
                    height: 32,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#a1a1aa',
                    borderRadius: 6,
                    flexShrink: 0,
                    marginLeft: 'auto',
                    border: 'none',
                    background: 'none',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = '#f4f4f5'; e.currentTarget.style.color = '#18181b'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = '#a1a1aa'; }}
                >
                  <X size={16} />
                </button>
              </div>

              {/* Action Bar */}
              <div style={{ display: 'flex', gap: 2, paddingBottom: 14, borderBottom: '1px solid #f4f4f5' }}>
                {ACTION_BUTTONS.map(({ label, icon: Icon }) => (
                  <button
                    key={label}
                    type="button"
                    className="hover:bg-zinc-100"
                    style={{
                      height: 30,
                      padding: '0 10px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 5,
                      fontSize: 12,
                      fontWeight: 400,
                      color: '#52525b',
                      borderRadius: 6,
                      border: 'none',
                      background: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    <Icon size={14} />
                    {label}
                  </button>
                ))}
                <button
                  type="button"
                  className="hover:bg-red-50"
                  style={{
                    height: 30,
                    padding: '0 10px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                    fontSize: 12,
                    fontWeight: 400,
                    color: '#dc2626',
                    borderRadius: 6,
                    border: 'none',
                    background: 'none',
                    cursor: 'pointer',
                    marginLeft: 'auto',
                  }}
                >
                  <Trash2 size={14} />
                  Delete
                </button>
              </div>

              {/* Tab Bar */}
              <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid #e4e4e7', margin: '14px -24px 0', padding: '0 24px' }}>
                {TABS.map(tab => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveTab(tab)}
                    style={{
                      padding: '10px 14px',
                      fontSize: 13,
                      fontWeight: activeTab === tab ? 500 : 400,
                      color: activeTab === tab ? '#18181b' : '#71717a',
                      borderBottom: `2px solid ${activeTab === tab ? '#2563eb' : 'transparent'}`,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      background: 'none',
                      borderTop: 'none',
                      borderLeft: 'none',
                      borderRight: 'none',
                    }}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            {/* ── BODY (scrollable) ── */}
            <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
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
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 192, color: '#a1a1aa', fontSize: 13 }}>
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

/* ════════════════════════════════════════════════════
   DETAILS TAB
   ════════════════════════════════════════════════════ */
function DetailsContent({ initiative, onStatusChange }: { initiative: Initiative; onStatusChange: (id: string, s: InitiativeStatus) => void }) {
  const comments = MOCK_COMMENTS[initiative.initiative_key] || [];

  return (
    <>
      {/* Field Grid — V5: 2-col, 18px row-gap, 24px col-gap */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px 24px' }}>
        <div><FieldLabel>Status</FieldLabel><FieldValue><StatusBadge status={initiative.status} editable onChange={(s) => onStatusChange(initiative.id, s)} /></FieldValue></div>
        <div><FieldLabel>EA Review</FieldLabel><FieldValue>Not Required</FieldValue></div>
        <div><FieldLabel>Priority</FieldLabel><FieldValue><PriorityBadge score={initiative.computed_score} /></FieldValue></div>
        <div><FieldLabel>Target Quarter</FieldLabel><FieldValue>{initiative.target_quarter || '—'}</FieldValue></div>
        <div><FieldLabel>Reporter</FieldLabel><FieldValue><InlineAvatar name="Mohammed A." size={20} /><span>Mohammed A.</span></FieldValue></div>
        <div><FieldLabel>Assignee</FieldLabel><FieldValue>{initiative.assignee_name ? <><InlineAvatar name={initiative.assignee_name} size={20} /><span>{initiative.assignee_name}</span></> : <span style={{ color: '#a1a1aa', fontStyle: 'italic' }}>Unassigned</span>}</FieldValue></div>
        <div><FieldLabel>Department</FieldLabel><FieldValue>{initiative.department_name || '—'}</FieldValue></div>
        <div><FieldLabel>Business Owner</FieldLabel><FieldValue>{initiative.business_owner_name ? <><InlineAvatar name={initiative.business_owner_name} size={20} /><span>{initiative.business_owner_name}</span></> : '—'}</FieldValue></div>
        <div><FieldLabel>Business Ask Date</FieldLabel><FieldValue>{formatAbsoluteDate(initiative.business_ask_date)}</FieldValue></div>
        <div><FieldLabel>Kickoff Date</FieldLabel><FieldValue>{formatAbsoluteDate(initiative.kickoff_date)}</FieldValue></div>
        <div><FieldLabel>Target Complete</FieldLabel><FieldValue>{formatAbsoluteDate(initiative.target_complete)}</FieldValue></div>
        <div><FieldLabel>Progress</FieldLabel><FieldValue><DetailProgressBar value={initiative.progress} status={initiative.status} /></FieldValue></div>
      </div>

      {/* Description — V5: mt 24px, 13px/1.65, zinc-600 */}
      {initiative.description && (
        <div style={{ marginTop: 24 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#18181b', marginBottom: 10, lineHeight: 1 }}>Description</div>
          <p style={{ fontSize: 13, fontWeight: 400, lineHeight: 1.65, color: '#52525b', margin: 0 }}>{initiative.description}</p>
        </div>
      )}

      {/* Comments — V5: mt 24px */}
      <div style={{ marginTop: 24 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#18181b', marginBottom: 10, lineHeight: 1 }}>
          Comments ({comments.length})
        </div>
        {comments.map((c, i) => (
          <div key={i} style={{ display: 'flex', gap: 10, padding: '12px 0', borderBottom: i < comments.length - 1 ? '1px solid #f4f4f5' : 'none' }}>
            <InlineAvatar name={c.author} size={28} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                <span style={{ fontSize: 13, fontWeight: 500, color: '#18181b' }}>{c.author}</span>
                <span style={{ fontSize: 11, fontWeight: 400, color: '#a1a1aa' }}>{c.timeAgo}</span>
              </div>
              <p style={{ fontSize: 13, fontWeight: 400, lineHeight: 1.5, color: '#52525b', margin: 0 }}>{c.content}</p>
            </div>
          </div>
        ))}

        {/* New comment input — V5: 36px h, 6px radius, zinc-200 border */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', paddingTop: 14 }}>
          <InlineAvatar name="AK" size={28} />
          <input
            type="text"
            placeholder="Write a comment..."
            style={{
              flex: 1,
              height: 36,
              border: '1px solid #e4e4e7',
              borderRadius: 6,
              padding: '0 12px',
              fontSize: 13,
              color: '#18181b',
              outline: 'none',
              background: 'transparent',
            }}
            onFocus={(e) => { e.target.style.borderColor = '#3b82f6'; e.target.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.08)'; }}
            onBlur={(e) => { e.target.style.borderColor = '#e4e4e7'; e.target.style.boxShadow = 'none'; }}
          />
        </div>
      </div>
    </>
  );
}

/* ════════════════════════════════════════════════════
   SCORE TAB
   ════════════════════════════════════════════════════ */
function ScoreContent({
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
    <div style={{ display: 'flex', gap: 24, minHeight: 400 }}>
      {/* Left: Sliders (flex 3 ≈ 60%) */}
      <div style={{ flex: 3, display: 'flex', flexDirection: 'column' }}>
        <ScoreSlider label="Strategic Alignment" value={scores.sa} onChange={(v) => onScoreChange({ ...scores, sa: v })} />
        <ScoreSlider label="Business Impact" value={scores.bi} onChange={(v) => onScoreChange({ ...scores, bi: v })} />
        <ScoreSlider label="Time & Urgency" value={scores.tu} onChange={(v) => onScoreChange({ ...scores, tu: v })} />
        <ScoreSlider label="Resource & Feasibility" value={scores.rf} onChange={(v) => onScoreChange({ ...scores, rf: v })} />
        <button
          type="button"
          onClick={onSave}
          style={{
            width: '100%',
            height: 38,
            background: '#2563eb',
            color: '#ffffff',
            fontSize: 13,
            fontWeight: 500,
            border: 'none',
            borderRadius: 6,
            cursor: 'pointer',
            marginTop: 'auto',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = '#1d4ed8'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = '#2563eb'; }}
        >
          Save Score
        </button>
      </div>

      {/* Right: Summary (flex 2 ≈ 40%) — V5: zinc-50, border zinc-100, rounded 10px */}
      <div style={{
        flex: 2,
        background: '#fafafa',
        border: '1px solid #f4f4f5',
        borderRadius: 10,
        padding: '24px 20px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}>
        {/* Big score */}
        <div style={{
          fontSize: 52,
          fontWeight: 700,
          color: '#18181b',
          lineHeight: 1,
          letterSpacing: '-0.02em',
          fontVariantNumeric: 'tabular-nums',
          marginBottom: 10,
        }}>
          {computedScore.toFixed(1)}
        </div>

        {/* Priority badge */}
        <div style={{ marginBottom: 16 }}>
          <PriorityBadge score={computedScore} size="md" showScore={false} />
        </div>

        {/* Radar chart */}
        <div style={{ margin: '8px 0' }}>
          <RadarChart scores={[scores.sa, scores.bi, scores.tu, scores.rf]} />
        </div>

        {/* Explanation */}
        <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid #e4e4e7', width: '100%' }}>
          <p style={{ fontSize: 12, fontWeight: 400, color: '#71717a', lineHeight: 1.55, textAlign: 'center', margin: 0 }}>
            {priority.level === 'High' && <>Score of {computedScore.toFixed(1)} falls in the <strong style={{ color: '#3f3f46', fontWeight: 600 }}>High</strong> range (4.0-5.0). This initiative is rated as high priority based on strong strategic alignment and significant business impact.</>}
            {priority.level === 'Medium' && <>Score of {computedScore.toFixed(1)} falls in the <strong style={{ color: '#3f3f46', fontWeight: 600 }}>Medium</strong> range (3.0-3.9). This initiative has moderate priority with balanced scores across criteria.</>}
            {priority.level === 'Low' && <>Score of {computedScore.toFixed(1)} falls in the <strong style={{ color: '#3f3f46', fontWeight: 600 }}>Low</strong> range (2.0-2.9). This initiative scores below the threshold for high prioritization.</>}
            {priority.level === 'Rejected' && <>Score of {computedScore.toFixed(1)} falls in the <strong style={{ color: '#3f3f46', fontWeight: 600 }}>Rejected</strong> range (1.0-1.9). This initiative does not meet minimum priority thresholds.</>}
            {priority.level === 'Unscored' && 'This initiative has not been scored yet.'}
          </p>
        </div>
      </div>
    </div>
  );
}
