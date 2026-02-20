import React, { useRef, useEffect, useState } from "react";
import { X, Sparkles, RefreshCw, Copy } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { ChainMetrics } from "@/utils/computeChainMetrics";
import type { AIResult } from "@/utils/generateIntelligence";
import { catalystToast } from "@/lib/catalystToast";

interface LockedChainData {
  theme: { key: string; name: string; status: string; progress: number };
  goal: { key: string; title: string; status: string; progress: number; health?: number };
  krs: { key: string; title: string; status: string; progress: number }[];
  initiative: { key: string; title: string; status: string; progress: number } | null;
  epic: { key: string; title: string; status: string } | null;
}

interface AIStrategyIntelligencePanelProps {
  isOpen: boolean;
  metrics: ChainMetrics | null;
  defects: any[];
  stories: any[];
  aiResult: AIResult | null;
  isAILoading: boolean;
  onClose: () => void;
  onRegenerate: () => void;
  // Executive Brief props
  briefContent?: string;
  isBriefGenerating?: boolean;
  briefError?: string | null;
  lockedChain?: LockedChainData | null;
  onRegenerateBrief?: () => void;
}

const TABS = [
  { id: 'brief', label: 'Executive Brief' },
  { id: 'strategy', label: 'Strategy' },
  { id: 'initiatives', label: 'Initiatives' },
  { id: 'epics', label: 'Epics & Stories' },
  { id: 'operations', label: 'Operations' },
] as const;

type TabId = typeof TABS[number]['id'];

export function AIStrategyIntelligencePanel({
  isOpen, metrics, defects, stories, aiResult, isAILoading, onClose, onRegenerate,
  briefContent, isBriefGenerating, briefError, lockedChain, onRegenerateBrief,
}: AIStrategyIntelligencePanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<TabId>('brief');

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

  useEffect(() => { setActiveTab('brief'); }, [metrics?.goalKey]);

  if (!metrics) return null;

  const LEVEL_COLORS = [
    { bg: '#DBEAFE', text: '#1E40AF', border: '#93C5FD' },
    { bg: '#CCFBF1', text: '#115E59', border: '#5EEAD4' },
    { bg: '#DBEAFE', text: '#1E40AF', border: '#93C5FD' },
    { bg: '#FEF3C7', text: '#92400E', border: '#FDE68A' },
    { bg: '#EDE9FE', text: '#5B21B6', border: '#C4B5FD' },
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
      <div className="h-[2px] w-full shrink-0" style={{ background: 'linear-gradient(90deg, #7C3AED 0%, #A78BFA 50%, #7C3AED 100%)' }} />

      <div className="px-7 pt-4 pb-0 shrink-0">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg, #7C3AED, #6D28D9)' }}>
              <Sparkles size={16} className="text-white" />
            </div>
            <h2 className="text-[15px] font-[700]" style={{ color: '#0F172A' }}>Strategy Intelligence</h2>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-md transition-colors">
            <X size={18} className="text-slate-400" />
          </button>
        </div>

        {/* Chain breadcrumb */}
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
              {tab.label}
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-0 right-0 h-[2px]" style={{ background: '#2563EB' }} />
              )}
            </button>
          ))}
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto" style={{ scrollBehavior: 'smooth' }}>
        {activeTab === 'brief' && (
          <ExecutiveBriefTab
            lockedChain={lockedChain || null}
            briefContent={briefContent || ''}
            isBriefGenerating={isBriefGenerating || false}
            briefError={briefError || null}
            onRegenerate={onRegenerateBrief}
            metrics={metrics}
          />
        )}
        {activeTab === 'strategy' && <StrategyTab metrics={metrics} aiResult={aiResult} isAILoading={isAILoading} />}
        {activeTab === 'initiatives' && <InitiativesTab metrics={metrics} aiResult={aiResult} isAILoading={isAILoading} />}
        {activeTab === 'epics' && <EpicsStoriesTab metrics={metrics} stories={stories} aiResult={aiResult} isAILoading={isAILoading} />}
        {activeTab === 'operations' && <OperationsTab metrics={metrics} defects={defects} aiResult={aiResult} isAILoading={isAILoading} />}
      </div>

      <div className="shrink-0 border-t px-7 py-2.5 flex items-center justify-between" style={{ borderColor: '#F1F5F9' }}>
        <div className="flex items-center gap-1.5 text-[10px]" style={{ color: '#94A3B8' }}>
          <span style={{ color: '#A78BFA' }}>✦</span> AI · {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onRegenerate} disabled={isAILoading} className="px-3 py-1 rounded transition-colors disabled:opacity-50" style={{ fontSize: 11, fontWeight: 500, color: '#64748B' }}>
            Regenerate
          </button>
          <button onClick={onClose} className="px-3.5 py-1 rounded-md transition-colors" style={{ fontSize: 11, fontWeight: 600, color: '#FFFFFF', background: '#1E293B' }}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// SHARED COMPONENTS
