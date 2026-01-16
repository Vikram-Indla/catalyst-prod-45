import { EnvironmentStats } from '@/types/release-dashboard';

interface EnvironmentComparisonWidgetProps {
  environments: EnvironmentStats[];
}

export function EnvironmentComparisonWidget({ environments }: EnvironmentComparisonWidgetProps) {
  return (
    <div className="bg-card border border-border rounded-lg">
      <div className="px-3.5 py-2.5 border-b border-border">
        <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Environment Comparison</h3>
      </div>
      <div className="p-3.5 space-y-3">
        {environments.map((env) => {
          const total = env.passed + env.failed + env.blocked + env.notRun;
          const passedPct = (env.passed / total) * 100;
          const failedPct = (env.failed / total) * 100;
          const blockedPct = (env.blocked / total) * 100;
          const notRunPct = (env.notRun / total) * 100;

          return (
            <div key={env.name}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-medium text-foreground">{env.name}</span>
                <span className="text-xs font-semibold text-primary">{passedPct.toFixed(0)}%</span>
              </div>
              <div className="h-5 bg-muted rounded overflow-hidden flex">
                {passedPct > 0 && (
                  <div
                    className="bg-teal-600 flex items-center justify-center text-[9px] font-semibold text-white"
                    style={{ width: `${passedPct}%` }}
                  >
                    {passedPct > 15 && `${env.passed}`}
                  </div>
                )}
                {failedPct > 0 && (
                  <div
                    className="bg-destructive flex items-center justify-center text-[9px] font-semibold text-white"
                    style={{ width: `${failedPct}%` }}
                  />
                )}
                {blockedPct > 0 && (
                  <div
                    className="bg-amber-600 flex items-center justify-center text-[9px] font-semibold text-white"
                    style={{ width: `${blockedPct}%` }}
                  />
                )}
                {notRunPct > 0 && (
                  <div
                    className="bg-slate-300 flex items-center justify-center text-[9px] font-semibold text-slate-600"
                    style={{ width: `${notRunPct}%` }}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
