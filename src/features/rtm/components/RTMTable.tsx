import { ArrowUpDown, Eye, Link, MoreHorizontal, CheckCircle, XCircle, AlertTriangle, Clock } from 'lucide-react';
import type { RequirementTableRow, TestLink, TestExecutionStatus, Priority, CoverageStatus, RTMSorting } from '../types';
import { cn } from '@/lib/utils';

const priorityColors: Record<Priority, string> = {
  critical: 'bg-red-500',
  high: 'bg-amber-500',
  medium: 'bg-blue-500',
  low: 'bg-slate-400',
};

const statusConfig: Record<TestExecutionStatus, { color: string; bg: string }> = {
  passed: { color: 'text-emerald-600', bg: 'bg-emerald-500/10' },
  failed: { color: 'text-red-500', bg: 'bg-red-500/10' },
  blocked: { color: 'text-violet-500', bg: 'bg-violet-500/10' },
  not_run: { color: 'text-muted-foreground', bg: 'bg-muted' },
};

const coverageConfig: Record<CoverageStatus, { label: string; color: string; bg: string; icon: typeof CheckCircle }> = {
  covered: { label: 'Covered', color: 'text-emerald-600', bg: 'bg-emerald-500/10', icon: CheckCircle },
  partial: { label: 'Partial', color: 'text-amber-500', bg: 'bg-amber-500/10', icon: AlertTriangle },
  gap: { label: 'Gap', color: 'text-red-500', bg: 'bg-red-500/10', icon: XCircle },
};

interface Props {
  data: RequirementTableRow[];
  sorting: RTMSorting;
  onSort: (column: RTMSorting['column']) => void;
  onRowClick: (id: string) => void;
  selectedId: string | null;
}

export const RTMTable = ({ data, sorting, onSort, onRowClick, selectedId }: Props) => {
  const columns: { key: RTMSorting['column']; label: string; width: string }[] = [
    { key: 'key', label: 'Requirement', width: 'w-[280px]' },
    { key: 'type', label: 'Type', width: 'w-[100px]' },
    { key: 'priority', label: 'Priority', width: 'w-[90px]' },
    { key: 'coverage', label: 'Tests', width: 'w-[200px]' },
    { key: 'coverage', label: 'Coverage', width: 'w-[140px]' },
  ];

  return (
    <div className="flex-1 overflow-auto bg-muted/30">
      <table className="w-full border-collapse">
        <thead className="sticky top-0 z-10">
          <tr className="bg-muted/80 backdrop-blur-sm">
            {columns.map((col, i) => (
              <th
                key={i}
                className={cn("text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3 border-b border-border cursor-pointer hover:text-foreground hover:bg-muted transition-colors", col.width, sorting.column === col.key && 'text-primary')}
                onClick={() => onSort(col.key)}
              >
                <div className="flex items-center gap-1">
                  {col.label}
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
            ))}
            <th className="w-[80px] px-4 py-3 border-b border-border" />
          </tr>
        </thead>
        <tbody>
          {data.map(row => {
            const coverage = coverageConfig[row.coverageStatus];
            const CoverageIcon = coverage.icon;
            
            return (
              <tr
                key={row.id}
                className={cn("bg-card border-b border-border hover:bg-muted/50 transition-colors cursor-pointer group", selectedId === row.id && 'bg-primary/5')}
                onClick={() => onRowClick(row.id)}
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className={cn("w-1.5 h-1.5 rounded-full", priorityColors[row.priority])} />
                    <div>
                      <span className="text-xs font-semibold text-primary">{row.key}</span>
                      <p className="text-sm font-medium text-foreground truncate max-w-[240px]">{row.title}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className="text-xs font-medium text-muted-foreground capitalize">{row.type}</span>
                </td>
                <td className="px-4 py-3">
                  <span className={cn("inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium capitalize", row.priority === 'critical' ? 'bg-red-500/10 text-red-500' : row.priority === 'high' ? 'bg-amber-500/10 text-amber-500' : 'bg-muted text-muted-foreground')}>
                    {row.priority}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {row.linkedTests.slice(0, 3).map(test => {
                      const status = statusConfig[test.lastExecutionStatus || 'not_run'];
                      return (
                        <span key={test.testCaseId} className={cn("px-2 py-0.5 rounded text-[10px] font-semibold", status.bg, status.color)}>
                          {test.testCaseKey}
                        </span>
                      );
                    })}
                    {row.linkedTests.length > 3 && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-muted text-muted-foreground">+{row.linkedTests.length - 3}</span>
                    )}
                    {row.linkedTests.length === 0 && (
                      <span className="text-xs text-muted-foreground italic">No tests linked</span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className={cn("h-full rounded-full transition-all duration-500", row.coverageStatus === 'covered' ? 'bg-emerald-500' : row.coverageStatus === 'partial' ? 'bg-amber-500' : 'bg-red-500')}
                        style={{ width: `${row.coveragePercentage}%` }}
                      />
                    </div>
                    <span className={cn("text-xs font-semibold min-w-[32px]", coverage.color)}>{row.coveragePercentage}%</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="w-7 h-7 rounded flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground"><Eye className="w-4 h-4" /></button>
                    <button className="w-7 h-7 rounded flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground"><Link className="w-4 h-4" /></button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
