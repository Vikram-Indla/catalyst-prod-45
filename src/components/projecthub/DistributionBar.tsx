import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface DistributionBarProps {
  todo: number;
  inProgress: number;
  done: number;
  showNumbers?: boolean;
}

export function DistributionBar({ todo, inProgress, done, showNumbers = false }: DistributionBarProps) {
  const total = todo + inProgress + done;
  if (total === 0) {
    return (
      <div className="flex items-center">
        <div style={{ width: '100%', height: 6, borderRadius: 3, background: '#E2E8F0' }} />
        {showNumbers && <span style={{ fontSize: 10, color: '#94A3B8', marginLeft: 6, whiteSpace: 'nowrap', fontFamily: "'JetBrains Mono', monospace" }}>—</span>}
      </div>
    );
  }
  const doneP = (done / total) * 100;
  const ipP = (inProgress / total) * 100;
  const todoP = (todo / total) * 100;

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-1.5" style={{ cursor: 'default' }}>
            <div style={{ flex: 1, height: 6, borderRadius: 3, background: '#E2E8F0', overflow: 'hidden', display: 'flex', minWidth: 50 }}>
              {doneP > 0 && <div style={{ width: `${doneP}%`, background: '#16A34A', borderRadius: doneP === 100 ? 3 : '3px 0 0 3px' }} />}
              {ipP > 0 && <div style={{ width: `${ipP}%`, background: '#2563EB' }} />}
              {todoP > 0 && <div style={{ width: `${todoP}%`, background: '#CBD5E1' }} />}
            </div>
            {showNumbers && (
              <span style={{ fontSize: 10, color: '#64748B', fontFamily: "'JetBrains Mono', monospace", whiteSpace: 'nowrap' }}>
                {done}/{inProgress}/{todo}
              </span>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          <div className="flex flex-col gap-0.5">
            <span>✅ Done: {done}</span>
            <span>🔵 In Progress: {inProgress}</span>
            <span>⬜ To Do: {todo}</span>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
