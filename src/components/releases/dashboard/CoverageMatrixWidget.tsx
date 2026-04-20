import { CoverageItem } from '@/types/release-dashboard';
import { cn } from '@/lib/utils';
import { Tooltip } from '@/components/ads';

interface CoverageMatrixWidgetProps {
  coverage: CoverageItem[];
}

const dotStyles = {
  passed: 'bg-teal-600',
  failed: 'bg-destructive',
  blocked: 'bg-amber-600',
  'not-run': 'bg-muted-foreground/40',
};

const dotIcons = {
  passed: '✓',
  failed: '✗',
  blocked: '!',
  'not-run': '○',
};

export function CoverageMatrixWidget({ coverage }: CoverageMatrixWidgetProps) {
  return (
    <div className="bg-card border border-border rounded-lg">
      <div className="px-3.5 py-2.5 border-b border-border">
        <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Coverage Matrix</h3>
      </div>
      <div className="divide-y divide-border/50 max-h-[200px] overflow-y-auto">
        {coverage.map((item) => (
          <div key={item.requirementId} className="flex items-center gap-2 px-3.5 py-2">
            <span className="w-16 text-[11px] font-semibold text-blue-600 shrink-0">
              {item.requirementId}
            </span>
            <span className="flex-1 text-xs text-foreground truncate">
              {item.requirementName}
            </span>
            <div className="flex gap-1">
              {item.testStatuses.map((status, idx) => (
                <Tooltip key={idx} content={<p className="text-xs capitalize">{status.replace('-', ' ')}</p>}>
                  <div
                    className={cn(
                      "w-[18px] h-[18px] rounded flex items-center justify-center text-[9px] font-semibold text-white cursor-pointer transition-transform hover:scale-110",
                      dotStyles[status]
                    )}
                  >
                    {dotIcons[status]}
                  </div>
                </Tooltip>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
