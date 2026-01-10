import React from 'react';
import { cn } from '@/lib/utils';
import { Calendar, FileText, FlaskConical, RotateCcw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarGroup } from '@/components/ui/avatar';
import { QualityGauge } from './QualityGauge';

export interface ReleaseCardProps {
  id: string;
  releaseKey: string;
  name: string;
  dateRange: string;
  health: number;
  healthStatus: 'excellent' | 'good' | 'caution' | 'at-risk';
  stats: {
    workItems: number;
    testCases: number;
    cycles: number;
  };
  status: 'draft' | 'active' | 'approved' | 'rejected' | 'at-risk';
  team: Array<{ initials: string; name: string; color: string }>;
  onClick?: () => void;
  className?: string;
  animationDelay?: number;
}

// FIX 5: Add 'at-risk' status with warning variant
const statusBadgeVariant: Record<string, 'draft' | 'active' | 'approved' | 'rejected' | 'warning'> = {
  draft: 'draft',
  active: 'active',
  approved: 'approved',
  rejected: 'rejected',
  'at-risk': 'warning',
};

export function ReleaseCard({
  releaseKey,
  name,
  dateRange,
  health,
  healthStatus,
  stats,
  status,
  team,
  onClick,
  className,
  animationDelay = 0,
}: ReleaseCardProps) {
  const [isVisible, setIsVisible] = React.useState(false);

  React.useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), animationDelay);
    return () => clearTimeout(timer);
  }, [animationDelay]);

  return (
    <div
      onClick={onClick}
      className={cn(
        'group relative bg-card border rounded-xl p-5 transition-all duration-200 cursor-pointer',
        'hover:shadow-lg hover:border-primary/30 hover:-translate-y-0.5',
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4',
        className
      )}
      style={{ transitionDelay: `${animationDelay}ms` }}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick?.()}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono font-medium text-muted-foreground">
              {releaseKey}
            </span>
            <Badge variant={statusBadgeVariant[status] || 'default'} size="sm">
              {status === 'at-risk' ? 'At Risk' : status.charAt(0).toUpperCase() + status.slice(1)}
            </Badge>
          </div>
          <h3 className="text-base font-semibold text-foreground truncate group-hover:text-primary transition-colors">
            {name}
          </h3>
          <div className="flex items-center gap-1.5 mt-1.5 text-xs text-muted-foreground">
            <Calendar className="h-3.5 w-3.5" />
            <span>{dateRange}</span>
          </div>
        </div>
        
        {/* Quality Gauge */}
        <QualityGauge
          value={health}
          status={healthStatus}
          size={80}
          animate={isVisible}
        />
      </div>
      
      {/* Stats */}
      <div className="flex items-center gap-4 py-3 border-t border-b border-border/50 my-4">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <FileText className="h-3.5 w-3.5" />
          <span className="font-medium text-foreground">{stats.workItems}</span>
          <span>Items</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <FlaskConical className="h-3.5 w-3.5" />
          <span className="font-medium text-foreground">{stats.testCases}</span>
          <span>Tests</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <RotateCcw className="h-3.5 w-3.5" />
          <span className="font-medium text-foreground">{stats.cycles}</span>
          <span>Cycles</span>
        </div>
      </div>
      
      {/* Team - FIX 9: Remove "Team" label, just show avatars */}
      <div className="flex items-center justify-end">
        <AvatarGroup max={4}>
          {team.map((member, i) => (
            <Avatar key={i} size="sm" className="border-2 border-card">
              <AvatarFallback style={{ backgroundColor: member.color }} className="text-white text-[10px] font-medium">
                {member.initials}
              </AvatarFallback>
            </Avatar>
          ))}
        </AvatarGroup>
      </div>
    </div>
  );
}

export default ReleaseCard;
