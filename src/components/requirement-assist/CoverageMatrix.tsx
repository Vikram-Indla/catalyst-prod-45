import { cn } from '@/lib/utils';

interface CoverageItem {
  id: string;
  label: string;
  covered: boolean;
}

const FR_ITEMS: CoverageItem[] = [
  { id: 'FR-001', label: 'Application submission', covered: true },
  { id: 'FR-002', label: 'Document validation', covered: true },
  { id: 'FR-003', label: 'Review workflow', covered: true },
  { id: 'FR-004', label: 'Fee calculation', covered: true },
  { id: 'FR-005', label: 'Notifications', covered: true },
];

const NFR_ITEMS: CoverageItem[] = [
  { id: 'NFR-001', label: 'Availability 99.5%', covered: true },
  { id: 'NFR-002', label: 'Page load < 3s', covered: true },
  { id: 'NFR-003', label: '500 concurrent users', covered: false },
  { id: 'NFR-004', label: 'Encryption (AES-256)', covered: true },
  { id: 'NFR-005', label: 'NCA ECC compliance', covered: false },
];

const TRACE_MAP = [
  { scenario: 'SC-001', requirements: 'FR-001, FR-002' },
  { scenario: 'SC-002', requirements: 'FR-003' },
  { scenario: 'SC-003', requirements: 'FR-004' },
  { scenario: 'SC-004', requirements: 'FR-005' },
  { scenario: 'SC-005', requirements: 'NFR-001, NFR-002' },
  { scenario: 'SC-006', requirements: 'NFR-004' },
];

export function CoverageMatrix() {
  const frCovered = FR_ITEMS.filter(f => f.covered).length;
  const nfrCovered = NFR_ITEMS.filter(f => f.covered).length;
  const totalPct = Math.round(((frCovered + nfrCovered) / (FR_ITEMS.length + NFR_ITEMS.length)) * 100);

  return (
    <div className="h-full bg-white border-l border-[hsl(var(--border))] overflow-y-auto p-5 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-foreground">Test Coverage</h3>
        <span className={cn(
          'text-[10px] font-bold px-2 py-0.5 rounded-md',
          totalPct >= 80 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
        )}>
          {totalPct}%
        </span>
      </div>

      {/* FR Coverage */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Functional</span>
          <span className="text-[11px] font-mono text-foreground">{frCovered}/{FR_ITEMS.length}</span>
        </div>
        <div className="h-[5px] bg-zinc-100 rounded-sm overflow-hidden mb-2">
          <div className="h-full bg-emerald-500 rounded-sm" style={{ width: `${(frCovered / FR_ITEMS.length) * 100}%` }} />
        </div>
        <div className="space-y-1">
          {FR_ITEMS.map(item => (
            <div key={item.id} className="flex items-center gap-2 text-[11px]">
              <span className={cn('w-1.5 h-1.5 rounded-full', item.covered ? 'bg-emerald-500' : 'bg-zinc-300')} />
              <span className="font-mono text-zinc-500 w-12">{item.id}</span>
              <span className="text-zinc-600">{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* NFR Coverage */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Non-Functional</span>
          <span className="text-[11px] font-mono text-foreground">{nfrCovered}/{NFR_ITEMS.length}</span>
        </div>
        <div className="h-[5px] bg-zinc-100 rounded-sm overflow-hidden mb-2">
          <div className="h-full bg-amber-500 rounded-sm" style={{ width: `${(nfrCovered / NFR_ITEMS.length) * 100}%` }} />
        </div>
        <div className="space-y-1">
          {NFR_ITEMS.map(item => (
            <div key={item.id} className="flex items-center gap-2 text-[11px]">
              <span className={cn('w-1.5 h-1.5 rounded-full', item.covered ? 'bg-emerald-500' : 'bg-zinc-300')} />
              <span className="font-mono text-zinc-500 w-14">{item.id}</span>
              <span className="text-zinc-600">{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Traceability Table */}
      <div>
        <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">Traceability</div>
        <table className="w-full text-[11px]">
          <thead>
            <tr className="border-b border-[hsl(var(--border))]">
              <th className="text-left py-1.5 font-semibold text-muted-foreground">Scenario</th>
              <th className="text-left py-1.5 font-semibold text-muted-foreground">Requirements</th>
            </tr>
          </thead>
          <tbody>
            {TRACE_MAP.map(row => (
              <tr key={row.scenario} className="border-b border-[hsl(var(--border))] last:border-0">
                <td className="py-1.5 font-mono text-blue-600">{row.scenario}</td>
                <td className="py-1.5 font-mono text-zinc-600">{row.requirements}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
