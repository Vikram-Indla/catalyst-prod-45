import React from "react";
import { ChainMetrics } from "@/utils/computeChainMetrics";
import {
  SectionDivider, SubHeading, HealthRing, VerdictCard,
  Avatar, RiskSignalCard, MiniBar, getProgressColor,
} from "./IntelligenceAtoms";

// ══════════════════════════════════════════════════════
// § VERDICT — The 8-second CIO read
// ══════════════════════════════════════════════════════
export function VerdictSection({
  metrics, aiVerdict, isAILoading,
}: {
  metrics: ChainMetrics;
  aiVerdict: string;
  isAILoading: boolean;
}) {
  return (
    <div>
      <SectionDivider label="Verdict" />

      <div className="flex items-start gap-5">
        {/* AI Health Ring */}
        <div className="flex flex-col items-center gap-1">
          <HealthRing value={metrics.goalHealth} />
          <span className="text-[10px] font-semibold text-slate-400">AI Health</span>
        </div>

        {/* 4 Verdict Cards */}
        <div className="grid grid-cols-2 gap-2 flex-1">
          <VerdictCard
            label="Schedule"
            value={`${metrics.scheduleDriftDays > 0 ? '+' : ''}${metrics.scheduleDriftDays}d`}
            icon={metrics.scheduleStatus === 'ahead' ? '▲' : metrics.scheduleStatus === 'behind' ? '▼' : '●'}
            sub={metrics.scheduleStatus === 'ahead' ? 'ahead' : metrics.scheduleStatus === 'behind' ? 'behind' : 'on track'}
            color={metrics.scheduleStatus === 'ahead' ? '#16A34A' : metrics.scheduleStatus === 'behind' ? '#EF4444' : '#D97706'}
          />
          <VerdictCard
            label="Scope"
            value={metrics.scopeClean ? 'Clean' : `+${metrics.currentStoryCount - metrics.originalStoryCount}`}
            icon={metrics.scopeClean ? '✓' : '△'}
            sub={metrics.scopeClean ? 'no changes' : 'late additions'}
            color={metrics.scopeClean ? '#16A34A' : '#D97706'}
          />
          <VerdictCard
            label="Weakest Link"
            value={metrics.weakestNode.key}
            sub={`${metrics.weakestNode.progress}% · ${metrics.weakestNode.layer}`}
            color={getProgressColor(metrics.weakestNode.progress)}
          />
          <VerdictCard
            label="Confidence"
            value={`${metrics.confidencePct}%`}
            icon={metrics.confidencePct >= 70 ? '●' : metrics.confidencePct >= 45 ? '●' : '●'}
            sub="on-time delivery"
            color={metrics.confidencePct >= 70 ? '#16A34A' : metrics.confidencePct >= 45 ? '#D97706' : '#EF4444'}
          />
        </div>
      </div>

      {/* AI Verdict — 2 sentences */}
      <div className="mt-4 p-3 bg-purple-50/60 border border-purple-100 rounded-lg">
        {isAILoading ? (
          <div className="space-y-2">
            <div className="h-3 bg-purple-100 rounded animate-pulse w-full" />
            <div className="h-3 bg-purple-100 rounded animate-pulse w-3/4" />
          </div>
        ) : (
          <p className="text-[13px] text-slate-700 leading-[1.7]">{aiVerdict}</p>
        )}
        <div className="text-[9px] text-purple-400 mt-2 font-semibold">
          ✦ AI-generated insight
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════
// § EXECUTION — Scope + Time + Delivery
// ══════════════════════════════════════════════════════
export function ExecutionSection({ metrics }: { metrics: ChainMetrics }) {
  return (
    <div>
      <SectionDivider label="Execution" />

      {/* Creation Waterfall */}
      <div className="mb-5">
        <SubHeading>Chain Creation Timeline</SubHeading>
        <div className="flex items-center gap-2 text-[11px] text-slate-500 mb-3">
          <span>Strategy → Execution lag:</span>
          <span className={`font-bold ${metrics.strategyToExecutionDays > 60 ? 'text-amber-600' : 'text-slate-800'}`}>
            {metrics.strategyToExecutionDays > 0 ? `${metrics.strategyToExecutionDays} days` : '—'}
          </span>
          <span>|</span>
          <span>Linkage lag:</span>
          <span className={`font-bold ${metrics.linkageLagDays > 30 ? 'text-amber-600' : 'text-slate-800'}`}>
            {metrics.linkageLagDays > 0 ? `${metrics.linkageLagDays} days` : '—'}
          </span>
        </div>

        {/* Node list with progress bars */}
        <div className="space-y-2">
          {metrics.owners.map((owner, i) => (
            <div key={i} className="flex items-center gap-3">
              <span className="text-[10px] font-mono font-bold text-slate-500 w-16 shrink-0 text-right">
                {owner.entityKey}
              </span>
              <div className="flex-1">
                <MiniBar value={i + 1} max={metrics.owners.length} color={getProgressColor(((i + 1) / metrics.owners.length) * 100)} height={4} />
              </div>
              <span className="text-[10px] text-slate-400 w-20 shrink-0">
                {owner.level}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Scope Integrity */}
      <div className="mb-5">
        <SubHeading>Scope Integrity</SubHeading>
        {metrics.scopeClean ? (
          <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-100 rounded-lg">
            <span className="text-green-600 text-sm font-bold">✓</span>
            <span className="text-[12px] text-green-700">
              Scope Intact — 0 changes since epic creation
            </span>
          </div>
        ) : (
          <div>
            <div className="flex items-center gap-4 mb-3">
              <div className="text-center">
                <div className="text-[18px] font-[800] text-slate-800">{metrics.originalStoryCount}</div>
                <div className="text-[10px] text-slate-400">Original</div>
              </div>
              <span className="text-slate-300">→</span>
              <div className="text-center">
                <div className="text-[18px] font-[800] text-slate-800">{metrics.currentStoryCount}</div>
                <div className="text-[10px] text-slate-400">Current</div>
              </div>
              <div className="text-center">
                <div className="text-[18px] font-[800] text-amber-600">+{metrics.currentStoryCount - metrics.originalStoryCount}</div>
                <div className="text-[10px] text-slate-400">Added</div>
              </div>
            </div>
            {metrics.scopeChanges.map((sc, i) => (
              <div key={i} className="flex items-start gap-2 py-1.5 text-[11px]">
                <span className="text-amber-500 mt-0.5">△</span>
                <div>
                  <div className="text-slate-700 font-medium">{sc.description}</div>
                  <div className="text-slate-400">
                    Added by {sc.actor} · {new Date(sc.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Story Pipeline */}
      <div className="mb-5">
        <SubHeading>Delivery Pipeline</SubHeading>
        <StoryPipeline metrics={metrics} />
      </div>

      {/* KR Bullet Charts */}
      <div className="mb-2">
        <SubHeading>Key Result Performance</SubHeading>
        <div className="space-y-3">
          {metrics.krs.map((kr, i) => {
            const pct = kr.target > 0 ? Math.min(100, (kr.current / kr.target) * 100) : kr.progress;
            const color = pct >= 80 ? '#16A34A' : pct >= 50 ? '#D97706' : '#EF4444';
            return (
              <div key={i}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-[10px] font-mono font-bold text-slate-500">{kr.key}</span>
                    <span className="text-[11px] text-slate-700 truncate">{kr.title}</span>
                  </div>
                  {pct < 50 && <span className="text-amber-500 text-[11px] shrink-0">⚠</span>}
                  {pct >= 80 && <span className="text-green-600 text-[11px] shrink-0">✓</span>}
                </div>
                <div className="relative h-[10px]">
                  <MiniBar value={kr.current} max={kr.target || 100} color={color} height={10} />
                  <div className="absolute top-0 h-full border-l-2 border-slate-400" style={{ left: '100%' }} />
                </div>
                <div className="flex justify-between mt-0.5">
                  <span className="text-[10px] text-slate-500">{kr.current} {kr.unit}</span>
                  <span className="text-[10px] text-slate-400">target: {kr.target} {kr.unit}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function StoryPipeline({ metrics }: { metrics: ChainMetrics }) {
  const { storiesInProd, storiesDone, storiesInProgress, storiesBlocked, storiesBacklog, storiesTotal } = metrics;
  const notDeployed = Math.max(0, storiesDone - storiesInProd);

  if (storiesTotal === 0) {
    return (
      <div className="text-[12px] text-slate-400 italic p-3 bg-slate-50 rounded-lg text-center">
        No stories linked to this chain's epic
      </div>
    );
  }

  const segments = [
    { label: 'In Production', count: storiesInProd, color: '#16A34A' },
    { label: 'Done', count: notDeployed, color: '#86EFAC' },
    { label: 'In Progress', count: storiesInProgress, color: '#2563EB' },
    { label: 'Blocked', count: storiesBlocked, color: '#EF4444' },
    { label: 'Backlog', count: storiesBacklog, color: '#E2E8F0' },
  ].filter(s => s.count > 0);

  return (
    <div>
      <div className="flex h-5 rounded-full overflow-hidden mb-3">
        {segments.map((s, i) => (
          <div key={i} style={{ width: `${(s.count / storiesTotal) * 100}%`, background: s.color }} />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 mb-2">
        {segments.map((s, i) => (
          <div key={i} className="flex items-center gap-1.5 text-[10px] text-slate-600">
            <div className="w-2 h-2 rounded-full" style={{ background: s.color }} />
            <span>{s.label}</span>
            <span className="font-bold">{s.count}</span>
          </div>
        ))}
      </div>
      <div className="text-[11px] text-slate-500">
        <span>{storiesInProd} of {storiesTotal} stories in production ({storiesTotal > 0 ? Math.round(storiesInProd / storiesTotal * 100) : 0}%)</span>
        {storiesBlocked > 0 && <span className="text-red-500"> · {storiesBlocked} blocked</span>}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════
// § RISK RADAR — Cycle times + Defects + AI Signals
// ══════════════════════════════════════════════════════
export function RiskRadarSection({
  metrics, defects, riskSignals, isAILoading,
}: {
  metrics: ChainMetrics; defects: any[]; riskSignals: string[]; isAILoading: boolean;
}) {
  return (
    <div>
      <SectionDivider label="Risk Radar" />

      {/* Cycle Times */}
      <div className="mb-5">
        <SubHeading>Cycle Times</SubHeading>
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: 'Epic Elapsed', value: `${metrics.epicCycleDays}d`, sub: 'since creation', color: '#4F46E5', warn: null as string | null },
            { label: 'Avg Story Cycle', value: `${metrics.avgStoryCycleDays}d`, sub: 'backlog → done', color: '#2563EB', warn: metrics.avgStoryCycleDays > 14 ? 'above avg' : null },
            { label: 'Defect MTTR', value: metrics.avgDefectCycleDays > 0 ? `${metrics.avgDefectCycleDays}d` : '—', sub: 'mean time to resolve', color: '#EF4444', warn: metrics.avgDefectCycleDays > 7 ? 'slow' : null },
            { label: 'Velocity', value: `${metrics.velocityPerWeek}/wk`, sub: `need ${metrics.neededVelocity}/wk`, color: metrics.velocityPerWeek >= metrics.neededVelocity ? '#16A34A' : '#D97706', warn: metrics.velocityPerWeek < metrics.neededVelocity ? 'below target' : null },
          ].map((item, i) => (
            <div key={i} className="p-2.5 bg-white border border-slate-100 rounded-lg">
              <div className="text-[9px] font-[700] uppercase tracking-[0.06em] text-slate-400 mb-1">{item.label}</div>
              <div className="text-[18px] font-[800] leading-none" style={{ color: item.color }}>{item.value}</div>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="text-[10px] text-slate-400">{item.sub}</span>
                {item.warn && <span className="text-[9px] text-amber-500 font-bold">{item.warn}</span>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Schedule Trajectory */}
      <div className="mb-5">
        <SubHeading>Schedule Trajectory</SubHeading>
        <div className="p-3 bg-white border border-slate-100 rounded-lg">
          <div className="flex justify-between mb-3">
            <div>
              <div className="text-[9px] text-slate-400 font-bold uppercase">Projected Completion</div>
              <div className="text-[16px] font-[800]" style={{ color: metrics.projectedCompletionDate > (metrics.goalTarget || '2099') ? '#EF4444' : '#16A34A' }}>
                {metrics.projectedCompletionDate !== '—'
                  ? new Date(metrics.projectedCompletionDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                  : '—'}
              </div>
            </div>
            <div className="text-right">
              <div className="text-[9px] text-slate-400 font-bold uppercase">Due Date</div>
              <div className="text-[16px] font-[800] text-slate-700">
                {metrics.goalTarget ? new Date(metrics.goalTarget).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
              </div>
            </div>
          </div>
          <div className="mb-1">
            <MiniBar value={metrics.goalProgress} max={100} color={getProgressColor(metrics.goalProgress)} height={8} />
          </div>
          <div className="flex justify-between text-[9px] text-slate-400">
            <span>Start</span>
            <span>Today: {metrics.goalProgress}%</span>
            <span>Target</span>
          </div>
        </div>
      </div>

      {/* Defect Ticker */}
      <div className="mb-5">
        <SubHeading>Defects & Incidents</SubHeading>
        {defects.length === 0 ? (
          <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-100 rounded-lg">
            <span className="text-green-600 font-bold">✓</span>
            <span className="text-[12px] text-green-700">No defects logged against this chain</span>
          </div>
        ) : (
          <div className="space-y-2">
            {defects.map((d: any, i: number) => {
              const isOpen = d.status !== 'Done' && d.status !== 'Resolved';
              const severity = d.priority || 'Medium';
              const sevColor = severity === 'Critical' ? '#EF4444' : severity === 'High' ? '#D97706' : '#94A3B8';
              const cycleDays = d.updated_at && d.created_at
                ? Math.round((new Date(d.updated_at).getTime() - new Date(d.created_at).getTime()) / 86400000)
                : null;
              return (
                <div key={i} className="flex items-center gap-2 p-2 bg-white border border-slate-100 rounded-lg">
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ background: `${sevColor}15`, color: sevColor }}>
                    {severity === 'Critical' ? 'P1' : severity === 'High' ? 'P2' : 'P3'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-[12px] text-slate-700 font-medium truncate">{d.summary || d.title || 'Untitled'}</div>
                    <div className="text-[10px] text-slate-400">{d.item_key} · {isOpen ? 'Open' : 'Resolved'}{cycleDays !== null ? ` · ${cycleDays}d cycle` : ''}</div>
                  </div>
                  <div className="w-2 h-2 rounded-full" style={{ background: isOpen ? '#EF4444' : '#16A34A' }} />
                  {d.assignee?.full_name && <Avatar name={d.assignee.full_name} size={22} />}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* AI Risk Signals */}
      <div className="mb-2">
        <SubHeading>AI Risk Signals</SubHeading>
        {isAILoading ? (
          <div className="space-y-2">
            {[0, 1, 2].map(i => <div key={i} className="h-16 bg-slate-50 rounded-lg animate-pulse" />)}
          </div>
        ) : riskSignals.length > 0 ? (
          <div className="space-y-2">
            {riskSignals.map((s, i) => <RiskSignalCard key={i} index={i} text={s} />)}
          </div>
        ) : (
          <div className="text-[12px] text-slate-400 italic">No AI signals available</div>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════
// § CHAIN OF COMMAND — Accountability + People
// ══════════════════════════════════════════════════════
export function ChainOfCommandSection({ metrics }: { metrics: ChainMetrics }) {
  const levels = ['Strategic', 'Tactical', 'Measurement', 'Delivery', 'Execution'];

  return (
    <div>
      <SectionDivider label="Chain of Command" />

      <div className="mb-5">
        <SubHeading>Accountability Ladder</SubHeading>
        <div className="relative">
          <div className="absolute left-[14px] top-3 bottom-3 w-px bg-slate-200" />
          <div className="space-y-4">
            {levels.map((level) => {
              const levelOwners = metrics.owners.filter(o => o.level === level);
              if (levelOwners.length === 0) return null;
              return (
                <div key={level} className="flex items-start gap-3 relative">
                  <div className="w-[28px] h-[28px] rounded-full bg-slate-100 border-2 border-white shadow-sm z-10 flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                  </div>
                  <div className="flex-1 pt-0.5">
                    <div className="text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-1">{level}</div>
                    {levelOwners.length === 1 ? (
                      <div className="flex items-center gap-2 p-2 bg-white border border-slate-100 rounded-lg">
                        <Avatar name={levelOwners[0].name} size={24} />
                        <div>
                          <div className="text-[12px] font-semibold text-slate-800">{levelOwners[0].name}</div>
                          <div className="text-[10px] text-slate-400">{levelOwners[0].role} · {levelOwners[0].entityKey}</div>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        {levelOwners.map((o, oi) => (
                          <div key={oi} className="flex items-center gap-2 p-1.5 bg-white border border-slate-100 rounded-lg">
                            <Avatar name={o.name} size={20} />
                            <div>
                              <div className="text-[11px] font-semibold text-slate-800">{o.name}</div>
                              <div className="text-[10px] text-slate-400">{o.entityKey}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Concentration Risk */}
      {metrics.concentrationRisk && (
        <div className="mb-5 p-3 bg-amber-50 border border-amber-100 rounded-lg">
          <div className="text-[11px] font-bold text-amber-700 mb-1">
            ⚠ Concentration Risk
          </div>
          <div className="text-[12px] text-amber-800">
            <strong>{metrics.concentrationRisk.name}</strong> appears in {metrics.concentrationRisk.count} chain levels.
            Consider distributing ownership to reduce single-point-of-failure risk.
          </div>
        </div>
      )}

      {/* Last Actor */}
      <SubHeading>Last Significant Action</SubHeading>
      <div className="flex items-center gap-3 p-2.5 bg-white border border-slate-100 rounded-lg">
        <Avatar name={metrics.lastActor.name} size={28} />
        <div>
          <div className="text-[12px] font-semibold text-slate-800">{metrics.lastActor.name}</div>
          <div className="text-[10px] text-slate-400">{metrics.lastActor.action} · {metrics.lastActor.date}</div>
        </div>
      </div>
    </div>
  );
}
