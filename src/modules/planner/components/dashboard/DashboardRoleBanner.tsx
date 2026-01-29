// ============================================================
// DASHBOARD ROLE BANNER - V2 Implementation
// Shows current user's role and workstream visibility context
// Per V2 Spec: "Viewing Catalyst and Senaei workstreams"
// ============================================================

import { Shield, Eye } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

interface DashboardRoleBannerProps {
  userRole: string;
  assignedWorkstreams: Array<{ id: string; name: string; color: string }>;
  isViewingAll: boolean;
}

const ROLE_LABELS: Record<string, { label: string; className: string }> = {
  super_admin: { label: 'Super Admin', className: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300' },
  admin: { label: 'Admin', className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300' },
  program_manager: { label: 'Program Manager', className: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300' },
  management: { label: 'Management', className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300' },
  team_lead: { label: 'Team Lead', className: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300' },
  developer: { label: 'Developer', className: 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300' },
  member: { label: 'Team Member', className: 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300' },
};

export function DashboardRoleBanner({ 
  userRole, 
  assignedWorkstreams, 
  isViewingAll 
}: DashboardRoleBannerProps) {
  const roleConfig = ROLE_LABELS[userRole] || ROLE_LABELS.member;
  
  // Build workstream context string
  const getContextText = () => {
    if (isViewingAll) {
      return 'Viewing all workstreams';
    }
    
    if (assignedWorkstreams.length === 0) {
      return 'No workstreams assigned';
    }
    
    if (assignedWorkstreams.length === 1) {
      return (
        <>
          Viewing <strong className="font-semibold">{assignedWorkstreams[0].name}</strong> workstream
        </>
      );
    }
    
    if (assignedWorkstreams.length === 2) {
      return (
        <>
          Viewing <strong className="font-semibold">{assignedWorkstreams[0].name}</strong> and{' '}
          <strong className="font-semibold">{assignedWorkstreams[1].name}</strong> workstreams
        </>
      );
    }
    
    // 3+ workstreams
    const firstTwo = assignedWorkstreams.slice(0, 2);
    const remaining = assignedWorkstreams.length - 2;
    return (
      <>
        Viewing <strong className="font-semibold">{firstTwo[0].name}</strong>,{' '}
        <strong className="font-semibold">{firstTwo[1].name}</strong>{' '}
        and {remaining} more workstream{remaining > 1 ? 's' : ''}
      </>
    );
  };

  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
      {/* Role badge */}
      <span className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium',
        roleConfig.className
      )}>
        <Shield className="w-3 h-3" />
        {roleConfig.label}
      </span>
      
      {/* Context text */}
      <span className="text-sm text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
        <Eye className="w-3.5 h-3.5" />
        {getContextText()}
      </span>
      
      {/* Workstream color dots */}
      {!isViewingAll && assignedWorkstreams.length > 0 && (
        <div className="flex items-center gap-1 ml-2">
          {assignedWorkstreams.slice(0, 5).map((ws) => (
            <div
              key={ws.id}
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: ws.color }}
              title={ws.name}
            />
          ))}
          {assignedWorkstreams.length > 5 && (
            <span className="text-xs text-slate-400">+{assignedWorkstreams.length - 5}</span>
          )}
        </div>
      )}
    </div>
  );
}
