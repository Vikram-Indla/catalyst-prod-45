/**
 * Enterprise Table View — Compact 36px rows, health scores, inline metrics
 */

import { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowUp, ArrowDown } from 'lucide-react';
import type { Release } from '../types';
import type { HealthLevel } from '../utils/healthScore';

type SortCol = 'name' | 'status' | 'progress' | 'tests' | 'defects' | 'coverage' | 'health' | 'days';
type SortDir = 'asc' | 'desc';

interface EnterpriseTableViewProps {
  releases: Release[];
  selectedIds: Set<string>;
  onSelect: (id: string) => void;
  onSelectAll: () => void;
  selectAllState: 'none' | 'some' | 'all';
  onReleaseClick?: (release: Release) => void;
}

const STATUS_PILL: Record<string, { label: string; dot: string; text: string }> = {
  planning: { label: 'Planning', dot: 'bg-slate-400', text: 'text-slate-600' },
  in_progress: { label: 'Development', dot: 'bg-blue-500', text: 'text-blue-600' },
  testing: { label: 'Testing', dot: 'bg-blue-400', text: 'text-blue-500' },
  staging: { label: 'Staging', dot: 'bg-slate-500', text: 'text-slate-600' },
  released: { label: 'Released', dot: 'bg-emerald-500', text: 'text-emerald-600' },
  cancelled: { label: 'Cancelled', dot: 'bg-slate-300', text: 'text-slate-400' },
};

const HEALTH_DOT: Record<HealthLevel, string> = {
  critical: 'bg-red-500',
  at_risk: 'bg-red-400',
  attention: 'bg-blue-400',
  healthy: 'bg-emerald-500',
};

const HEALTH_TEXT: Record<HealthLevel, string> = {
  critical: 'text-red-600',
  at_risk: 'text-red-500',
  attention: 'text-blue-600',
  healthy: 'text-emerald-600',
};

const VERSION_BG: Record<string, string> = {
  major: 'bg-blue-100 text-blue-700',
  minor: 'bg-teal-50 text-teal-700',
  patch: 'bg-slate-100 text-slate-600',
  hotfix: 'bg-red-50 text-red-600',
};

function getVersionType(version: string): string {
  const parts = version.replace(/^v/i, '').split('.');
  if (parts.length >= 3 && parts[2] !== '0') return 'patch';
  if (parts.length >= 2 && parts[1] !== '0') return 'minor';
  return 'major';
}

function getDaysInfo(release: Release) {
  if (release.status === 'released') return { label: 'Released', className: 'bg-emerald-50 text-emerald-600' };
  const days = release.schedule.daysRemaining;
  if (days < 0) return { label: 'Overdue', className: 'bg-red-50 text-red-600' };
  if (days <= 14) return { label: `${days}d`, className: 'bg-blue-50 text-blue-600' };
  return { label: `${days}d`, className: 'bg-slate-50 text-slate-500' };
}

function getTestBarColor(pct: number): string {
  if (pct >= 80) return 'bg-emerald-500';
  if (pct >= 50) return 'bg-orange-500';
  return 'bg-red-500';
}

function getProgressBarColor(pct: number): string {
  if (pct >= 80) return 'bg-blue-600';
  if (pct >= 40) return 'bg-blue-500';
  return 'bg-blue-400';
}

