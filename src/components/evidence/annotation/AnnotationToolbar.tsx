// ═══════════════════════════════════════════════════════════════════════════
// ANNOTATION TOOLBAR
// ═══════════════════════════════════════════════════════════════════════════

import React from 'react';
import { 
  MousePointer, ArrowUpRight, Square, Circle, Type, 
  Pencil, EyeOff, Highlighter, Undo, Redo, Trash2, XCircle 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ToolbarProps, Tool, COLORS, STROKE_WIDTHS, TOOLS } from './types';

const TOOL_ICONS: Record<Tool, React.FC<{ className?: string }>> = {
  select: MousePointer,
  arrow: ArrowUpRight,
  rectangle: Square,
  circle: Circle,
  text: Type,
  freehand: Pencil,
  blur: EyeOff,
  highlight: Highlighter,
};

export const AnnotationToolbar: React.FC<ToolbarProps> = ({
  activeTool,
  activeColor,
  strokeWidth,
  onToolChange,
  onColorChange,
  onStrokeChange,
  onUndo,
  onRedo,
  onClear,
  onDelete,
  canUndo,
  canRedo,
  hasSelection
}) => {
  return (
    <div className="bg-foreground/90 border-t border-foreground/70 p-3">
      <div className="flex items-center justify-center gap-6 flex-wrap">
        {/* Tools */}
        <div className="flex items-center gap-1 bg-foreground rounded-lg p-1">
          {TOOLS.map(tool => {
            const Icon = TOOL_ICONS[tool.id];
            return (
              <button
                key={tool.id}
                onClick={() => onToolChange(tool.id)}
                className={cn(
                  "p-2.5 rounded-lg flex flex-col items-center gap-1 transition-colors",
                  activeTool === tool.id 
                    ? "bg-primary text-primary-foreground" 
                    : "text-background/60 hover:text-background hover:bg-background/10"
                )}
                title={`${tool.label} (${tool.shortcut})`}
              >
                <Icon className="w-5 h-5" />
              </button>
            );
          })}
        </div>
        
        {/* Divider */}
        <div className="w-px h-8 bg-background/20" />
        
        {/* Colors */}
        <div className="flex items-center gap-2">
          {COLORS.map(color => (
            <button
              key={color.value}
              onClick={() => onColorChange(color.value)}
              className={cn(
                "w-7 h-7 rounded-full border-2 transition-transform",
                activeColor === color.value 
                  ? "border-background scale-110" 
                  : "border-transparent hover:scale-105"
              )}
              style={{ backgroundColor: color.value }}
              title={color.label}
            />
          ))}
        </div>
        
        {/* Divider */}
        <div className="w-px h-8 bg-background/20" />
        
        {/* Stroke Width */}
        <div className="flex items-center gap-2">
          {STROKE_WIDTHS.map(width => (
            <button
              key={width}
              onClick={() => onStrokeChange(width)}
              className={cn(
                "w-8 h-8 rounded flex items-center justify-center",
                strokeWidth === width 
                  ? "bg-background/20" 
                  : "hover:bg-background/10"
              )}
              title={`${width}px`}
            >
              <div 
                className="rounded-full bg-background" 
                style={{ width: width * 2, height: width * 2 }}
              />
            </button>
          ))}
        </div>
        
        {/* Divider */}
        <div className="w-px h-8 bg-background/20" />
        
        {/* Actions */}
        <div className="flex items-center gap-1">
          <button
            onClick={onUndo}
            disabled={!canUndo}
            className="p-2 text-background/60 hover:text-background disabled:opacity-30 disabled:cursor-not-allowed"
            title="Undo (Ctrl+Z)"
          >
            <Undo className="w-5 h-5" />
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            className="p-2 text-background/60 hover:text-background disabled:opacity-30 disabled:cursor-not-allowed"
            title="Redo (Ctrl+Y)"
          >
            <Redo className="w-5 h-5" />
          </button>
          <button
            onClick={onDelete}
            disabled={!hasSelection}
            className="p-2 text-background/60 hover:text-destructive disabled:opacity-30 disabled:cursor-not-allowed"
            title="Delete (Del)"
          >
            <Trash2 className="w-5 h-5" />
          </button>
          <button
            onClick={onClear}
            className="p-2 text-background/60 hover:text-destructive"
            title="Clear All"
          >
            <XCircle className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};
