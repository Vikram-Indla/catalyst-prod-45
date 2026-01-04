/**
 * Context Menu for Heatmap Cells
 * Appears on right-click with relevant actions
 */

import { memo, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { 
  AlertTriangle, BarChart2, UserPlus, Calendar,
  MessageSquare, Copy, ExternalLink, Edit2
} from 'lucide-react';
import type { HeatmapResource, MonthlyUtilization } from '@/types/capacity-heatmap';
import { CATALYST_COLORS } from '@/types/capacity-heatmap';
import { formatMonth } from '@/lib/capacity-heatmap/utils';
import { toast } from 'sonner';

interface ContextMenuProps {
  x: number;
  y: number;
  resource: HeatmapResource;
  utilization: MonthlyUtilization;
  onClose: () => void;
  onAction: (action: string) => void;
}

type MenuItem = {
  type?: 'separator';
  icon?: typeof AlertTriangle;
  label?: string;
  action?: string;
  iconColor?: string;
  textColor?: string;
  onClick?: () => void;
};

export const HeatmapContextMenu = memo(function HeatmapContextMenu({
  x,
  y,
  resource,
  utilization,
  onClose,
  onAction,
}: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on escape or click outside
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  // Adjust position to stay in viewport
  const adjustedX = Math.min(x, window.innerWidth - 250);
  const adjustedY = Math.min(y, window.innerHeight - 350);

  const handleCopy = () => {
    const text = `${resource.name} - ${formatMonth(utilization.month, 'long')}: ${utilization.percentage}%`;
    navigator.clipboard.writeText(text).then(() => {
      toast.success('Copied to clipboard');
    });
    onClose();
  };

  const menuItems: MenuItem[] = [
    // Conflict resolution (if over-allocated)
    ...(utilization.isConflict ? [{
      icon: AlertTriangle,
      label: 'Resolve Conflict',
      action: 'resolve-conflict',
      iconColor: CATALYST_COLORS.danger,
      textColor: CATALYST_COLORS.danger,
    }] : []),
    
    // Standard actions
    {
      icon: BarChart2,
      label: 'View Breakdown',
      action: 'view-breakdown',
    },
    {
      icon: Edit2,
      label: 'Edit Allocation',
      action: 'edit-allocation',
    },
    {
      icon: UserPlus,
      label: 'Find Replacement',
      action: 'find-replacement',
    },
    {
      icon: Calendar,
      label: 'Adjust Timeline',
      action: 'adjust-timeline',
    },
    
    { type: 'separator' as const },
    
    {
      icon: MessageSquare,
      label: `Message ${resource.name.split(' ')[0]}`,
      action: 'send-message',
    },
    {
      icon: Copy,
      label: 'Copy Details',
      action: 'copy',
      onClick: handleCopy,
    },
    {
      icon: ExternalLink,
      label: 'Open Profile',
      action: 'open-profile',
    },
  ];

  return (
    <motion.div
      ref={menuRef}
      className="fixed z-[100] bg-popover border border-border rounded-lg shadow-lg overflow-hidden min-w-[200px]"
      style={{ left: adjustedX, top: adjustedY }}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.1 }}
    >
      {/* Header */}
      <div className="px-3 py-2 border-b border-border bg-muted/30">
        <div className="font-medium text-sm text-foreground">
          {resource.name}
        </div>
        <div className="text-xs text-muted-foreground">
          {formatMonth(utilization.month, 'long')} • {utilization.percentage}%
        </div>
      </div>

      {/* Menu items */}
      <div className="py-1">
        {menuItems.map((item, index) => {
          if (item.type === 'separator') {
            return (
              <div 
                key={`sep-${index}`}
                className="my-1 border-t border-border"
              />
            );
          }

          const Icon = item.icon!;
          return (
            <button
              key={item.action}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted/50 transition-colors text-left"
              style={{ color: item.textColor }}
              onClick={() => {
                if (item.onClick) {
                  item.onClick();
                } else {
                  onAction(item.action!);
                  onClose();
                }
              }}
            >
              <Icon 
                className="w-4 h-4" 
                style={{ color: item.iconColor }}
              />
              {item.label}
            </button>
          );
        })}
      </div>

      {/* Keyboard hint */}
      <div className="px-3 py-1.5 border-t border-border bg-muted/20 text-[10px] text-muted-foreground">
        Press Esc to close
      </div>
    </motion.div>
  );
});
