// ============================================================
// DASHBOARD ROLE BANNER - V3 Design Spec
// Clean pill badge + context text, no icons
// ============================================================

import { Users } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DashboardRoleBannerProps {
  userRole: string;
  assignedWorkstreams: Array<{ id: string; name: string; color: string }>;
  isViewingAll: boolean;
}

const ROLE_LABELS: Record<string, { label: string; className: string }> = {
  super_admin: { label: 'Super Admin', className: 'border-purple-300 text-purple-700 dark:border-purple-600 dark:text-purple-300' },
  admin: { label: 'Admin', className: 'border-blue-300 text-blue-700 dark:border-blue-600 dark:text-blue-300' },
  program_manager: { label: 'Program Manager', className: 'border-indigo-300 text-indigo-700 dark:border-indigo-600 dark:text-indigo-300' },
  management: { label: 'Management', className: 'border-emerald-300 text-emerald-700 dark:border-emerald-600 dark:text-emerald-300' },
  team_lead: { label: 'Team Lead', className: 'border-blue-300 text-blue-700 dark:border-blue-600 dark:text-blue-300' },
  developer: { label: 'Developer', className: 'border-slate-300 text-slate-700 dark:border-slate-600 dark:text-slate-300' },
  member: { label: 'Team Member', className: 'border-slate-300 text-slate-700 dark:border-slate-600 dark:text-slate-300' },
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
          Viewing <strong className="font-semibold text-slate-900 dark:text-slate-100">{assignedWorkstreams[0].name}</strong> workstream
        </>
      );
    }
    
    if (assignedWorkstreams.length === 2) {
      return (
        <>
          Viewing <strong className="font-semibold text-slate-900 dark:text-slate-100">{assignedWorkstreams[0].name}</strong> and{' '}
          <strong className="font-semibold text-slate-900 dark:text-slate-100">{assignedWorkstreams[1].name}</strong> workstreams
        </>
      );
    }
    
    // 3+ workstreams
    const firstTwo = assignedWorkstreams.slice(0, 2);
    const remaining = assignedWorkstreams.length - 2;
    return (
      <>
        Viewing <strong className="font-semibold text-slate-900 dark:text-slate-100">{firstTwo[0].name}</strong>,{' '}
        <strong className="font-semibold text-slate-900 dark:text-slate-100">{firstTwo[1].name}</strong>{' '}
        and {remaining} more workstream{remaining > 1 ? 's' : ''}
      </>
    );
  };

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
      {/* Role badge - pill with border, no background */}
      <span className={cn(
        'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border-2 bg-white dark:bg-slate-900',
        roleConfig.className
      )}>
        <Users className="w-3.5 h-3.5" />
        {roleConfig.label}
      </span>
      
      {/* Context text */}
      <span className="text-sm text-slate-600 dark:text-slate-400">
        {getContextText()}
      </span>
    </div>
  );
}
