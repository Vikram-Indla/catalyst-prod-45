/**
 * Prompt 9: Undo/Redo Controls
 * UI controls with keyboard shortcuts
 */

import { useEffect, useState } from 'react';
import { Undo2, Redo2, History, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { useUndoRedo } from '@/contexts/UndoRedoContext';
import { formatDistanceToNow } from 'date-fns';

interface UndoRedoControlsProps {
  onUndo?: () => void;
  onRedo?: () => void;
  className?: string;
}

export function UndoRedoControls({ onUndo, onRedo, className }: UndoRedoControlsProps) {
  const { canUndo, canRedo, past, future, undo, redo } = useUndoRedo();
  const [showHistory, setShowHistory] = useState(false);

  // Handle undo action
  const handleUndo = () => {
    const action = undo();
    if (action) {
      onUndo?.();
    }
  };

  // Handle redo action
  const handleRedo = () => {
    const action = redo();
    if (action) {
      onRedo?.();
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + Z = Undo
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        if (canUndo) handleUndo();
      }
      // Ctrl/Cmd + Shift + Z = Redo
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && e.shiftKey) {
        e.preventDefault();
        if (canRedo) handleRedo();
      }
      // Ctrl/Cmd + Y = Redo (Windows style)
      if ((e.metaKey || e.ctrlKey) && e.key === 'y') {
        e.preventDefault();
        if (canRedo) handleRedo();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [canUndo, canRedo]);

  const isMac = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;

  return (
    <TooltipProvider>
      <div className={cn("flex items-center gap-1", className)}>
        {/* Undo Button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleUndo}
              disabled={!canUndo}
              className="h-8 w-8 p-0"
            >
              <Undo2 className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p className="text-xs">
              Undo {isMac ? '⌘Z' : 'Ctrl+Z'}
              {canUndo && past.length > 0 && (
                <span className="block text-muted-foreground mt-0.5">
                  {past[past.length - 1].description}
                </span>
              )}
            </p>
          </TooltipContent>
        </Tooltip>

        {/* Redo Button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRedo}
              disabled={!canRedo}
              className="h-8 w-8 p-0"
            >
              <Redo2 className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p className="text-xs">
              Redo {isMac ? '⇧⌘Z' : 'Ctrl+Y'}
            </p>
          </TooltipContent>
        </Tooltip>

        {/* History Dropdown */}
        <DropdownMenu open={showHistory} onOpenChange={setShowHistory}>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-xs gap-1"
              disabled={past.length === 0 && future.length === 0}
            >
              <History className="h-4 w-4" />
              {past.length > 0 && (
                <span className="text-muted-foreground">{past.length}</span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-72">
            <DropdownMenuLabel className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Action History
            </DropdownMenuLabel>
            <DropdownMenuSeparator />

            {past.length === 0 && future.length === 0 ? (
              <div className="px-3 py-4 text-center text-sm text-muted-foreground">
                No actions yet
              </div>
            ) : (
              <div className="max-h-64 overflow-y-auto">
                {/* Future actions (greyed out) */}
                {future.map((action, i) => (
                  <DropdownMenuItem
                    key={action.id}
                    className="px-3 py-2 opacity-50 cursor-pointer"
                    onClick={() => {
                      // Redo to this point
                      for (let j = 0; j <= i; j++) redo();
                    }}
                  >
                    <div className="flex items-center gap-2 w-full">
                      <Redo2 className="h-3 w-3 text-muted-foreground shrink-0" />
                      <span className="text-sm truncate flex-1">{action.description}</span>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {formatDistanceToNow(action.timestamp, { addSuffix: true })}
                      </span>
                    </div>
                  </DropdownMenuItem>
                ))}

                {/* Current state marker */}
                {(past.length > 0 || future.length > 0) && (
                  <div className="px-3 py-1.5 text-xs text-muted-foreground border-y border-border bg-muted/50">
                    ↑ Current State ↑
                  </div>
                )}

                {/* Past actions */}
                {[...past].reverse().map((action, i) => (
                  <DropdownMenuItem
                    key={action.id}
                    className="px-3 py-2 cursor-pointer"
                    onClick={() => {
                      // Undo to this point
                      for (let j = 0; j <= i; j++) undo();
                    }}
                  >
                    <div className="flex items-center gap-2 w-full">
                      <Undo2 className="h-3 w-3 text-muted-foreground shrink-0" />
                      <span className="text-sm truncate flex-1">{action.description}</span>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {formatDistanceToNow(action.timestamp, { addSuffix: true })}
                      </span>
                    </div>
                  </DropdownMenuItem>
                ))}
              </div>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </TooltipProvider>
  );
}
