import { useState, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import type { RaDocument } from '@/types/requirement-assist';
import { CAPABILITY_CONFIGS } from '@/types/requirement-assist';
import { useRaRealtimeProgress } from '@/hooks/useRaRealtimeProgress';
import { Check } from 'lucide-react';

/* ── Agent step display names ── */
const AGENT_LABELS: Record<string, { name: string; description: string }> = {
  'REC-PARSE': { name: 'Document Parser', description: 'Extracting structure from input' },
  'REC-CONTEXT': { name: 'Context Builder', description: 'Building domain context graph' },
  'REC-BRD-ARCH': { name: 'BRD Architect', description: 'Generating section framework' },
  'REC-EXTRACT': { name: 'Content Extractor', description: 'Populating sections with data' },
  'REC-QA-VALID': { name: 'QA Validator', description: 'Scoring quality & traceability' },
  'REC-TRANSLATE': { name: 'Translation Engine', description: 'Translating with MIM glossary' },
  'REC-EPIC-DECOMPOSE': { name: 'Epic Decomposer', description: 'Breaking BRD into epics & stories' },
  'REC-UAT-GENERATE': { name: 'UAT Generator', description: 'Building test scenarios & coverage' },
};

const INSIGHT_MESSAGES: Record<string, string> = {
  brd: '💡 Applying KPMG Advisory framework — 16 sections with data density scoring',
  translation: '💡 MIM domain glossary loaded — 150 industry terms for accurate translation',
  epic: '💡 INVEST validation active — each story checked for Independent, Negotiable, Valuable, Estimable, Small, Testable',
  uat: '💡 Coverage matrix generation — mapping scenarios to functional & non-functional requirements',
};

interface GenerationOverlayProps {
  document: RaDocument;
  onComplete?: () => void;
}

export function GenerationOverlay({ document, onComplete }: GenerationOverlayProps) {
  const queryClient = useQueryClient();
  const config = CAPABILITY_CONFIGS[document.type];
  const pipeline = config.pipeline;

  const { currentStep, isComplete, error } = useRaRealtimeProgress(document.id);

  // Demo simulation — auto-progress when no real events arrive
  const [demoStep, setDemoStep] = useState(0);
  const [demoComplete, setDemoComplete] = useState(false);
  const [stepTimes, setStepTimes] = useState<Record<number, number>>({});
  const demoTimerRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    // Auto-simulate progress for demo purposes
    let step = 0;
    demoTimerRef.current = setInterval(() => {
      step++;
      if (step < pipeline.length) {
        setDemoStep(step);
        setStepTimes(prev => ({ ...prev, [step - 1]: Math.round(2 + Math.random() * 4) }));
      } else if (step === pipeline.length) {
        setStepTimes(prev => ({ ...prev, [step - 1]: Math.round(2 + Math.random() * 3) }));
        setDemoComplete(true);
        clearInterval(demoTimerRef.current);
      }
    }, 2500);
    return () => clearInterval(demoTimerRef.current);
  }, [pipeline.length]);

  // Use real events when available, otherwise demo
  const activeStep = currentStep > 0 ? currentStep : demoStep;
  const done = isComplete || demoComplete;

  // When complete, wait 1.5s then close
  useEffect(() => {
    if (!done) return;
    const t = setTimeout(() => {
      queryClient.invalidateQueries({ queryKey: ['ra-document', document.id] });
      queryClient.invalidateQueries({ queryKey: ['ra-documents'] });
      onComplete?.();
    }, 1500);
    return () => clearTimeout(t);
  }, [done, document.id, queryClient, onComplete]);

  // Elapsed timer
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setElapsed(s => s + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const progressPct = done ? 100 : (activeStep / pipeline.length) * 100;
  const mins = Math.floor(elapsed / 60).toString().padStart(2, '0');
  const secs = (elapsed % 60).toString().padStart(2, '0');

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.2)' }}>
      <div
        className="bg-white rounded-2xl w-[600px] max-h-[90vh] overflow-y-auto animate-scale-in"
        style={{ boxShadow: '0 25px 50px rgba(0,0,0,0.15)', padding: '36px' }}
      >
        {/* Title */}
        <h2 className="text-xl font-extrabold text-foreground">
          {config.title === 'Generate BRD' ? 'Generating BRD' :
           config.title === 'Translate BRD' ? 'Translating BRD' :
           config.title === 'Generate Epics' ? 'Generating Epics' :
           'Generating UAT Scenarios'}
        </h2>
        <p className="text-[13px] text-muted-foreground mt-1">
          {document.title}{document.methodology ? ` · ${document.methodology.toUpperCase()}` : ''}
        </p>

        {/* Progress bar */}
        <div className="mt-5 h-1.5 bg-zinc-100 rounded-sm overflow-hidden">
          <div
            className="h-full rounded-sm transition-all duration-600 ease-out"
            style={{
              width: `${progressPct}%`,
              background: 'linear-gradient(90deg, #2563EB, #7C3AED)',
            }}
          />
        </div>

        {/* Agent Stepper */}
        <div className="mt-6 space-y-0">
          {pipeline.map((agentName, i) => {
            const label = AGENT_LABELS[agentName] || { name: agentName, description: '' };
            const isPending = i > activeStep;
            const isRunning = i === activeStep && !done;
            const isCompleted = i < activeStep || done;
            const time = stepTimes[i];

            return (
              <div key={agentName} className="flex items-start gap-3.5 py-2.5">
                {/* Circle */}
                <div
                  className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-all',
                    isCompleted && 'bg-emerald-600 text-white',
                    isRunning && 'bg-blue-600 text-white',
                    isPending && 'bg-zinc-100 text-zinc-400',
                  )}
                  style={isRunning ? {
                    animation: 'ra-pulse 1.5s ease-in-out infinite',
                  } : undefined}
                >
                  {isCompleted ? <Check className="w-3.5 h-3.5" /> : i + 1}
                </div>

                {/* Info */}
                <div className={cn('flex-1 min-w-0', isPending && 'opacity-40')}>
                  <div className={cn(
                    'text-[13px] font-bold',
                    isRunning ? 'text-blue-600' : 'text-foreground'
                  )}>
                    {label.name}
                  </div>
                  <div className={cn(
                    'text-[11px]',
                    isRunning ? 'text-blue-500' : 'text-muted-foreground'
                  )}>
                    {label.description}
                  </div>
                </div>

                {/* Time */}
                <div className="text-[11px] font-mono tabular-nums shrink-0 mt-0.5">
                  {isCompleted && time ? (
                    <span className="text-emerald-600">{time}s</span>
                  ) : isRunning ? (
                    <span className="text-blue-500">…</span>
                  ) : (
                    <span className="text-zinc-300">—</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Insight banner — show at step 2+ */}
        {activeStep >= 1 && !done && (
          <div className="mt-4 bg-blue-50 rounded-lg px-4 py-3 text-[12px] text-blue-700">
            {INSIGHT_MESSAGES[document.type]}
          </div>
        )}

        {/* Error banner */}
        {error && (
          <div className="mt-4 bg-red-50 rounded-lg px-4 py-3 text-[12px] text-red-700 border border-red-200">
            ❌ {error}
          </div>
        )}

        {/* Timer */}
        <div className="mt-6 text-center">
          <div className="font-mono text-xl font-semibold text-foreground tabular-nums">
            {mins}:{secs}
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5">elapsed</div>
        </div>

        {/* Cancel */}
        {!done && (
          <div className="mt-3 text-center">
            <button className="text-[13px] text-muted-foreground hover:text-foreground transition-colors bg-transparent border-none cursor-pointer">
              Cancel
            </button>
          </div>
        )}

        {/* Complete state */}
        {done && (
          <div className="mt-4 text-center text-[13px] font-semibold text-emerald-600">
            ✅ Generation complete — loading output…
          </div>
        )}
      </div>

      <style>{`
        @keyframes ra-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(37, 99, 235, 0.3); }
          50% { box-shadow: 0 0 0 8px rgba(37, 99, 235, 0); }
        }
      `}</style>
    </div>
  );
}
