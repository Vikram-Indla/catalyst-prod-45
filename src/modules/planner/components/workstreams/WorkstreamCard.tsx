// ============================================================
// WORKSTREAM CARD COMPONENT
// Visual card for a single workstream with stats and health
// V9 GOD-TIER: Health border accent, improved layout
// ============================================================

import { MoreHorizontal, List, Edit, Archive } from 'lucide-react';
import { cn } from '@/lib/utils';
import { HealthIndicator } from './HealthIndicator';
import type { WorkstreamData } from './types';
import { motion } from 'framer-motion';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface WorkstreamCardProps {
  workstream: WorkstreamData;
  onClick: () => void;
  onViewTasks?: () => void;
  onEdit?: () => void;
  onArchive?: () => void;
  index: number;
}

const HEALTH_BORDER_COLORS = {
  healthy: '#10b981',
  'at-risk': '#f59e0b',
  critical: '#ef4444',
};

export function WorkstreamCard({ workstream, onClick, onViewTasks, onEdit, onArchive, index }: WorkstreamCardProps) {
  const healthBorderColor = HEALTH_BORDER_COLORS[workstream.health];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      onClick={onClick}
      className={cn(
        'group relative rounded-xl border border-slate-200 dark:border-slate-700',
        'bg-white dark:bg-slate-800/50',
        'p-5 cursor-pointer',
        'hover:shadow-lg hover:border-slate-300 dark:hover:border-slate-600',
        'hover:-translate-y-1 transition-all duration-200'
      )}
      style={{
        borderTopWidth: '3px',
        borderTopColor: healthBorderColor,
      }}
    >
      {/* Header: Icon + Name + Code + Menu */}
      <div className="flex items-start gap-3 mb-4">
        {/* Colored Icon with first letter */}
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center text-white text-lg font-bold shadow-sm"
          style={{ backgroundColor: workstream.color }}
        >
          {workstream.name.charAt(0)}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 truncate">
            {workstream.name}
          </h3>
          <span className="text-xs font-mono font-medium text-slate-500 dark:text-slate-400">
            {workstream.code}
          </span>
        </div>
        {/* Menu Button */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              onClick={(e) => e.stopPropagation()}
              className={cn(
                'w-7 h-7 rounded-md flex items-center justify-center',
                'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300',
                'hover:bg-slate-100 dark:hover:bg-slate-700',
                'opacity-0 group-hover:opacity-100 transition-opacity'
              )}
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onViewTasks?.(); }}>
              <List className="w-4 h-4 mr-2" />
              View Tasks
            </DropdownMenuItem>
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit?.(); }}>
              <Edit className="w-4 h-4 mr-2" />
              Edit Workstream
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onArchive?.(); }} className="text-red-600">
              <Archive className="w-4 h-4 mr-2" />
              Archive
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="text-center p-2 rounded-lg bg-slate-50 dark:bg-slate-800">
          <div className="text-xl font-bold text-slate-900 dark:text-slate-100">
            {workstream.task_count}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wide">
            Tasks
          </div>
        </div>
        <div className="text-center p-2 rounded-lg bg-slate-50 dark:bg-slate-800">
          <div className={cn(
            'text-xl font-bold',
            workstream.overdue_count > 0 
              ? 'text-red-600 dark:text-red-400' 
              : 'text-slate-900 dark:text-slate-100'
          )}>
            {workstream.overdue_count}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wide">
            Overdue
          </div>
        </div>
        <div className="text-center p-2 rounded-lg bg-slate-50 dark:bg-slate-800">
          <div className="text-xl font-bold text-slate-900 dark:text-slate-100">
            {workstream.progress}%
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wide">
            Progress
          </div>
        </div>
      </div>

      {/* Footer: Members + Health */}
      <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-700">
        {/* Member Avatars */}
        <div className="flex items-center -space-x-2">
          {workstream.members.slice(0, 3).map((member) => (
            <div
              key={member.id}
              className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-semibold ring-2 ring-white dark:ring-slate-800"
              style={{ backgroundColor: member.color }}
              title={member.initials}
            >
              {member.initials}
            </div>
          ))}
          {workstream.members.length > 3 && (
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-semibold bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-300 ring-2 ring-white dark:ring-slate-800">
              +{workstream.members.length - 3}
            </div>
          )}
          {workstream.members.length === 0 && (
            <span className="text-xs text-slate-400 dark:text-slate-500">No members</span>
          )}
        </div>

        {/* Health Indicator */}
        <HealthIndicator health={workstream.health} size="sm" />
      </div>
    </motion.div>
  );
}