// ═══════════════════════════════════════════════════════════

function StatusBanner({ status, health, confidence, label }: {
  status: 'on_track' | 'at_risk' | 'critical';
  health?: number; confidence?: number; label?: string;
}) {
  const config = {
    on_track: { text: 'ON TRACK', color: '#16A34A' },
    at_risk:  { text: 'AT RISK',  color: '#D97706' },
    critical: { text: 'CRITICAL', color: '#EF4444' },
  }[status];

  return (
    <div className="p-4 bg-white border border-slate-200 rounded-lg mb-5"
      style={{ borderLeftWidth: 4, borderLeftColor: config.color }}>
      <div className="flex items-center gap-2.5">
        <div className="w-2 h-2 rounded-full" style={{ background: config.color }} />
        <span className="text-[14px] font-[800] text-slate-900">{config.text}</span>
        {health !== undefined && (
          <span className="text-[13px] text-slate-600 ml-2">
            Health {health}/100{confidence !== undefined ? ` · Confidence ${confidence}%` : ''}
          </span>
        )}
        {label && <span className="text-[13px] text-slate-600 ml-2">{label}</span>}
      </div>
    </div>
  );
}

function StatusDot({ status }: { status: 'on_track' | 'at_risk' | 'critical' }) {
  const color = status === 'on_track' ? '#16A34A' : status === 'at_risk' ? '#D97706' : '#EF4444';
  return <div className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />;
}

function SectionLabel({ children }: { children: string }) {
  return (
    <div className="mb-2.5 mt-1" style={{ fontSize: 12, fontWeight: 700, color: '#1E293B', letterSpacing: '0.04em', textTransform: 'uppercase' as const }}>
      {children}
    </div>
  );
}