export function EnterpriseTableView({
  releases,
  selectedIds,
  onSelect,
  onSelectAll,
  selectAllState,
  onReleaseClick,
}: EnterpriseTableViewProps) {
  const navigate = useNavigate();
  const [sortCol, setSortCol] = useState<SortCol>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const toggleSort = (col: SortCol) => {
    if (sortCol === col) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortCol(col);
      setSortDir('asc');
    }
  };

  const sorted = useMemo(() => {
    return [...releases].sort((a, b) => {
      let cmp = 0;
      switch (sortCol) {
        case 'name': cmp = a.name.localeCompare(b.name); break;
        case 'status': cmp = a.status.localeCompare(b.status); break;
        case 'progress': {
          const ap = a.metrics.totalTests > 0 ? a.metrics.passedTests / a.metrics.totalTests : 0;
          const bp = b.metrics.totalTests > 0 ? b.metrics.passedTests / b.metrics.totalTests : 0;
          cmp = ap - bp;
          break;
        }
        case 'tests': cmp = a.metrics.totalTests - b.metrics.totalTests; break;
        case 'defects': cmp = a.metrics.openDefects - b.metrics.openDefects; break;
        case 'coverage': cmp = a.metrics.testCoverage - b.metrics.testCoverage; break;
        case 'health': cmp = a.healthScore - b.healthScore; break;
        case 'days': cmp = a.schedule.daysRemaining - b.schedule.daysRemaining; break;
      }
      return sortDir === 'desc' ? -cmp : cmp;
    });
  }, [releases, sortCol, sortDir]);

  const SortHeader = ({ col, children, className }: { col: SortCol; children: React.ReactNode; className?: string }) => (
    <button
      onClick={() => toggleSort(col)}
      className={cn(
        "flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider transition-colors",
        sortCol === col ? "text-blue-600" : "text-slate-500 hover:text-slate-700",
        className
      )}
    >
      {children}
      {sortCol === col && (
        sortDir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
      )}
    </button>
  );

  const handleRowClick = (release: Release, e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('[role="checkbox"]')) return;
    if (onReleaseClick) {
      onReleaseClick(release);
    } else {
      navigate(`/release-hub/${release.id}`);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div
        className="grid items-center px-4 border-b border-slate-200 bg-slate-50"
        style={{
          gridTemplateColumns: '36px 1.4fr 100px 120px 100px 70px 80px 70px 70px 90px',
          height: '50px',
        }}
      >
        <div className="flex justify-center">
          <Checkbox
            checked={selectAllState === 'all'}
            onCheckedChange={onSelectAll}
            aria-label="Select all releases"
          />
        </div>
        <SortHeader col="name">Release</SortHeader>
        <SortHeader col="status">Status</SortHeader>
        <SortHeader col="progress">Progress</SortHeader>
        <SortHeader col="tests">Tests</SortHeader>
        <SortHeader col="defects" className="justify-center">Defects</SortHeader>
        <SortHeader col="coverage" className="justify-center">Coverage</SortHeader>
        <SortHeader col="health">Health</SortHeader>
        <SortHeader col="days" className="justify-center">Days</SortHeader>
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Owner</span>
      </div>

      {/* Rows */}
      {sorted.map((release) => {
        const statusConf = STATUS_PILL[release.status] || STATUS_PILL.planning;
        const vType = getVersionType(release.version);
        const vClass = VERSION_BG[vType] || VERSION_BG.major;
        const daysInfo = getDaysInfo(release);
        const isSelected = selectedIds.has(release.id);
        const testPct = release.metrics.totalTests > 0
          ? Math.round((release.metrics.passedTests / release.metrics.totalTests) * 100)
          : 0;
        const progressPct = release.metrics.totalTests > 0
          ? Math.round((release.metrics.passedTests / release.metrics.totalTests) * 100)
          : 0;
        const ownerInitials = release.releaseManager
          ? release.releaseManager.full_name.split(' ').map(n => n[0]).join('').slice(0, 2)
          : null;

        return (
          <div
            key={release.id}
            onClick={(e) => handleRowClick(release, e)}
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter') onReleaseClick?.(release); if (e.key === ' ') { e.preventDefault(); onSelect(release.id); } }}
            className={cn(
              "grid items-center px-4 border-b border-slate-100 last:border-b-0 cursor-pointer transition-colors",
              isSelected ? "bg-blue-50" : "hover:bg-slate-50"
            )}
            style={{
              gridTemplateColumns: '36px 1.4fr 100px 120px 100px 70px 80px 70px 70px 90px',
              height: '50px',
            }}
          >
            {/* Checkbox */}
            <div className="flex justify-center" onClick={(e) => e.stopPropagation()}>
              <Checkbox
                checked={isSelected}
                onCheckedChange={() => onSelect(release.id)}
              />
            </div>

            {/* Release */}
            <div className="flex items-center gap-2 min-w-0">
              <span className={cn("px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0", vClass)}>
                {release.version}
              </span>
              <span className="text-[12px] font-medium text-slate-800 truncate">{release.name}</span>
            </div>

            {/* Status */}
            <div className="flex items-center gap-1.5">
              <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", statusConf.dot)} />
              <span className={cn("text-[11px] font-medium", statusConf.text)}>{statusConf.label}</span>
            </div>

            {/* Progress */}
            <div className="flex items-center gap-2">
              <div className="w-[60px] h-[4px] bg-slate-100 rounded-full overflow-hidden">
                <div className={cn("h-full rounded-full", getProgressBarColor(progressPct))} style={{ width: `${progressPct}%` }} />
              </div>
              <span className="text-[11px] font-semibold text-slate-700">{progressPct}%</span>
            </div>

            {/* Tests */}
            <div className="flex items-center gap-2">
              <div className="w-[32px] h-[4px] bg-slate-100 rounded-full overflow-hidden">
                <div className={cn("h-full rounded-full", getTestBarColor(testPct))} style={{ width: `${testPct}%` }} />
              </div>
              <span className="text-[11px] text-slate-600">
                {release.metrics.passedTests}/{release.metrics.totalTests}
              </span>
            </div>

            {/* Defects */}
            <div className="text-center">
              {release.metrics.openDefects > 0 ? (
                <span className="text-[12px] font-semibold text-red-600">{release.metrics.openDefects}</span>
              ) : (
                <span className="text-[11px] text-slate-300">—</span>
              )}
            </div>

            {/* Coverage */}
            <div className="text-center">
              {release.metrics.testCoverage > 0 ? (
                <span className="text-[12px] font-medium text-slate-700">{release.metrics.testCoverage}%</span>
              ) : (
                <span className="text-[11px] text-slate-300">—</span>
              )}
            </div>

            {/* Health */}
            <div className="flex items-center gap-1.5">
              <div className={cn("w-2 h-2 rounded-full shrink-0", HEALTH_DOT[release.healthLevel])} />
              <span className={cn("text-[12px] font-semibold", HEALTH_TEXT[release.healthLevel])}>
                {release.healthScore}
              </span>
            </div>

            {/* Days */}
            <div className="flex justify-center">
              <span className={cn("px-2 py-0.5 rounded text-[10px] font-semibold", daysInfo.className)}>
                {daysInfo.label}
              </span>
            </div>

            {/* Owner */}
            <div>
              {ownerInitials ? (
                <div className="w-6 h-6 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center">
                  {ownerInitials}
                </div>
              ) : (
                <span className="text-[11px] text-slate-400 font-medium">Unassigned</span>
              )}
            </div>
          </div>
        );
      })}

      {releases.length === 0 && (
        <div className="py-16 text-center text-slate-400 text-sm">No releases to display</div>
      )}
    </div>
  );
}
