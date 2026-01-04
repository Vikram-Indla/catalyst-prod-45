/**
 * Defect Card Component - for Board view
 */

import React from 'react';
import { Flame, AlertTriangle, Info, Minus, Link2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import type { Defect, DefectSeverity } from '../../api/types';

interface DefectCardProps {
  defect: Defect;
  onClick?: () => void;
  isDragging?: boolean;
}

const SEVERITY_CONFIG: Record<DefectSeverity, { 
  label: string; 
  icon: React.ElementType;
  bgColor: string;
  borderColor: string;
}> = {
  critical: { 
    label: 'Critical', 
    icon: Flame, 
    bgColor: 'bg-danger/10',
    borderColor: 'border-l-danger'
  },
  major: { 
    label: 'Major', 
    icon: AlertTriangle, 
    bgColor: 'bg-warning/10',
    borderColor: 'border-l-warning'
  },
  minor: { 
    label: 'Minor', 
    icon: Info, 
    bgColor: 'bg-yellow-500/10',
    borderColor: 'border-l-yellow-500'
  },
  trivial: { 
    label: 'Trivial', 
    icon: Minus, 
    bgColor: 'bg-muted',
    borderColor: 'border-l-muted-foreground'
  },
};

export function DefectCard({ defect, onClick, isDragging }: DefectCardProps) {
  const severityConfig = SEVERITY_CONFIG[defect.severity];
  const SeverityIcon = severityConfig.icon;

  const getInitials = (name?: string) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <div
      className={cn(
        "bg-card border rounded-lg p-3 cursor-pointer transition-all border-l-4",
        severityConfig.borderColor,
        isDragging 
          ? "shadow-lg ring-2 ring-primary/20 rotate-2" 
          : "hover:shadow-md hover:border-primary/30"
      )}
      onClick={onClick}
    >
      {/* Key & Severity */}
      <div className="flex items-center justify-between mb-2">
        <span className="font-mono text-xs text-primary">{defect.defect_key}</span>
        <Badge className={cn('text-[10px] gap-0.5 px-1.5 py-0', severityConfig.bgColor)}>
          <SeverityIcon className="h-2.5 w-2.5" />
          {severityConfig.label}
        </Badge>
      </div>

      {/* Title */}
      <p className="text-sm font-medium line-clamp-2 mb-2">{defect.title}</p>

      {/* Footer */}
      <div className="flex items-center justify-between">
        {defect.assigned_user ? (
          <div className="flex items-center gap-1.5">
            <Avatar className="h-5 w-5">
              <AvatarImage src={defect.assigned_user.avatar_url} />
              <AvatarFallback className="text-[9px]">
                {getInitials(defect.assigned_user.full_name)}
              </AvatarFallback>
            </Avatar>
            <span className="text-xs text-muted-foreground truncate max-w-[80px]">
              {defect.assigned_user.full_name?.split(' ')[0]}
            </span>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground italic">Unassigned</span>
        )}

        {defect.linked_run_id && (
          <Link2 className="h-3.5 w-3.5 text-muted-foreground" />
        )}
      </div>
    </div>
  );
}