function AIInsight({ text, signals, isLoading, showSignals = false }: {
  text: string | null | undefined; signals?: string[]; isLoading: boolean; showSignals?: boolean;
}) {
  return (
    <div className="mt-5">
      <div className="flex items-center gap-1.5 mb-2">
        <span className="text-purple-500 text-[11px]">✦</span>
        <span className="text-[12px] font-[700] text-slate-700 uppercase tracking-wider">AI Insight</span>
      </div>
      {isLoading ? (
        <div className="space-y-2">
          <div className="h-3.5 w-full bg-slate-100 rounded animate-pulse" />
          <div className="h-3.5 w-4/5 bg-slate-100 rounded animate-pulse" />
        </div>
      ) : (
        <>
          <p className="text-[13px] text-slate-800 leading-[1.7]">{text || 'No insight available.'}</p>
          {showSignals && signals && signals.length > 0 && (
            <div className="mt-3 space-y-1.5">
              {signals.map((s, i) => (
                <p key={i} className="text-[12px] text-slate-700 leading-relaxed">
                  <span className="mr-1.5">{i === 0 ? '🔴' : i === 1 ? '🟡' : '🟢'}</span> {s}
                </p>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function ChainHealthBars({ metrics }: { metrics: ChainMetrics }) {
  const krAvg = metrics.krs.length > 0 ? Math.round(metrics.krs.reduce((s, k) => s + k.progress, 0) / metrics.krs.length) : 0;
  const epicProgress = metrics.storiesTotal > 0 ? Math.round(metrics.storiesDone / metrics.storiesTotal * 100) : 0;

  const levels = [
    { label: 'Strategic Theme', progress: metrics.goalProgress },
    { label: 'Goal', progress: metrics.goalProgress },
    { label: 'Key Results avg', progress: krAvg },
    ...(metrics.initiativeKey ? [{ label: 'Initiative', progress: 60 }] : []),
    ...(metrics.epicKey ? [{ label: 'Epic', progress: epicProgress }] : []),
  ];

  return (
    <div className="space-y-2">
      {levels.map((lvl, i) => {
        const status: 'on_track' | 'at_risk' | 'critical' = lvl.progress >= 70 ? 'on_track' : lvl.progress >= 40 ? 'at_risk' : 'critical';
        return (
          <div key={i} className="flex items-center gap-3">
            <span className="text-[12px] text-slate-700 w-[110px] shrink-0">{lvl.label}</span>
            <div className="flex-1 h-[6px] bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full rounded-full bg-blue-600" style={{ width: `${lvl.progress}%`, transition: 'width 0.8s ease' }} />
            </div>
            <span className="text-[12px] font-bold text-slate-800 w-[40px] text-right shrink-0">{lvl.progress}%</span>
            <StatusDot status={status} />
          </div>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// TAB 0: EXECUTIVE BRIEF (moved from ThemeAlignmentView)
// ═══════════════════════════════════════════════════════════

function ExecutiveBriefTab({ lockedChain, briefContent, isBriefGenerating, briefError, onRegenerate, metrics }: {
  lockedChain: LockedChainData | null;
  briefContent: string;
  isBriefGenerating: boolean;
  briefError: string | null;
  onRegenerate?: () => void;
  metrics: ChainMetrics | null;
}) {
  const goalProgress = lockedChain?.goal?.progress || metrics?.goalProgress || 0;
  const goalHealth = lockedChain?.goal?.health || metrics?.goalHealth || 0;
  const krCount = lockedChain?.krs?.length || metrics?.krs?.length || 0;
  const krsOnTrack = lockedChain?.krs?.filter(k => k.status === 'on_track' || k.status === 'active').length || 0;
  const themeName = lockedChain?.theme?.name || metrics?.themeName || '';

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      catalystToast.success('Copied', 'Executive brief copied to clipboard.');
    });
  };

  return (
    <div className="px-7 py-5">
      {/* At-a-Glance Metrics */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="border border-slate-200 rounded-lg p-3.5">
          <p className="uppercase tracking-wider font-semibold text-slate-500 mb-1" style={{ fontSize: 10 }}>Goal Progress</p>
          <p className="font-bold leading-none" style={{ fontSize: 20, color: goalProgress >= 60 ? '#16A34A' : goalProgress >= 40 ? '#D97706' : '#EF4444' }}>
            {goalProgress}%
          </p>
        </div>
        <div className="border border-slate-200 rounded-lg p-3.5">
          <p className="uppercase tracking-wider font-semibold text-slate-500 mb-1" style={{ fontSize: 10 }}>AI Health</p>
          <p className="font-bold leading-none" style={{ fontSize: 20, color: '#7C3AED' }}>
            {goalHealth}/100
          </p>
        </div>
        <div className="border border-slate-200 rounded-lg p-3.5">
          <p className="uppercase tracking-wider font-semibold text-slate-500 mb-1" style={{ fontSize: 10 }}>Key Results</p>
          <p className="font-bold leading-none" style={{ fontSize: 20, color: '#0D9488' }}>
            {krCount}
          </p>
          <p className="text-slate-500 mt-0.5" style={{ fontSize: 10 }}>{krsOnTrack} on track</p>
        </div>
      </div>

      {/* Brief Content */}
      {isBriefGenerating && !briefContent ? (
        <div className="space-y-6">
          {[1, 2, 3, 4].map(section => (
            <div key={section}>
              <div className="h-3 w-40 bg-slate-100 rounded-full animate-pulse mb-4" />
              <div className="space-y-2.5">
                <div className="h-2.5 w-full bg-slate-50 rounded-full animate-pulse" />
                <div className="h-2.5 bg-slate-50 rounded-full animate-pulse" style={{ width: '90%' }} />
                <div className="h-2.5 bg-slate-50 rounded-full animate-pulse" style={{ width: '75%' }} />
              </div>
            </div>
          ))}
        </div>
      ) : briefError ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="flex items-center justify-center rounded-xl mb-4"
            style={{ width: 48, height: 48, background: '#FFFBEB' }}>
            <X size={20} style={{ color: '#D97706' }} />
          </div>
          <p className="font-semibold text-slate-900 mb-1" style={{ fontSize: 15 }}>Briefing Unavailable</p>
          <p className="text-slate-500" style={{ fontSize: 13, maxWidth: 300 }}>{briefError}</p>
          {onRegenerate && (
            <button onClick={onRegenerate} className="mt-4 px-3 py-1.5 rounded-md border border-slate-200 text-[12px] font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-1.5">
              <RefreshCw size={14} /> Retry
            </button>
          )}
        </div>
      ) : briefContent ? (
        <>
          <ReactMarkdown
            components={{
              h2: ({ children }) => (
                <h2 className="font-bold tracking-tight mt-8 mb-3 pb-2 border-b border-slate-100 first:mt-0 text-slate-900"
                  style={{ fontSize: 15 }}>
                  {children}
                </h2>
              ),
              p: ({ children }) => (
                <p className="mb-4 text-slate-600" style={{ fontSize: 14, lineHeight: 1.8 }}>{children}</p>
              ),
              strong: ({ children }) => (
                <strong className="font-semibold text-slate-900">{children}</strong>
              ),
              ul: ({ children }) => (
                <ul className="my-3 space-y-1.5">{children}</ul>
              ),
              li: ({ children }) => (
                <li className="pl-1 text-slate-600" style={{ fontSize: 13, lineHeight: 1.6 }}>
                  <span className="mr-2 text-slate-400">•</span>{children}
                </li>
              ),
            }}
          >
            {briefContent}
          </ReactMarkdown>
          {isBriefGenerating && (
            <div className="flex items-center gap-2 mt-4" style={{ color: '#7C3AED', fontSize: 12 }}>
              <Sparkles size={14} className="animate-pulse" />
              <span className="font-medium">Generating…</span>
            </div>
          )}
          <div className="flex items-center gap-2 mt-5">
            {onRegenerate && (
              <button onClick={onRegenerate} disabled={isBriefGenerating}
                className="px-3 py-1.5 rounded-md text-[11px] font-medium text-slate-600 hover:bg-slate-100 flex items-center gap-1.5 disabled:opacity-50">
                <RefreshCw size={13} /> Regenerate
              </button>
            )}
            <button onClick={() => copyToClipboard(briefContent)} disabled={!briefContent}
              className="px-3 py-1.5 rounded-md text-[11px] font-medium text-slate-600 hover:bg-slate-100 flex items-center gap-1.5 disabled:opacity-50">
              <Copy size={13} /> Copy
            </button>
          </div>
        </>
      ) : (
        <div className="py-12 text-center">
          <Sparkles size={24} className="mx-auto mb-3 text-slate-300" />
          <p className="text-[13px] text-slate-500">Click a strategy chain node to generate an executive brief.</p>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// TAB 1: STRATEGY
// ═══════════════════════════════════════════════════════════

function StrategyTab({ metrics, aiResult, isAILoading }: { metrics: ChainMetrics; aiResult: AIResult | null; isAILoading: boolean }) {
  const m = metrics;
  const overallStatus: 'on_track' | 'at_risk' | 'critical' = m.goalHealth >= 70 ? 'on_track' : m.goalHealth >= 45 ? 'at_risk' : 'critical';
  const goalDue = m.goalTarget ? new Date(m.goalTarget).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

  return (
    <div className="px-7 py-5">
      <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Strategic Theme</div>
      <h3 className="text-[17px] font-[800] text-slate-900 mb-1">{m.themeName}</h3>
      <p className="text-[12px] text-slate-600 mb-5">
        Owner: {m.owners.find(o => o.level === 'Strategic')?.name || '—'} · {m.owners.find(o => o.level === 'Strategic')?.role || ''}
      </p>

      <StatusBanner status={overallStatus} health={m.goalHealth} confidence={m.confidencePct} />

      <div className="mt-6 mb-6">
        <SectionLabel>Chain Health at Each Level</SectionLabel>
        <ChainHealthBars metrics={m} />
      </div>

      {/* Goal Section */}
      <div className="mb-6">
        <SectionLabel>Goal</SectionLabel>
        <div className="text-[14px] font-[700] text-slate-900 mb-1">{m.goalKey}: {m.goalTitle}</div>
        <p className="text-[12px] text-slate-600 mb-3">
          Due: <strong>{goalDue}</strong>
          {' · '}Progress: <strong>{m.goalProgress}%</strong>
          {' · '}Schedule: <strong className={m.scheduleDriftDays >= 0 ? 'text-green-700' : 'text-red-600'}>
            {m.scheduleDriftDays >= 0 ? `${m.scheduleDriftDays} days ahead` : `${Math.abs(m.scheduleDriftDays)} days behind`}
          </strong>
        </p>
      </div>

      {/* Key Results Table */}
      <div className="mb-6">
        <SectionLabel>{`Key Results (${m.krs.length})`}</SectionLabel>
        <div className="space-y-2">
          {m.krs.map((kr, i) => {
            const pct = kr.target > 0 ? Math.min(100, Math.round(kr.current / kr.target * 100)) : kr.progress;
            const status: 'on_track' | 'at_risk' | 'critical' = (kr.status === 'At Risk' || kr.status === 'Off Track') ? 'at_risk' : pct >= 70 ? 'on_track' : 'at_risk';
            return (
              <div key={i} className="flex items-center gap-3">
                <span className="text-[10px] font-bold font-mono text-slate-600 w-[48px] shrink-0">{kr.key}</span>
                <span className="text-[12px] text-slate-800 flex-1 truncate">{kr.title}</span>
                <div className="w-[80px] h-[5px] bg-slate-100 rounded-full overflow-hidden shrink-0">
                  <div className="h-full rounded-full bg-blue-600" style={{ width: `${pct}%` }} />
                </div>
                <span className="text-[11px] font-bold text-slate-700 w-[52px] text-right shrink-0">{kr.current}/{kr.target}</span>
                <span className="text-[11px] font-bold text-slate-700 w-[36px] text-right shrink-0">{pct}%</span>
                <StatusDot status={status} />
              </div>
            );
          })}
        </div>
      </div>

      {/* Schedule + Delivery cards */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="border border-slate-200 rounded-lg p-3.5">
          <SectionLabel>Schedule</SectionLabel>
          <p className="text-[24px] font-[800] leading-none text-slate-900">
            {m.scheduleDriftDays > 0 ? '+' : ''}{m.scheduleDriftDays}
            <span className="text-[13px] font-[500] ml-1">{m.scheduleDriftDays >= 0 ? 'days ahead' : 'days behind'}</span>
          </p>
          <p className="text-[12px] mt-1.5 text-slate-500">Due: {goalDue}</p>
        </div>
        <div className="border border-slate-200 rounded-lg p-3.5">
          <SectionLabel>Delivery</SectionLabel>
          <p className="text-[24px] font-[800] leading-none text-slate-900">
            {m.storiesDone}<span className="text-[13px] font-[500] ml-1">of {m.storiesTotal} done</span>
          </p>
          <p className="text-[12px] mt-1.5 text-slate-500">{m.storiesInProd} in production</p>
        </div>
      </div>

      <AIInsight
        text={aiResult?.strategyInsight}
        signals={aiResult?.riskSignals}
        isLoading={isAILoading}
        showSignals={true}
      />

      <div className="mt-5">
        <SectionLabel>Key People</SectionLabel>
        <div className="space-y-1">
          {m.owners.slice(0, 3).map((o, i) => (
            <p key={i} className="text-[13px] text-slate-800">
              <strong>{o.name}</strong><span className="text-slate-500"> · {o.role}</span>
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// TAB 2: INITIATIVES
// ═══════════════════════════════════════════════════════════

function InitiativesTab({ metrics, aiResult, isAILoading }: { metrics: ChainMetrics; aiResult: AIResult | null; isAILoading: boolean }) {
  const m = metrics;
  const hasInitiative = !!m.initiativeKey;

  return (
    <div className="px-7 py-5">
      <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Initiative</div>

      {hasInitiative ? (
        <>
          <h3 className="text-[17px] font-[800] text-slate-900 mb-1">{m.initiativeKey}: {m.initiativeTitle}</h3>
          <p className="text-[12px] text-slate-600 mb-4">
            Lead: {m.owners.find(o => o.level === 'Delivery')?.name || '—'} · {m.owners.find(o => o.level === 'Delivery')?.role || ''}
          </p>

          <StatusBanner
            status={m.weakestNode.key === m.initiativeKey ? 'at_risk' : 'on_track'}
            label="In Progress"
          />

          <div className="mt-5 mb-5">
            <SectionLabel>Linked to Key Results</SectionLabel>
            {m.krs.map((kr, i) => (
              <div key={i} className="flex items-center gap-2 py-1.5 text-[12px]">
                <span className="font-mono font-bold text-slate-600">{kr.key}</span>
                <span className="text-slate-700 flex-1">{kr.title}</span>
                <span className="ml-auto font-bold text-slate-800">{kr.progress}%</span>
              </div>
            ))}
          </div>

          <div className="mb-5">
            <SectionLabel>Linkage Timeline</SectionLabel>
            <div className="text-[12px] text-slate-700 leading-relaxed">
              <p>
                Strategy-to-execution lag: <strong>
                  {m.strategyToExecutionDays > 0 ? `${m.strategyToExecutionDays} days` : 'Not calculated'}
                </strong> from theme creation to epic creation.
              </p>
              {m.linkageLagDays > 0 && (
                <p className="mt-1">KR-to-initiative linkage lag: <strong>{m.linkageLagDays} days</strong>.</p>
              )}
            </div>
          </div>
        </>
      ) : (
        <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-[13px] font-bold text-amber-800">⚠ No initiative linked</p>
          <p className="text-[12px] text-amber-700 mt-1">
            This chain has no initiative connecting the Key Results to execution. Create an initiative in ProductHub and link it to the KRs.
          </p>
        </div>
      )}

      <AIInsight text={aiResult?.initiativeInsight} isLoading={isAILoading} />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// TAB 3: EPICS & STORIES
// ═══════════════════════════════════════════════════════════

function EpicsStoriesTab({ metrics, stories, aiResult, isAILoading }: { metrics: ChainMetrics; stories: any[]; aiResult: AIResult | null; isAILoading: boolean }) {
  const m = metrics;
  const hasEpic = !!m.epicKey;

  return (
    <div className="px-7 py-5">
      <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Epic</div>

      {hasEpic ? (
        <>
          <h3 className="text-[17px] font-[800] text-slate-900 mb-1">{m.epicKey}: {m.epicTitle}</h3>
          <p className="text-[12px] text-slate-600 mb-4">
            Owner: {m.owners.find(o => o.level === 'Execution')?.name || '—'} · {m.owners.find(o => o.level === 'Execution')?.role || ''}
          </p>

          <StatusBanner
            status={m.storiesDone / Math.max(1, m.storiesTotal) >= 0.5 ? 'on_track' : 'at_risk'}
            label={`${m.storiesDone} of ${m.storiesTotal} stories done`}
          />

          {/* Story Pipeline Bar */}
          <div className="mt-5 mb-5">
            <SectionLabel>Story Pipeline</SectionLabel>
            {m.storiesTotal > 0 ? (
              <>
                <div className="flex h-3 rounded-full overflow-hidden mb-2">
                  {m.storiesInProd > 0 && <div style={{ width: `${m.storiesInProd / m.storiesTotal * 100}%`, background: '#16A34A' }} />}
                  {(m.storiesDone - m.storiesInProd) > 0 && <div style={{ width: `${(m.storiesDone - m.storiesInProd) / m.storiesTotal * 100}%`, background: '#86EFAC' }} />}
                  {m.storiesInProgress > 0 && <div style={{ width: `${m.storiesInProgress / m.storiesTotal * 100}%`, background: '#2563EB' }} />}
                  {m.storiesBlocked > 0 && <div style={{ width: `${m.storiesBlocked / m.storiesTotal * 100}%`, background: '#EF4444' }} />}
                  {m.storiesBacklog > 0 && <div style={{ width: `${m.storiesBacklog / m.storiesTotal * 100}%`, background: '#E2E8F0' }} />}
                </div>
                <p className="text-[12px] text-slate-700">
                  <strong>{m.storiesInProd}</strong> in production · <strong>{m.storiesInProgress}</strong> in progress
                  {m.storiesBlocked > 0 && <> · <strong className="text-red-600">{m.storiesBlocked} blocked</strong></>}
                  {m.storiesBacklog > 0 && <> · <strong>{m.storiesBacklog}</strong> remaining</>}
                </p>
              </>
            ) : (
              <p className="text-[12px] text-slate-500">No stories found under this epic.</p>
            )}
          </div>

          {/* Cycle Times */}
          <div className="mb-5">
            <SectionLabel>Cycle Times</SectionLabel>
            <p className="text-[12px] text-slate-700 leading-relaxed">
              Epic has been open <strong>{m.epicCycleDays} days</strong>.
              {m.avgStoryCycleDays > 0 && <> Average story takes <strong>{m.avgStoryCycleDays} days</strong> from backlog to done.</>}
              {' '}Current velocity: <strong>{m.velocityPerWeek} stories/week</strong>.
              {m.neededVelocity > m.velocityPerWeek && (
                <span className="text-amber-600"> Need {m.neededVelocity}/week to finish on time.</span>
              )}
            </p>
          </div>

          {/* Story Table */}
          {stories && stories.length > 0 && (
            <div className="mb-5">
              <SectionLabel>{`Stories (${stories.length})`}</SectionLabel>
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-[11px]">
                  <thead>
                    <tr className="bg-slate-50 text-slate-600 uppercase tracking-wider">
                      <th className="text-left px-3 py-2 font-bold">Key</th>
                      <th className="text-left px-3 py-2 font-bold">Title</th>
                      <th className="text-left px-3 py-2 font-bold">Status</th>
                      <th className="text-left px-3 py-2 font-bold">Assignee</th>
                      <th className="text-right px-3 py-2 font-bold">Days</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stories.map((s: any, i: number) => (
                      <tr key={i} className="border-t border-slate-100">
                        <td className="px-3 py-2 font-mono font-bold text-slate-600">{s.story_key}</td>
                        <td className="px-3 py-2 text-slate-800 truncate max-w-[160px]">{s.story_title}</td>
                        <td className="px-3 py-2">
                          <span className={`font-semibold ${
                            s.story_status === 'Done' ? 'text-green-700'
                            : s.story_status === 'In Progress' ? 'text-blue-600'
                            : s.story_status === 'Blocked' ? 'text-red-600'
                            : 'text-slate-500'
                          }`}>{s.story_status}</span>
                        </td>
                        <td className="px-3 py-2 text-slate-600">{s.assignee_name?.split(' ')[0] || '—'}</td>
                        <td className="px-3 py-2 text-right font-bold text-slate-700">
                          {s.cycle_days ? `${Math.round(s.cycle_days)}d` : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-[13px] font-bold text-amber-800">⚠ No epic linked — delivery gap</p>
          <p className="text-[12px] text-amber-700 mt-1">
            This chain has no epic connecting the initiative to stories. Without an epic, there is no delivery pipeline to measure.
          </p>
        </div>
      )}

      <AIInsight text={aiResult?.epicInsight} isLoading={isAILoading} />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// TAB 4: OPERATIONS
// ═══════════════════════════════════════════════════════════

function OperationsTab({ metrics, defects, aiResult, isAILoading }: { metrics: ChainMetrics; defects: any[]; aiResult: AIResult | null; isAILoading: boolean }) {
  const m = metrics;

  return (
    <div className="px-7 py-5">
      {/* Defects & Incidents */}
      <div className="mb-6">
        <SectionLabel>Defects & Incidents</SectionLabel>
        {defects.length === 0 ? (
          <p className="text-[12px] text-green-700">✓ No defects or incidents logged against this chain.</p>
        ) : (
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="bg-slate-50 text-slate-600 uppercase tracking-wider">
                  <th className="text-left px-3 py-2 font-bold">Sev</th>
                  <th className="text-left px-3 py-2 font-bold">Key</th>
                  <th className="text-left px-3 py-2 font-bold">Title</th>
                  <th className="text-left px-3 py-2 font-bold">Status</th>
                  <th className="text-left px-3 py-2 font-bold">Assignee</th>
                  <th className="text-right px-3 py-2 font-bold">Cycle</th>
                </tr>
              </thead>
              <tbody>
                {defects.map((d: any, i: number) => {
                  const isOpen = d.status !== 'Done' && d.status !== 'Resolved';
                  const cycle = d.updated_at && d.created_at
                    ? Math.round((new Date(d.updated_at).getTime() - new Date(d.created_at).getTime()) / 86400000)
                    : null;
                  return (
                    <tr key={i} className={`border-t border-slate-100 ${isOpen ? 'bg-red-50/30' : ''}`}>
                      <td className="px-3 py-2 font-bold text-slate-700">
                        {d.priority === 'Critical' ? 'P1' : d.priority === 'High' ? 'P2' : 'P3'}
                      </td>
                      <td className="px-3 py-2 font-mono text-slate-600">{d.item_key}</td>
                      <td className="px-3 py-2 text-slate-800 truncate max-w-[140px]">{d.summary || d.title}</td>
                      <td className="px-3 py-2">
                        <span className={isOpen ? 'text-red-600 font-semibold' : 'text-green-700'}>
                          {isOpen ? 'Open' : 'Resolved'}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-slate-600">{d.assignee?.full_name?.split(' ')[0] || '—'}</td>
                      <td className="px-3 py-2 text-right font-bold text-slate-700">
                        {cycle !== null ? `${cycle}d` : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {defects.length > 0 && m.avgDefectCycleDays > 0 && (
          <p className="text-[12px] text-slate-600 mt-2">
            Average time to resolve: <strong>{m.avgDefectCycleDays} days</strong>.
          </p>
        )}
      </div>

      {/* All People */}
      <div className="mb-6">
        <SectionLabel>All People in This Chain</SectionLabel>
        <div className="space-y-0">
          {m.owners.map((owner, i) => (
            <div key={i} className="flex items-center gap-3 py-2 border-b border-slate-50 last:border-0">
              <span className="text-[13px] font-semibold text-slate-800 flex-1">{owner.name}</span>
              <span className="text-[11px] text-slate-500">{owner.role}</span>
              <span className="text-[10px] font-mono text-slate-400">{owner.entityKey}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Scope Changes */}
      <div className="mb-6">
        <SectionLabel>Scope Changes</SectionLabel>
        {m.scopeClean ? (
          <p className="text-[12px] text-green-700">✓ No scope changes since kickoff.</p>
        ) : (
          <div className="space-y-2">
            {m.scopeChanges.map((sc, i) => (
              <p key={i} className="text-[12px] text-slate-700">
                <strong className="text-amber-700">△</strong> {sc.description}
                — added by <strong>{sc.actor}</strong> on {new Date(sc.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </p>
            ))}
          </div>
        )}
      </div>

      {/* Velocity Summary */}
      {m.storiesTotal > 0 && (
        <div className="mb-6">
          <SectionLabel>Velocity</SectionLabel>
          <p className="text-[12px] text-slate-700 leading-relaxed">
            Current: <strong>{m.velocityPerWeek} stories/week</strong>.
            Required: <strong>{m.neededVelocity}/week</strong>.
            {m.velocityPerWeek >= m.neededVelocity
              ? <span className="text-green-700"> On pace.</span>
              : <span className="text-amber-600"> Below target — needs acceleration.</span>}
          </p>
        </div>
      )}

      <AIInsight text={aiResult?.operationsInsight} isLoading={isAILoading} />
    </div>
  );
}

export default AIStrategyIntelligencePanel;
