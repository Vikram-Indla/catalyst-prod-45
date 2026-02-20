import React, { useRef, useEffect } from "react";
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

export function AIStrategyIntelligencePanel({
  isOpen, metrics, defects, aiResult, isAILoading, onClose, onRegenerate,
}: AIStrategyIntelligencePanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current && metrics) {
      scrollRef.current.scrollTop = 0;
    }
  }, [metrics?.goalKey]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && isOpen) onClose();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!metrics) return null;

  const chainSubtitle = [
    metrics.themeName,
    metrics.goalTitle && metrics.goalTitle.length > 30
      ? metrics.goalTitle.substring(0, 30) + '...'
      : metrics.goalTitle,
    `${metrics.krs.length} KRs`,
    metrics.epicKey || undefined,
  ].filter(Boolean).join(' → ');

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
      <div className="px-7 py-4 border-b border-slate-100 shrink-0">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg, #7C3AED, #6D28D9)' }}>
              <Sparkles size={16} className="text-white" />
            </div>
            <div>
              <h2 className="text-[15px] font-[700] text-slate-900">Strategy Intelligence</h2>
              <p className="text-[11px] text-slate-500 mt-0.5 truncate max-w-[360px]">{chainSubtitle}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-md transition-colors">
            <X size={18} className="text-slate-400" />
          </button>
        </div>
      </div>

      {/* Scrollable body */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto" style={{ scrollBehavior: 'smooth' }}>
        <PanelBody metrics={metrics} defects={defects} aiResult={aiResult} isAILoading={isAILoading} />
      </div>

      {/* Footer */}
      <div className="shrink-0 border-t border-slate-100 px-7 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
          <span className="text-purple-400">✦</span> AI · {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onRegenerate}
            disabled={isAILoading}
            className="px-3 py-1 text-[11px] font-medium text-slate-500 hover:text-slate-800 rounded transition-colors disabled:opacity-50"
          >
            Regenerate
          </button>
          <button
            onClick={onClose}
            className="px-3.5 py-1 text-[11px] font-semibold text-white bg-slate-800 hover:bg-slate-700 rounded-md transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════
// PANEL BODY — McKinsey 1-3-10 layout
// ═══════════════════════════════════════════

function PanelBody({ metrics, defects, aiResult, isAILoading }: {
  metrics: ChainMetrics; defects: any[];
  aiResult: AIResult | null; isAILoading: boolean;
}) {
  const overallStatus = metrics.goalHealth >= 70 ? 'on_track'
    : metrics.goalHealth >= 45 ? 'at_risk' : 'critical';

  const statusConfig = {
    on_track: { label: 'ON TRACK', bg: '#F0FDF4', border: '#BBF7D0', text: '#166534', dot: '#16A34A' },
    at_risk:  { label: 'AT RISK',  bg: '#FFFBEB', border: '#FDE68A', text: '#92400E', dot: '#D97706' },
    critical: { label: 'CRITICAL', bg: '#FEF2F2', border: '#FECACA', text: '#991B1B', dot: '#EF4444' },
  }[overallStatus];

  return (
    <div className="px-7 py-5">

      {/* ═══ THE BANNER — 1 second read ═══ */}
      <div className="rounded-xl p-5 mb-6" style={{ background: statusConfig.bg, border: `1px solid ${statusConfig.border}` }}>
        <div className="flex items-center gap-2.5 mb-3">
          <div className="w-2.5 h-2.5 rounded-full" style={{ background: statusConfig.dot }} />
          <span className="text-[14px] font-[800] tracking-wide" style={{ color: statusConfig.text }}>
            {statusConfig.label}
          </span>
          <span className="text-[13px] text-slate-500 ml-2">
            Health {metrics.goalHealth}/100 · Confidence {metrics.confidencePct}%
          </span>
        </div>

        {isAILoading ? (
          <div className="space-y-2">
            <div className="h-3.5 bg-white/50 rounded animate-pulse w-full" />
            <div className="h-3.5 bg-white/50 rounded animate-pulse w-3/4" />
          </div>
        ) : (
          <p className="text-[13px] leading-[1.65]" style={{ color: '#1E293B' }}>
            {aiResult?.verdict || 'Generating analysis...'}
          </p>
        )}
        <div className="flex items-center gap-1 mt-2.5 text-[10px] text-slate-400">
          <span className="text-purple-400">✦</span> AI analysis
        </div>
      </div>

      {/* ═══ THREE NUMBERS — 3 second read ═══ */}
      <div className="grid grid-cols-3 gap-3 mb-7">
        <NumberCard
          value={`${metrics.goalProgress}%`}
          label="Goal progress"
          color={getProgressColor(metrics.goalProgress)}
        />
        <NumberCard
          value={`${metrics.storiesDone}/${metrics.storiesTotal}`}
          label="Stories done"
          color={metrics.storiesTotal > 0 ? '#2563EB' : '#94A3B8'}
        />
        <NumberCard
          value={metrics.scheduleDriftDays > 0 ? `+${metrics.scheduleDriftDays}d` : `${metrics.scheduleDriftDays}d`}
          label={metrics.scheduleDriftDays >= 0 ? 'Ahead' : 'Behind'}
          color={metrics.scheduleDriftDays >= 0 ? '#16A34A' : '#EF4444'}
        />
      </div>

      {/* ═══ PROGRESS BY LEVEL ═══ */}
      <SectionLabel>Progress by level</SectionLabel>
      <div className="space-y-2 mb-7">
        <ProgressRow keyLabel={metrics.themeKey} name={metrics.themeName} progress={metrics.goalProgress} color="#2563EB" />
        <ProgressRow keyLabel={metrics.goalKey} name={metrics.goalTitle} progress={metrics.goalProgress} color="#0D9488" />
        {metrics.krs.map((kr, i) => (
          <ProgressRow
            key={i}
            keyLabel={kr.key}
            name={kr.title}
            progress={kr.progress}
            color="#2563EB"
            flag={kr.status === 'At Risk' || kr.status === 'Off Track' ? '⚠' : kr.progress >= 80 ? '✓' : undefined}
          />
        ))}
        {metrics.initiativeKey && (
          <ProgressRow keyLabel={metrics.initiativeKey} name={metrics.initiativeTitle || ''} progress={0} color="#D97706" />
        )}
        {metrics.epicKey && (
          <ProgressRow
            keyLabel={metrics.epicKey}
            name={metrics.epicTitle || ''}
            progress={metrics.storiesTotal > 0 ? Math.round(metrics.storiesDone / metrics.storiesTotal * 100) : 0}
            color="#4F46E5"
          />
        )}
      </div>

      {/* ═══ WHAT'S DONE, WHAT'S LEFT ═══ */}
      {metrics.storiesTotal > 0 && (
        <>
          <SectionLabel>What's done, what's left</SectionLabel>
          <div className="mb-7">
            <div className="flex h-3 rounded-full overflow-hidden mb-2">
              {metrics.storiesInProd > 0 && <div style={{ width: `${metrics.storiesInProd / metrics.storiesTotal * 100}%`, background: '#16A34A' }} />}
              {(metrics.storiesDone - metrics.storiesInProd) > 0 && <div style={{ width: `${(metrics.storiesDone - metrics.storiesInProd) / metrics.storiesTotal * 100}%`, background: '#86EFAC' }} />}
              {metrics.storiesInProgress > 0 && <div style={{ width: `${metrics.storiesInProgress / metrics.storiesTotal * 100}%`, background: '#2563EB' }} />}
              {metrics.storiesBlocked > 0 && <div style={{ width: `${metrics.storiesBlocked / metrics.storiesTotal * 100}%`, background: '#EF4444' }} />}
              {metrics.storiesBacklog > 0 && <div style={{ width: `${metrics.storiesBacklog / metrics.storiesTotal * 100}%`, background: '#E2E8F0' }} />}
            </div>
            <p className="text-[12px]" style={{ color: '#1E293B' }}>
              {metrics.storiesInProd > 0 && <><strong>{metrics.storiesInProd}</strong> in production · </>}
              <strong>{metrics.storiesInProgress}</strong> in progress
              {metrics.storiesBlocked > 0 && <> · <strong className="text-red-600">{metrics.storiesBlocked} blocked</strong></>}
              {metrics.storiesBacklog > 0 && <> · {metrics.storiesBacklog} remaining</>}
            </p>
          </div>
        </>
      )}

      {/* ═══ HOW FAST ARE WE MOVING? ═══ */}
      {metrics.storiesTotal > 0 && (
        <>
          <SectionLabel>How fast are we moving?</SectionLabel>
          <div className="mb-7 text-[12px] leading-relaxed" style={{ color: '#1E293B' }}>
            <p>
              Average story takes <strong>{metrics.avgStoryCycleDays} days</strong>.
              Current velocity: <strong>{metrics.velocityPerWeek} stories/week</strong>.
              {metrics.neededVelocity > metrics.velocityPerWeek ? (
                <span className="text-amber-600"> Need {metrics.neededVelocity}/week to finish on time.</span>
              ) : (
                <span className="text-green-700"> On pace to deliver.</span>
              )}
            </p>
          </div>
        </>
      )}

      {/* ═══ HAS ANYTHING CHANGED? ═══ */}
      <SectionLabel>Has anything changed?</SectionLabel>
      <div className="mb-7">
        {metrics.scopeClean ? (
          <p className="text-[12px] text-green-700 flex items-center gap-2">
            <span>✓</span> No scope changes since kickoff
          </p>
        ) : (
          <div className="space-y-2">
            {metrics.scopeChanges.map((sc, i) => (
              <p key={i} className="text-[12px]" style={{ color: '#1E293B' }}>
                <span className="text-amber-600 font-semibold">△</span>{' '}
                {sc.description} — added by {sc.actor} on{' '}
                {new Date(sc.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </p>
            ))}
          </div>
        )}
      </div>

      {/* ═══ WHAT WENT WRONG? ═══ */}
      <SectionLabel>What went wrong?</SectionLabel>
      <div className="mb-7">
        {defects.length === 0 ? (
          <p className="text-[12px] text-green-700 flex items-center gap-2">
            <span>✓</span> No defects or incidents logged
          </p>
        ) : (
          <div className="space-y-1.5">
            {defects.map((d: any, i: number) => {
              const isOpen = d.status !== 'Done' && d.status !== 'Resolved';
              const sev = d.priority === 'Critical' ? 'P1' : d.priority === 'High' ? 'P2' : 'P3';
              return (
                <div key={i} className="flex items-center gap-3 text-[12px]">
                  <span className={`font-bold ${isOpen ? 'text-red-600' : 'text-slate-400'}`}>{sev}</span>
                  <span className="flex-1 truncate" style={{ color: '#1E293B' }}>{d.summary || d.title}</span>
                  <span className="text-slate-400 shrink-0">{isOpen ? 'Open' : 'Fixed'}</span>
                  <span className="text-slate-400 shrink-0">{d.assignee?.full_name?.split(' ')[0] || ''}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ═══ WHO'S RESPONSIBLE ═══ */}
      <SectionLabel>Who's responsible</SectionLabel>
      <div className="mb-7 space-y-0">
        {metrics.owners.map((owner, i) => (
          <div key={i} className="flex items-center gap-3 py-2 border-b border-slate-50 last:border-0">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
              style={{
                background: ['#DBEAFE','#D1FAE5','#FEF3C7','#EDE9FE','#CFFAFE'][i % 5],
                color: ['#1E40AF','#065F46','#92400E','#5B21B6','#155E75'][i % 5],
              }}
            >
              {owner.name.split(' ').map(w => w[0]).join('').slice(0, 2)}
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-[12px] font-semibold" style={{ color: '#1E293B' }}>{owner.name}</span>
              <span className="text-[11px] text-slate-400 ml-2">{owner.role}</span>
            </div>
            <span className="text-[10px] font-mono text-slate-400 shrink-0">{owner.entityKey}</span>
          </div>
        ))}
      </div>

      {/* ═══ WHAT AI NOTICED ═══ */}
      <SectionLabel>What AI noticed</SectionLabel>
      <div className="mb-4">
        {isAILoading ? (
          <div className="space-y-2">
            {[0,1,2].map(i => <div key={i} className="h-4 bg-slate-50 rounded animate-pulse" style={{ width: `${85 - i * 15}%` }} />)}
          </div>
        ) : (
          <div className="space-y-2">
            {(aiResult?.riskSignals || []).map((signal, i) => {
              const icon = i === 0 ? '🔴' : i === 1 ? '🟡' : '🟢';
              return (
                <p key={i} className="text-[12px] leading-relaxed" style={{ color: '#1E293B' }}>
                  <span className="mr-1.5">{icon}</span> {signal}
                </p>
              );
            })}
            {(!aiResult?.riskSignals || aiResult.riskSignals.length === 0) && !isAILoading && (
              <p className="text-[12px] text-slate-400 italic">No AI signals available</p>
            )}
          </div>
        )}
      </div>

    </div>
  );
}

// ─── ATOMS ───

function NumberCard({ value, label, color }: { value: string; label: string; color: string }) {
  return (
    <div className="text-center py-3 bg-white border border-slate-100 rounded-lg">
      <div className="text-[22px] font-[800] leading-none" style={{ color }}>{value}</div>
      <div className="text-[10px] text-slate-500 mt-1.5 uppercase tracking-wider font-semibold">{label}</div>
    </div>
  );
}

function SectionLabel({ children }: { children: string }) {
  return (
    <div className="text-[11px] font-[700] text-slate-400 uppercase tracking-[0.05em] mb-2.5 mt-1">
      {children}
    </div>
  );
}

function ProgressRow({ keyLabel, name, progress, color, flag }: {
  keyLabel: string; name: string; progress: number; color: string; flag?: string;
}) {
  return (
    <div className="flex items-center gap-2.5 h-6">
      <span className="text-[9px] font-bold font-mono text-slate-500 w-[50px] shrink-0 text-right">
        {keyLabel}
      </span>
      <div className="flex-1 h-[6px] bg-slate-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${progress}%`, background: color, transition: 'width 0.8s ease' }} />
      </div>
      <span className="text-[11px] font-bold w-[32px] shrink-0 text-right" style={{ color: '#1E293B' }}>{progress}%</span>
      {flag && <span className="text-[11px] w-[14px] shrink-0">{flag}</span>}
    </div>
  );
}

function getProgressColor(p: number): string {
  return p >= 70 ? '#16A34A' : p >= 40 ? '#D97706' : '#EF4444';
}

export default AIStrategyIntelligencePanel;
