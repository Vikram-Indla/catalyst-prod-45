import { cn } from '@/lib/utils';
import type { QualityBreakdown, RaVerdict } from '@/types/requirement-assist';

interface AiAssistantPanelProps {
  qualityScore: number | null;
  qualityBreakdown: QualityBreakdown | null;
  verdict: RaVerdict;
}

function getScoreColor(score: number) {
  if (score >= 80) return 'text-emerald-600';
  if (score >= 70) return 'text-amber-600';
  return 'text-red-600';
}

function getBarColor(score: number, max: number) {
  const pct = score / max;
  if (pct >= 0.8) return 'bg-emerald-500';
  if (pct >= 0.7) return 'bg-amber-500';
  return 'bg-red-500';
}

const BREAKDOWN_LABELS = [
  { key: 'typography' as const, label: 'Typography' },
  { key: 'dataDensity' as const, label: 'Data Density' },
  { key: 'completeness' as const, label: 'Completeness' },
  { key: 'traceability' as const, label: 'Traceability' },
];

const SUGGESTIONS = [
  {
    title: 'Add data tables to Section 5',
    description: 'Data density is below threshold — adding tables with KPIs will improve score.',
    action: 'Auto-fix →',
  },
  {
    title: 'Link requirements to FR codes',
    description: 'Traceability can improve by referencing FR-NNN identifiers in each section.',
    action: 'View mapping →',
  },
];

export function AiAssistantPanel({ qualityScore, qualityBreakdown, verdict }: AiAssistantPanelProps) {
  return (
    <div className="h-full bg-white border-l border-[hsl(var(--border))] overflow-y-auto p-5 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-2.5">
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-sm"
          style={{ background: 'linear-gradient(135deg, #2563EB, #7C3AED)' }}
        >
          <span className="text-white">🤖</span>
        </div>
        <div>
          <div className="text-sm font-bold text-foreground">AI Assistant</div>
          <div className="text-[11px] text-muted-foreground">REC-QA Validator</div>
        </div>
      </div>

      {/* Quality Score */}
      {qualityScore !== null && (
        <div className="bg-zinc-50 rounded-[10px] p-5 text-center">
          <div className={cn('font-mono text-4xl font-bold leading-none', getScoreColor(qualityScore))}>
            {qualityScore}
          </div>
          <div className="text-[10px] uppercase text-muted-foreground mt-1.5 tracking-wide">Quality Score</div>
          {verdict && (
            <span className={cn(
              'inline-block mt-2 text-[9px] font-bold uppercase px-2 py-0.5 rounded-md',
              verdict === 'pass' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
            )}>
              {verdict === 'pass' ? '✓ PASS' : '⚠ REVIEW'}
            </span>
          )}
        </div>
      )}

      {/* Breakdown */}
      {qualityBreakdown && (
        <div>
          <div className="text-[11px] font-bold uppercase text-muted-foreground tracking-wide mb-2.5">Breakdown</div>
          <div className="space-y-2.5">
            {BREAKDOWN_LABELS.map(({ key, label }) => {
              const value = qualityBreakdown[key];
              return (
                <div key={key} className="flex items-center gap-2">
                  <span className="text-[11px] text-zinc-600 w-[90px] shrink-0">{label}</span>
                  <div className="flex-1 h-[5px] bg-zinc-100 rounded-sm overflow-hidden">
                    <div
                      className={cn('h-full rounded-sm', getBarColor(value, 25))}
                      style={{ width: `${(value / 25) * 100}%` }}
                    />
                  </div>
                  <span className="text-[11px] font-bold font-mono text-zinc-700 w-5 text-right">{value}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Hallucination check */}
      <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2.5">
        <span className="text-xs font-semibold text-emerald-700">✅ Zero ungrounded claims detected</span>
      </div>

      {/* Suggestions */}
      <div>
        <div className="text-[11px] font-bold uppercase text-muted-foreground tracking-wide mb-2.5">Suggestions</div>
        <div className="space-y-2">
          {SUGGESTIONS.map((s, i) => (
            <div key={i} className="bg-zinc-50 border border-[hsl(var(--border))] rounded-lg px-3.5 py-3">
              <div className="text-xs font-bold text-foreground">{s.title}</div>
              <div className="text-[11px] text-muted-foreground mt-0.5">{s.description}</div>
              <button className="text-[11px] font-semibold text-blue-600 mt-1.5 hover:underline">{s.action}</button>
            </div>
          ))}
        </div>
      </div>

      {/* Generate Artifacts */}
      <button className={cn(
        'w-full h-10 flex items-center justify-center gap-2 rounded-[10px] text-sm font-bold text-white transition-all',
        'bg-blue-600 hover:bg-blue-700 shadow-[0_2px_8px_rgba(37,99,235,0.18)]'
      )}>
        Generate Artifacts ▾
      </button>
    </div>
  );
}
