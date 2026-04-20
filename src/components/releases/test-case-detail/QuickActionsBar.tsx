/**
 * Quick Actions Bar — Floating action bar for test case operations
 */

import { motion } from 'framer-motion';
import { 
  Play, 
  Copy, 
  History, 
  Share2, 
  Printer, 
  Download,
  MessageSquarePlus,
  Bug,
  Link2,
  MoreHorizontal,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip } from '@/components/ads';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface QuickActionsBarProps {
  testCaseId: string;
  onExecute?: () => void;
  onDuplicate?: () => void;
  className?: string;
}

export function QuickActionsBar({ 
  testCaseId, 
  onExecute, 
  onDuplicate,
  className 
}: QuickActionsBarProps) {
  const handleExecute = () => {
    if (onExecute) {
      onExecute();
    } else {
      toast.success('Starting test execution...');
    }
  };

  const handleDuplicate = () => {
    if (onDuplicate) {
      onDuplicate();
    } else {
      toast.success(`Test case duplicated as ${testCaseId}-copy`);
    }
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success('Link copied to clipboard');
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExport = () => {
    toast.success('Exporting test case as PDF...');
  };

  const handleAddComment = () => {
    // Scroll to comments section
    document.querySelector('[data-tab="comments"]')?.scrollIntoView({ behavior: 'smooth' });
    toast.info('Add your comment below');
  };

  const handleLogDefect = () => {
    toast.info('Opening defect creation form...');
  };

  const handleLinkItem = () => {
    toast.info('Opening item linker...');
  };

  const actions = [
    { 
      icon: Play, 
      label: 'Execute', 
      onClick: handleExecute, 
      primary: true,
      shortcut: 'E'
    },
    { 
      icon: Copy, 
      label: 'Duplicate', 
      onClick: handleDuplicate,
      shortcut: 'D'
    },
    { 
      icon: Share2, 
      label: 'Share', 
      onClick: handleShare,
      shortcut: 'S'
    },
  ];

  const moreActions = [
    { icon: History, label: 'View History', onClick: () => toast.info('Opening version history...') },
    { icon: MessageSquarePlus, label: 'Add Comment', onClick: handleAddComment },
    { icon: Bug, label: 'Log Defect', onClick: handleLogDefect },
    { icon: Link2, label: 'Link Item', onClick: handleLinkItem },
    { divider: true },
    { icon: Printer, label: 'Print', onClick: handlePrint },
    { icon: Download, label: 'Export PDF', onClick: handleExport },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "fixed bottom-6 left-1/2 -translate-x-1/2 z-50",
        "bg-background/95 backdrop-blur-sm border border-border rounded-full shadow-lg",
        "px-2 py-2 flex items-center gap-1",
        className
      )}
    >
      {actions.map((action) => (
        <Tooltip
          key={action.label}
          position="top"
          content={
            <>
              {action.label}
              {action.shortcut && (
                <kbd className="ml-2 bg-muted/50 px-1 rounded text-[10px]">
                  {action.shortcut}
                </kbd>
              )}
            </>
          }
        >
          <Button
            variant={action.primary ? "default" : "ghost"}
            size="sm"
            onClick={action.onClick}
            className={cn(
              "h-9 gap-2 rounded-full",
              action.primary && "bg-teal-600 hover:bg-teal-700 text-white"
            )}
          >
            <action.icon className="w-4 h-4" />
            {action.primary && <span className="hidden sm:inline">{action.label}</span>}
          </Button>
        </Tooltip>
      ))}

      <div className="w-px h-6 bg-border mx-1" />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full">
            <MoreHorizontal className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="center" side="top" className="w-48 mb-2">
          {moreActions.map((action, index) => 
            action.divider ? (
              <DropdownMenuSeparator key={index} />
            ) : (
              <DropdownMenuItem key={action.label} onClick={action.onClick}>
                <action.icon className="w-4 h-4 mr-2" />
                {action.label}
              </DropdownMenuItem>
            )
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </motion.div>
  );
}
