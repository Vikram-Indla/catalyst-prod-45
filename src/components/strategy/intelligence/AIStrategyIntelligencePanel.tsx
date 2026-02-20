import React, { useRef, useEffect, useState } from "react";
import { X, Sparkles } from "lucide-react";
import { ChainMetrics } from "@/utils/computeChainMetrics";
import type { AIResult } from "@/utils/generateIntelligence";

interface AIStrategyIntelligencePanelProps {
  isOpen: boolean;
  metrics: ChainMetrics | null;
  defects: any[];
  aiResult: AIResult | null;
  isAILoading: boolean;
  onClose: () => void;
  onRegenerate: () => void;
}

const TABS = [
  { id: 'executive', label: 'Executive' },
  { id: 'goal', label: 'Goal' },
  { id: 'kr', label: 'Key Results' },
  { id: 'initiative', label: 'Init & Epic' },
  { id: 'operational', label: 'Operational' },
] as const;

type TabId = typeof TABS[number]['id'];

export function AIStrategyIntelligencePanel({
  isOpen, metrics, defects, aiResult, isAILoading, onClose, onRegenerate,
}: AIStrategyIntelligencePanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<TabId>('executive');

  useEffect(() => {
    if (scrollRef.current && metrics) scrollRef.current.scrollTop = 0;
  }, [metrics?.goalKey, activeTab]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && isOpen) onClose();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Reset to executive tab when chain changes
  useEffect(() => { setActiveTab('executive'); }, [metrics?.goalKey]);

  if (!metrics) return null;

  // Chain breadcrumb with color-coded pills per hierarchy level
  // Colors match Alignment Map spec: Theme=#2563EB, Goal=#0D9488, KR=#2563EB, Init=#D97706, Epic=#4F46E5
  const LEVEL_COLORS = [
    { bg: '#DBEAFE', text: '#1E40AF', border: '#93C5FD' },  // Theme (blue)
    { bg: '#CCFBF1', text: '#115E59', border: '#5EEAD4' },  // Goal (teal)
    { bg: '#DBEAFE', text: '#1E40AF', border: '#93C5FD' },  // KRs (blue)
    { bg: '#FEF3C7', text: '#92400E', border: '#FDE68A' },  // Initiative (amber)
    { bg: '#EDE9FE', text: '#5B21B6', border: '#C4B5FD' },  // Epic (purple)
  ];

  const chainSegments = [
    { label: metrics.themeKey, level: 0, exists: true },
    { label: metrics.goalKey, level: 1, exists: true },
    { label: metrics.krs.length > 0 ? metrics.krs.map(k => k.key).join(', ') : null, level: 2, exists: metrics.krs.length > 0 },
    { label: metrics.initiativeKey, level: 3, exists: !!metrics.initiativeKey },
    { label: metrics.epicKey, level: 4, exists: !!metrics.epicKey },
  ];

  return (
    <div
      className="fixed top-[52px] right-0 bottom-0 z-50 flex flex-col bg-white shadow-2xl border-l border-slate-200"
      style={{
        width: '50vw',
        transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 400ms cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      {/* Purple AI accent strip */}
      <div className="h-[2px] w-full shrink-0" style={{ background: 'linear-gradient(90deg, #7C3AED 0%, #A78BFA 50%, #7C3AED 100%)' }} />

      {/* Header */}
      <div className="px-7 pt-4 pb-0 shrink-0">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg, #7C3AED, #6D28D9)' }}>
              <Sparkles size={16} className="text-white" />
            </div>
            <div>
              <h2 className="text-[15px] font-[700]" style={{ color: '#0F172A' }}>Strategy Intelligence</h2>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-md transition-colors">
            <X size={18} className="text-slate-400" />
          </button>
        </div>

        {/* Chain breadcrumb — color-coded pills */}
        <div className="flex items-center gap-1.5 flex-wrap mb-3">
          {chainSegments.map((seg, i) => {
            if (!seg.exists || !seg.label) return null;
            const c = LEVEL_COLORS[seg.level];
            return (
              <React.Fragment key={i}>
                {i > 0 && <span className="text-[10px] font-medium" style={{ color: '#94A3B8' }}>›</span>}
                <span
                  className="text-[10px] font-mono font-semibold px-2 py-[3px] rounded-md"
                  style={{ color: c.text, background: c.bg, border: `1px solid ${c.border}` }}
                >
                  {seg.label}
                </span>
              </React.Fragment>
            );
          })}
          {!metrics.initiativeKey && (
            <>
              <span className="text-[10px] font-medium" style={{ color: '#94A3B8' }}>›</span>
              <span className="text-[10px] font-semibold px-2 py-[3px] rounded-md" style={{ color: '#D97706', background: '#FFFBEB', border: '1px solid #FDE68A' }}>⚠ No Initiative</span>
            </>
          )}
          {!metrics.epicKey && (
            <>
              <span className="text-[10px] font-medium" style={{ color: '#94A3B8' }}>›</span>
              <span className="text-[10px] font-semibold px-2 py-[3px] rounded-md" style={{ color: '#5B21B6', background: '#EDE9FE', border: '1px solid #C4B5FD' }}>⚠ No Epic</span>
            </>
          )}
        </div>

        {/* Tab bar */}
        <div className="flex border-b" style={{ borderColor: '#E2E8F0' }}>
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="px-3 py-2 transition-colors relative"
              style={{
                color: activeTab === tab.id ? '#0F172A' : '#64748B',
                fontWeight: activeTab === tab.id ? 700 : 500,
                fontSize: 12,
                letterSpacing: '0.03em',
                textTransform: 'uppercase',
              }}
            >
              {activeTab === tab.id && tab.id === 'executive' && <span className="mr-1">◉</span>}
              {tab.label}
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-0 right-0 h-[2px]" style={{ background: '#2563EB' }} />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Scrollable tab content */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto" style={{ scrollBehavior: 'smooth' }}>
        {activeTab === 'executive' && <TabExecutive metrics={metrics} aiResult={aiResult} isAILoading={isAILoading} />}
        {activeTab === 'goal' && <TabGoal metrics={metrics} aiResult={aiResult} isAILoading={isAILoading} />}
        {activeTab === 'kr' && <TabKeyResults metrics={metrics} aiResult={aiResult} isAILoading={isAILoading} />}
        {activeTab === 'initiative' && <TabInitiativeEpic metrics={metrics} defects={defects} aiResult={aiResult} isAILoading={isAILoading} />}
        {activeTab === 'operational' && <TabOperational metrics={metrics} defects={defects} aiResult={aiResult} isAILoading={isAILoading} />}
      </div>

      {/* Footer */}
      <div className="shrink-0 border-t px-7 py-2.5 flex items-center justify-between" style={{ borderColor: '#F1F5F9' }}>
        <div className="flex items-center gap-1.5 text-[10px]" style={{ color: '#94A3B8' }}>
          <span style={{ color: '#A78BFA' }}>✦</span> AI · {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onRegenerate}
            disabled={isAILoading}
            className="px-3 py-1 rounded transition-colors disabled:opacity-50"
            style={{ fontSize: 11, fontWeight: 500, color: '#64748B' }}
          >
            Regenerate
          </button>
          <button
            onClick={onClose}
            className="px-3.5 py-1 rounded-md transition-colors"
            style={{ fontSize: 11, fontWeight: 600, color: '#FFFFFF', background: '#1E293B' }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// STATUS BANNER — used in every tab
// ═══════════════════════════════════════════════════════════

function StatusBanner({ health, label, detail }: { health: number; label: string; detail: string }) {
  const status = health >= 70 ? 'on_track' : health >= 45 ? 'at_risk' : 'critical';
  const cfg = {
    on_track: { label: 'ON TRACK', dot: '#16A34A', border: '#16A34A' },
    at_risk:  { label: 'AT RISK',  dot: '#D97706', border: '#D97706' },
    critical: { label: 'CRITICAL', dot: '#EF4444', border: '#EF4444' },
  }[status];

  return (
    <div
      className="rounded-lg p-4 mb-5"
      style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderLeft: `4px solid ${cfg.border}` }}
    >
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full shrink-0" style={{ background: cfg.dot }} />
        <span className="text-[14px] font-[700]" style={{ color: '#1E293B' }}>{cfg.label}</span>
        <span className="text-[13px] ml-2" style={{ color: '#1E293B' }}>{detail}</span>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// TAB 1: EXECUTIVE SUMMARY
// ═══════════════════════════════════════════════════════════

function TabExecutive({ metrics, aiResult, isAILoading }: { metrics: ChainMetrics; aiResult: AIResult | null; isAILoading: boolean }) {
  const m = metrics;
  const epicProgress = m.storiesTotal > 0 ? Math.round(m.storiesDone / m.storiesTotal * 100) : 0;
  const krAvg = m.krs.length > 0 ? Math.round(m.krs.reduce((s, k) => s + k.progress, 0) / m.krs.length) : 0;

  const chainLevels = [
    { key: m.themeKey, label: 'Strategic Theme', progress: m.goalProgress },
    { key: m.goalKey, label: 'Goal', progress: m.goalProgress },
    { key: `${m.krs.length} KRs`, label: 'Key Results avg', progress: krAvg },
    ...(m.initiativeKey ? [{ key: m.initiativeKey, label: 'Initiative', progress: 60 }] : []),
    ...(m.epicKey ? [{ key: m.epicKey, label: 'Epic', progress: epicProgress }] : []),
  ];

  // Determine goal due date
  const goalDue = m.goalTarget ? new Date(m.goalTarget).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

  return (
    <div className="px-7 py-5">
      {/* Theme name & owner */}
      <SectionLabel>STRATEGIC THEME</SectionLabel>
      <p className="text-[14px] font-[700] mb-0.5" style={{ color: '#0F172A' }}>{m.themeName}</p>
      {m.owners[0] && (
        <p className="text-[13px] mb-4" style={{ color: '#475569' }}>
          Owner: {m.owners[0].name} · {m.owners[0].role}
        </p>
      )}

      {/* Status banner */}
      <StatusBanner health={m.goalHealth} label="Overall" detail={`Health ${m.goalHealth}/100 · Confidence ${m.confidencePct}%`} />

      {/* Chain health at each level */}
      <SectionLabel>CHAIN HEALTH AT EACH LEVEL</SectionLabel>
      <div className="space-y-2.5 mb-6">
        {chainLevels.map((level, i) => {
          const dot = level.progress >= 70 ? '#16A34A' : level.progress >= 40 ? '#D97706' : '#EF4444';
          return (
            <div key={i} className="flex items-center gap-2.5">
              <span className="text-[12px] w-[110px] shrink-0" style={{ color: '#475569' }}>{level.label}</span>
              <div className="flex-1 h-[6px] rounded-full overflow-hidden" style={{ background: '#F1F5F9' }}>
                <div className="h-full rounded-full" style={{ width: `${level.progress}%`, background: '#2563EB', transition: 'width 0.8s ease' }} />
              </div>
              <span className="text-[12px] font-[700] w-[36px] text-right shrink-0" style={{ color: '#1E293B' }}>{level.progress}%</span>
              <div className="w-2 h-2 rounded-full shrink-0" style={{ background: dot }} />
            </div>
          );
        })}
      </div>

      {/* Schedule + Delivery cards */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="border rounded-lg p-3.5" style={{ borderColor: '#E2E8F0' }}>
          <SectionLabel>SCHEDULE</SectionLabel>
          <p className="text-[24px] font-[800] leading-none" style={{ color: '#1E293B' }}>
            {m.scheduleDriftDays > 0 ? '+' : ''}{m.scheduleDriftDays}
            <span className="text-[13px] font-[500] ml-1">{m.scheduleDriftDays >= 0 ? 'days ahead' : 'days behind'}</span>
          </p>
          <p className="text-[12px] mt-1.5" style={{ color: '#64748B' }}>Due: {goalDue}</p>
        </div>
        <div className="border rounded-lg p-3.5" style={{ borderColor: '#E2E8F0' }}>
          <SectionLabel>DELIVERY</SectionLabel>
          <p className="text-[24px] font-[800] leading-none" style={{ color: '#1E293B' }}>
            {m.storiesDone}
            <span className="text-[13px] font-[500] ml-1">of {m.storiesTotal} done</span>
          </p>
          <p className="text-[12px] mt-1.5" style={{ color: '#64748B' }}>{m.storiesInProd} in production</p>
        </div>
      </div>

      {/* AI Summary */}
      <AIInsight aiResult={aiResult} isAILoading={isAILoading} />

      {/* Key people */}
      <SectionLabel>KEY PEOPLE</SectionLabel>
      <div className="space-y-1">
        {m.owners.slice(0, 3).map((o, i) => (
          <p key={i} className="text-[13px]" style={{ color: '#1E293B' }}>
            <strong>{o.name}</strong>
            <span style={{ color: '#64748B' }}> · {o.role}</span>
          </p>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// TAB 2: GOAL DEEP DIVE
// ═══════════════════════════════════════════════════════════

function TabGoal({ metrics, aiResult, isAILoading }: { metrics: ChainMetrics; aiResult: AIResult | null; isAILoading: boolean }) {
  const m = metrics;
  const goalDue = m.goalTarget ? new Date(m.goalTarget) : null;
  const daysRemaining = goalDue ? Math.max(0, Math.round((goalDue.getTime() - Date.now()) / 86400000)) : null;
  const goalDueStr = goalDue ? goalDue.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

  // Time elapsed %
  const goalStart = m.owners.length > 0 ? null : null; // we don't have start in metrics, use schedule drift
  const totalDur = goalDue ? Math.max(1, (goalDue.getTime() - (goalDue.getTime() - (daysRemaining! + Math.abs(m.scheduleDriftDays)) * 86400000)) / 86400000) : 0;

  return (
    <div className="px-7 py-5">
      <SectionLabel>GOAL</SectionLabel>
      <p className="text-[14px] font-[700] mb-0.5" style={{ color: '#0F172A' }}>{m.goalKey}: {m.goalTitle}</p>
      {m.owners[1] && (
        <p className="text-[13px] mb-1" style={{ color: '#475569' }}>
          Owner: {m.owners[1].name} · {m.owners[1].role}
        </p>
      )}
      <p className="text-[12px] mb-4" style={{ color: '#64748B' }}>Due: {goalDueStr}</p>

      <StatusBanner health={m.goalProgress >= 70 ? 75 : m.goalProgress >= 40 ? 50 : 25} label="Goal" detail={`${m.goalProgress}% complete`} />

      {/* KRs under this goal */}
      <SectionLabel>KEY RESULTS UNDER THIS GOAL</SectionLabel>
      <div className="space-y-2 mb-6">
        {m.krs.map((kr, i) => {
          const dot = kr.progress >= 70 ? '#16A34A' : kr.progress >= 40 ? '#D97706' : '#EF4444';
          return (
            <div key={i} className="flex items-center gap-2.5">
              <span className="text-[10px] font-mono w-[48px] shrink-0 text-right" style={{ color: '#475569' }}>{kr.key}</span>
              <span className="text-[12px] flex-1 truncate" style={{ color: '#1E293B' }}>{kr.title}</span>
              <div className="w-[80px] h-[6px] rounded-full overflow-hidden shrink-0" style={{ background: '#F1F5F9' }}>
                <div className="h-full rounded-full" style={{ width: `${kr.progress}%`, background: '#2563EB' }} />
              </div>
              <span className="text-[12px] font-[700] w-[52px] text-right shrink-0" style={{ color: '#1E293B' }}>{kr.current}/{kr.target}</span>
              <span className="text-[11px] w-[36px] text-right shrink-0" style={{ color: '#1E293B' }}>{kr.progress}%</span>
              <div className="w-2 h-2 rounded-full shrink-0" style={{ background: dot }} />
            </div>
          );
        })}
      </div>

      {/* Schedule detail */}
      <SectionLabel>SCHEDULE</SectionLabel>
      <div className="mb-6 text-[13px] leading-[1.7]" style={{ color: '#1E293B' }}>
        {goalDue && daysRemaining !== null && (
          <p>
            Due: <strong>{goalDueStr}</strong> ({daysRemaining} days remaining).{' '}
            Progress: <strong>{m.goalProgress}%</strong>.{' '}
            {m.scheduleDriftDays >= 0 ? (
              <span>Verdict: <strong>AHEAD</strong> of expected trajectory.</span>
            ) : (
              <span>Verdict: <strong>BEHIND</strong> expected trajectory by {Math.abs(m.scheduleDriftDays)} days.</span>
            )}
          </p>
        )}
      </div>

      <AIInsight aiResult={aiResult} isAILoading={isAILoading} />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// TAB 3: KEY RESULTS
// ═══════════════════════════════════════════════════════════

function TabKeyResults({ metrics, aiResult, isAILoading }: { metrics: ChainMetrics; aiResult: AIResult | null; isAILoading: boolean }) {
  const m = metrics;

  return (
    <div className="px-7 py-5">
      <SectionLabel>{`${m.krs.length} KEY RESULTS under ${m.goalKey}`}</SectionLabel>

      <div className="space-y-3 mb-6">
        {m.krs.map((kr, i) => {
          const health = kr.progress >= 70 ? 75 : kr.progress >= 40 ? 50 : 25;
          const statusLabel = kr.status === 'At Risk' || kr.status === 'Off Track' ? kr.status : kr.progress >= 70 ? 'On Track' : 'At Risk';
          const statusDot = kr.progress >= 70 ? '#16A34A' : kr.progress >= 40 ? '#D97706' : '#EF4444';

          // Find KR owner
          const krOwner = m.owners.find(o => o.entityKey === kr.key);

          return (
            <div key={i} className="border rounded-lg p-4" style={{ borderColor: '#E2E8F0', borderLeft: `4px solid ${statusDot}` }}>
              <p className="text-[13px] font-[700] mb-0.5" style={{ color: '#0F172A' }}>
                {kr.key}: {kr.title}
              </p>
              {krOwner && (
                <p className="text-[12px] mb-1" style={{ color: '#475569' }}>
                  Owner: {krOwner.name} · {krOwner.role}
                </p>
              )}
              <div className="flex items-center gap-2 mb-2.5">
                <div className="w-2 h-2 rounded-full" style={{ background: statusDot }} />
                <span className="text-[12px] font-[600]" style={{ color: '#1E293B' }}>{statusLabel}</span>
              </div>

              {/* Progress bar */}
              <div className="flex items-center gap-2.5 mb-2">
                <div className="flex-1 h-[6px] rounded-full overflow-hidden" style={{ background: '#F1F5F9' }}>
                  <div className="h-full rounded-full" style={{ width: `${kr.progress}%`, background: '#2563EB' }} />
                </div>
                <span className="text-[12px] font-[700] shrink-0" style={{ color: '#1E293B' }}>
                  {kr.current}/{kr.target} {kr.unit !== '%' ? kr.unit : ''}
                </span>
              </div>

              {/* Pace analysis */}
              <p className="text-[12px] leading-[1.6]" style={{ color: '#475569' }}>
                {kr.progress >= 100 ? (
                  <span>Target exceeded. <strong style={{ color: '#16A34A' }}>✓ COMPLETE</strong></span>
                ) : kr.progress >= 70 ? (
                  <span>On pace to complete. <strong style={{ color: '#16A34A' }}>✓</strong></span>
                ) : (
                  <span>
                    {kr.target - kr.current} {kr.unit !== '%' ? kr.unit : 'points'} remaining.{' '}
                    <strong style={{ color: '#D97706' }}>⚠ Needs attention</strong>
                  </span>
                )}
              </p>
            </div>
          );
        })}
      </div>

      <AIInsight aiResult={aiResult} isAILoading={isAILoading} />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// TAB 4: INITIATIVE & EPIC
// ═══════════════════════════════════════════════════════════

function TabInitiativeEpic({ metrics, defects, aiResult, isAILoading }: { metrics: ChainMetrics; defects: any[]; aiResult: AIResult | null; isAILoading: boolean }) {
  const m = metrics;
  const epicProgress = m.storiesTotal > 0 ? Math.round(m.storiesDone / m.storiesTotal * 100) : 0;

  // Find owners
  const initOwner = m.owners.find(o => o.entityKey === m.initiativeKey);
  const epicOwner = m.owners.find(o => o.entityKey === m.epicKey);

  return (
    <div className="px-7 py-5">
      {/* Initiative */}
      <SectionLabel>INITIATIVE</SectionLabel>
      {m.initiativeKey ? (
        <div className="mb-6">
          <p className="text-[14px] font-[700] mb-0.5" style={{ color: '#0F172A' }}>{m.initiativeKey}: {m.initiativeTitle}</p>
          {initOwner && (
            <p className="text-[13px] mb-1" style={{ color: '#475569' }}>Lead: {initOwner.name} · {initOwner.role}</p>
          )}
          <p className="text-[12px]" style={{ color: '#64748B' }}>
            Linked to: {m.krs.map(k => k.key).join(', ')}
          </p>
        </div>
      ) : (
        <p className="text-[13px] mb-6" style={{ color: '#D97706' }}>
          ⚠ No initiative linked to this chain — execution gap
        </p>
      )}

      {/* Epic */}
      <SectionLabel>EPIC</SectionLabel>
      {m.epicKey ? (
        <div className="mb-5">
          <p className="text-[14px] font-[700] mb-0.5" style={{ color: '#0F172A' }}>{m.epicKey}: {m.epicTitle}</p>
          {epicOwner && (
            <p className="text-[13px] mb-1" style={{ color: '#475569' }}>Owner: {epicOwner.name} · {epicOwner.role}</p>
          )}
          <StatusBanner health={epicProgress >= 70 ? 75 : epicProgress >= 40 ? 50 : 25} label="Epic" detail={`${epicProgress}% complete`} />
        </div>
      ) : (
        <p className="text-[13px] mb-6" style={{ color: '#D97706' }}>
          ⚠ No epic linked — delivery gap
        </p>
      )}

      {/* Story breakdown */}
      {m.storiesTotal > 0 && (
        <>
          <SectionLabel>STORY BREAKDOWN</SectionLabel>
          <div className="mb-5">
            <div className="flex h-3 rounded-full overflow-hidden mb-2">
              {m.storiesInProd > 0 && <div style={{ width: `${m.storiesInProd / m.storiesTotal * 100}%`, background: '#16A34A' }} />}
              {(m.storiesDone - m.storiesInProd) > 0 && <div style={{ width: `${(m.storiesDone - m.storiesInProd) / m.storiesTotal * 100}%`, background: '#86EFAC' }} />}
              {m.storiesInProgress > 0 && <div style={{ width: `${m.storiesInProgress / m.storiesTotal * 100}%`, background: '#2563EB' }} />}
              {m.storiesBlocked > 0 && <div style={{ width: `${m.storiesBlocked / m.storiesTotal * 100}%`, background: '#EF4444' }} />}
              {m.storiesBacklog > 0 && <div style={{ width: `${m.storiesBacklog / m.storiesTotal * 100}%`, background: '#E2E8F0' }} />}
            </div>
            <p className="text-[12px]" style={{ color: '#1E293B' }}>
              {m.storiesInProd > 0 && <><strong>{m.storiesInProd}</strong> in prod · </>}
              {(m.storiesDone - m.storiesInProd) > 0 && <><strong>{m.storiesDone - m.storiesInProd}</strong> done · </>}
              <strong>{m.storiesInProgress}</strong> in progress
              {m.storiesBlocked > 0 && <> · <strong style={{ color: '#EF4444' }}>{m.storiesBlocked} blocked</strong></>}
              {m.storiesBacklog > 0 && <> · {m.storiesBacklog} remaining</>}
            </p>
          </div>
        </>
      )}

      {/* Linkage timeline */}
      {m.strategyToExecutionDays >= 0 && (
        <>
          <SectionLabel>LINKAGE TIMELINE</SectionLabel>
          <div className="mb-5 text-[13px] leading-[1.7]" style={{ color: '#1E293B' }}>
            <p>Strategy → Execution lag: <strong>{m.strategyToExecutionDays} days</strong></p>
            {m.linkageLagDays >= 0 && <p>KR → Initiative linkage: <strong>{m.linkageLagDays} days</strong></p>}
          </div>
        </>
      )}

      <AIInsight aiResult={aiResult} isAILoading={isAILoading} />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// TAB 5: OPERATIONAL
// ═══════════════════════════════════════════════════════════

function TabOperational({ metrics, defects, aiResult, isAILoading }: { metrics: ChainMetrics; defects: any[]; aiResult: AIResult | null; isAILoading: boolean }) {
  const m = metrics;

  return (
    <div className="px-7 py-5">
      {/* Cycle times */}
      {m.storiesTotal > 0 && (
        <>
          <SectionLabel>CYCLE TIMES</SectionLabel>
          <div className="mb-6 text-[13px] leading-[1.7]" style={{ color: '#1E293B' }}>
            {m.epicKey && <p>Epic {m.epicKey} has been open <strong>{m.epicCycleDays} days</strong>.</p>}
            <p>
              Average story takes <strong>{m.avgStoryCycleDays} days</strong>.
              Current velocity: <strong>{m.velocityPerWeek} stories/week</strong>.
              {m.neededVelocity > m.velocityPerWeek ? (
                <> Need <strong style={{ color: '#D97706' }}>{m.neededVelocity}/week</strong> to finish on time.</>
              ) : (
                <strong style={{ color: '#16A34A' }}> On pace.</strong>
              )}
            </p>
          </div>
        </>
      )}

      {/* Defects */}
      <SectionLabel>DEFECTS & INCIDENTS</SectionLabel>
      <div className="mb-6">
        {defects.length === 0 ? (
          <p className="text-[13px]" style={{ color: '#16A34A' }}>✓ No defects or incidents logged</p>
        ) : (
          <div className="space-y-1.5">
            {defects.map((d: any, i: number) => {
              const isOpen = d.status !== 'Done' && d.status !== 'Resolved';
              const sev = d.priority === 'Critical' ? 'P1' : d.priority === 'High' ? 'P2' : 'P3';
              const cycleDays = d.updated_at && d.created_at
                ? Math.round((new Date(d.updated_at).getTime() - new Date(d.created_at).getTime()) / 86400000)
                : null;
              return (
                <div key={i} className="flex items-center gap-3 text-[12px]">
                  <span className="font-[700] w-[24px] shrink-0" style={{ color: isOpen ? '#EF4444' : '#94A3B8' }}>{sev}</span>
                  <span className="flex-1 truncate" style={{ color: '#1E293B' }}>{d.summary || d.title}</span>
                  <span className="shrink-0" style={{ color: isOpen ? '#EF4444' : '#16A34A' }}>{isOpen ? 'Open' : 'Fixed'}</span>
                  {cycleDays !== null && <span className="shrink-0" style={{ color: '#64748B' }}>{cycleDays}d</span>}
                  <span className="shrink-0" style={{ color: '#64748B' }}>{d.assignee?.full_name?.split(' ')[0] || ''}</span>
                </div>
              );
            })}
            {m.avgDefectCycleDays > 0 && (
              <p className="text-[12px] mt-2" style={{ color: '#64748B' }}>
                Avg time to fix: <strong style={{ color: '#1E293B' }}>{m.avgDefectCycleDays} days</strong>
              </p>
            )}
          </div>
        )}
      </div>

      {/* All people */}
      <SectionLabel>ALL PEOPLE IN THIS CHAIN</SectionLabel>
      <div className="mb-6 space-y-1">
        {m.owners.map((o, i) => (
          <div key={i} className="flex items-center gap-3 text-[12px]">
            <span className="flex-1" style={{ color: '#1E293B' }}><strong>{o.name}</strong></span>
            <span className="shrink-0" style={{ color: '#64748B' }}>{o.role}</span>
            <span className="font-mono shrink-0" style={{ color: '#64748B', fontSize: 10 }}>{o.entityKey}</span>
          </div>
        ))}
      </div>

      {/* Scope changes */}
      <SectionLabel>SCOPE CHANGES</SectionLabel>
      <div className="mb-6">
        {m.scopeClean ? (
          <p className="text-[13px]" style={{ color: '#16A34A' }}>✓ No scope changes since kickoff</p>
        ) : (
          <div className="space-y-1.5">
            {m.scopeChanges.map((sc, i) => (
              <p key={i} className="text-[12px]" style={{ color: '#1E293B' }}>
                <span style={{ color: '#D97706', fontWeight: 700 }}>△</span>{' '}
                {new Date(sc.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}: {sc.description} — by {sc.actor}
              </p>
            ))}
          </div>
        )}
      </div>

      <AIInsight aiResult={aiResult} isAILoading={isAILoading} />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// SHARED ATOMS
// ═══════════════════════════════════════════════════════════

function SectionLabel({ children }: { children: string }) {
  return (
    <div className="mb-2.5 mt-1" style={{ fontSize: 12, fontWeight: 700, color: '#1E293B', letterSpacing: '0.04em', textTransform: 'uppercase' as const }}>
      {children}
    </div>
  );
}

function AIInsight({ aiResult, isAILoading }: { aiResult: AIResult | null; isAILoading: boolean }) {
  return (
    <div className="mt-5">
      <div className="flex items-center gap-1.5 mb-2">
        <span style={{ color: '#A78BFA', fontSize: 12 }}>✦</span>
        <span style={{ fontSize: '12px', fontWeight: 700, color: '#475569', letterSpacing: '0.04em', textTransform: 'uppercase' as const }}>AI INSIGHT</span>
      </div>
      {isAILoading ? (
        <div className="space-y-2">
          <div className="h-3.5 rounded animate-pulse" style={{ background: '#F1F5F9', width: '100%' }} />
          <div className="h-3.5 rounded animate-pulse" style={{ background: '#F1F5F9', width: '85%' }} />
          <div className="h-3.5 rounded animate-pulse" style={{ background: '#F1F5F9', width: '60%' }} />
        </div>
      ) : (
        <div className="text-[13px] leading-[1.7]" style={{ color: '#1E293B' }}>
          {aiResult?.verdict && <p className="mb-2">{aiResult.verdict}</p>}
          {aiResult?.riskSignals && aiResult.riskSignals.length > 0 && (
            <div className="space-y-1 mt-3">
              {aiResult.riskSignals.map((signal, i) => {
                const icon = i === 0 ? '🔴' : i === 1 ? '🟡' : '🟢';
                return (
                  <p key={i} className="text-[12px] leading-[1.6]" style={{ color: '#1E293B' }}>
                    <span className="mr-1.5">{icon}</span> {signal}
                  </p>
                );
              })}
            </div>
          )}
          {!aiResult?.verdict && !isAILoading && (
            <p className="italic" style={{ color: '#94A3B8' }}>No AI analysis available</p>
          )}
        </div>
      )}
    </div>
  );
}

export default AIStrategyIntelligencePanel;
