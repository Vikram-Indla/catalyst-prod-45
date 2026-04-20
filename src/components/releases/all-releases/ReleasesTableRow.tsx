// =====================================================
// RELEASES TABLE ROW COMPONENT
// Individual row with hover actions
// =====================================================

import { Release, STATUS_CONFIG, HEALTH_CONFIG, ReleaseStatus } from '@/types/releases';
import { useNavigate } from 'react-router-dom';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Lozenge } from '@/components/ads';
import type { LozengeAppearance } from '@/components/ads';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Pencil, Archive, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { differenceInDays, parseISO } from 'date-fns';

interface Props {
  release: Release;
  index: number;
  isSelected: boolean;
  onToggleSelect: (id: string, index: number, shiftKey: boolean) => void;
}

const STATUS_APPEARANCE: Record<ReleaseStatus, LozengeAppearance> = {
  planning: 'default',
  active: 'inprogress',
  uat: 'moved',
  released: 'success',
  archived: 'default',
};

export function ReleasesTableRow({ release, index, isSelected, onToggleSelect }: Props) {
  const navigate = useNavigate();
  
  const daysRemaining = release.target_date 
    ? differenceInDays(parseISO(release.target_date), new Date())
    : null;
  
  const handleClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.row-actions') || 
        (e.target as HTMLElement).closest('[role="checkbox"]')) {
      return;
    }
    navigate(`/releasehub/${release.id}`);
  };
  
  const handleCheckboxClick = (e: React.MouseEvent) => {
    onToggleSelect(release.id, index, e.shiftKey);
  };
  
  const statusConfig = STATUS_CONFIG[release.status] || STATUS_CONFIG.planning;
  const healthConfig = HEALTH_CONFIG[release.health];
  
  const getDaysAppearance = (): LozengeAppearance => {
    if (daysRemaining === null) return 'default';
    if (daysRemaining < 0) return 'removed';
    if (daysRemaining <= 3) return 'moved';
    return 'success';
  };
  
  const getDaysLabel = () => {
    if (daysRemaining === null) return release.status === 'released' ? 'Shipped' : '—';
    if (daysRemaining === 0) return 'Today';
    if (daysRemaining < 0) return `${daysRemaining}d`;
    return `${daysRemaining}d`;
  };
  
  return (
    <div
      onClick={handleClick}
      className={cn(
        "group grid gap-3 px-5 items-center h-[60px] cursor-pointer border-b border-slate-100 transition-colors relative",
        isSelected && "bg-blue-50",
        release.is_blocked && "bg-red-50/50",
        !isSelected && !release.is_blocked && "hover:bg-slate-50"
      )}
      style={{ gridTemplateColumns: '40px 1.5fr 100px 110px 80px 80px 80px 80px 80px 70px' }}
    >
      {/* Checkbox */}
      <div className="flex items-center justify-center" onClick={handleCheckboxClick}>
        <Checkbox checked={isSelected} />
      </div>
      
      {/* Release Name */}
      <div className="flex items-center gap-3 min-w-0">
        <div className={cn(
          "w-10 h-10 rounded-lg flex items-center justify-center text-xs font-bold shrink-0",
          release.is_blocked ? "bg-red-100 text-red-600" : statusConfig.className
        )}>
          {release.version}
        </div>
        <div className="min-w-0">
          <div className="text-sm font-semibold text-slate-800 flex items-center gap-2 truncate">
            <span className="truncate">{release.name}</span>
            {release.is_blocked && (
              <span className="shrink-0">
                <Lozenge appearance="removed">BLOCKED</Lozenge>
              </span>
            )}
          </div>
          <div className="text-xs text-slate-400 truncate">{release.description || 'No description'}</div>
        </div>
      </div>
      
      {/* Status */}
      <div>
        <Lozenge appearance={STATUS_APPEARANCE[release.status] ?? 'default'}>
          {statusConfig.label}
        </Lozenge>
      </div>
      
      {/* Progress */}
      <div className="flex items-center gap-2">
        <Progress value={release.progress} className="flex-1 h-1.5" />
        <span className={cn(
          "text-xs font-semibold",
          release.is_blocked ? "text-red-600" : "text-teal-600"
        )}>
          {release.progress}%
        </span>
      </div>
      
      {/* Tests */}
      <div className="text-center">
        {release.test_cases_total > 0 ? (
          <>
            <span className="text-sm font-semibold text-teal-600">{release.test_cases_passed}</span>
            <span className="text-xs text-slate-400">/{release.test_cases_total}</span>
          </>
        ) : (
          <span className="text-sm text-slate-400">—</span>
        )}
      </div>
      
      {/* Defects */}
      <div className="text-center">
        <span className={cn(
          "text-sm font-semibold",
          release.defects_open > 5 ? "text-red-600" : "text-slate-600"
        )}>
          {release.defects_open || '—'}
        </span>
      </div>
      
      {/* Coverage */}
      <div className="text-center">
        <span className={cn(
          "text-sm font-semibold",
          release.coverage_percent >= 80 ? "text-teal-600" :
          release.coverage_percent >= 60 ? "text-amber-600" :
          release.coverage_percent > 0 ? "text-red-600" : "text-slate-400"
        )}>
          {release.coverage_percent > 0 ? `${release.coverage_percent}%` : '—'}
        </span>
      </div>
      
      {/* Health */}
      <div className="flex items-center gap-2">
        <div className={cn("w-2 h-2 rounded-full", healthConfig.dotClass)} />
        <span className={cn("text-xs", healthConfig.textClass)}>
          {healthConfig.label}
        </span>
      </div>
      
      {/* Days */}
      <div>
        <Lozenge appearance={getDaysAppearance()}>
          {getDaysLabel()}
        </Lozenge>
      </div>
      
      {/* Owner */}
      <div className="flex justify-center">
        <Avatar className="w-9 h-9">
          <AvatarImage src={release.owner?.avatar_url || undefined} />
          <AvatarFallback className="bg-primary text-white text-xs font-semibold">
            {release.owner?.full_name?.split(' ').map(n => n[0]).join('') || '?'}
          </AvatarFallback>
        </Avatar>
      </div>
      
      {/* Hover Actions */}
      <div className="row-actions absolute right-20 top-1/2 -translate-y-1/2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button variant="outline" size="icon" className="w-7 h-7" onClick={(e) => { e.stopPropagation(); }}>
          <Pencil className="w-3 h-3" />
        </Button>
        <Button variant="outline" size="icon" className="w-7 h-7" onClick={(e) => { e.stopPropagation(); }}>
          <Archive className="w-3 h-3" />
        </Button>
        <Button variant="outline" size="icon" className="w-7 h-7 hover:bg-red-50 hover:text-red-600 hover:border-red-200" onClick={(e) => { e.stopPropagation(); }}>
          <Trash2 className="w-3 h-3" />
        </Button>
      </div>
    </div>
  );
}
