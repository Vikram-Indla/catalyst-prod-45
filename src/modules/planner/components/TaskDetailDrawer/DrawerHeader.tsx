// ============================================================
// DRAWER HEADER COMPONENT
// Cover gradient, breadcrumb, key, status, inline title
// ============================================================

import { useState } from 'react';
import { X, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { CATALYST_COLORS, PRIORITY_STYLES } from '../../types/kanban';
import { InlineEditable } from './InlineEditable';
import { StatusDropdown } from './StatusDropdown';

interface DrawerHeaderProps {
  task: any;
  onClose: () => void;
  onTitleChange: (title: string) => void;
  onStatusChange: (statusId: string) => void;
}

export function DrawerHeader({ task, onClose, onTitleChange, onStatusChange }: DrawerHeaderProps) {
  return (
    <div className="relative">
      {/* Gradient Cover */}
      <div 
        className="h-28 relative overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${CATALYST_COLORS.primary} 0%, ${CATALYST_COLORS.teal} 100%)`
        }}
      >
        {/* Decorative patterns */}
        <div 
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `radial-gradient(circle at 20% 50%, white 1px, transparent 1px),
                             radial-gradient(circle at 80% 20%, white 1px, transparent 1px),
                             radial-gradient(circle at 40% 80%, white 1px, transparent 1px)`,
            backgroundSize: '60px 60px',
          }}
        />
        
        {/* Close button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
      
      {/* Content overlay */}
      <div className="px-5 -mt-8 relative z-10">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 text-xs mb-2">
          {task.workstream && (
            <>
              <span className="text-white/80 font-medium">
                {task.workstream.name}
              </span>
              <ChevronRight className="w-3 h-3 text-white/50" />
            </>
          )}
          <span className="text-white font-semibold">
            {task.key}
          </span>
        </div>
        
        {/* Status Badge */}
        <div className="mb-3">
          <StatusDropdown
            currentStatusId={task.status_id}
            currentStatus={task.status}
            onChange={onStatusChange}
          />
        </div>
        
        {/* Title */}
        <div className="bg-card rounded-lg px-4 py-3 shadow-sm border border-border">
          <InlineEditable
            value={task.title}
            onChange={onTitleChange}
            className="text-lg font-semibold text-foreground"
            placeholder="Task title..."
          />
        </div>
      </div>
    </div>
  );
}
