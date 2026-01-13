/**
 * Annotation Toolbar Component
 * TC-186 to TC-230: Tool selection and configuration UI
 */

import React from 'react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Slider } from '@/components/ui/slider';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  MousePointer2,
  Square,
  ArrowUpRight,
  Type,
  Eraser,
  Highlighter,
  Pencil,
  Undo2,
  Redo2,
  Trash2,
  Download,
  Check,
  Palette,
} from 'lucide-react';
import { AnnotationTool, AnnotationColor, COLOR_VALUES } from './types';
import { cn } from '@/lib/utils';

interface AnnotationToolbarProps {
  currentTool: AnnotationTool;
  currentColor: AnnotationColor;
  strokeWidth: number;
  fontSize: number;
  canUndo: boolean;
  canRedo: boolean;
  hasSelection: boolean;
  onToolChange: (tool: AnnotationTool) => void;
  onColorChange: (color: AnnotationColor) => void;
  onStrokeWidthChange: (width: number) => void;
  onFontSizeChange: (size: number) => void;
  onUndo: () => void;
  onRedo: () => void;
  onDelete: () => void;
  onClear: () => void;
  onSave: () => void;
}

const tools: { tool: AnnotationTool; icon: React.ReactNode; label: string; shortcut: string }[] = [
  { tool: 'select', icon: <MousePointer2 className="h-4 w-4" />, label: 'Select', shortcut: 'V' },
  { tool: 'rectangle', icon: <Square className="h-4 w-4" />, label: 'Rectangle', shortcut: 'R' },
  { tool: 'arrow', icon: <ArrowUpRight className="h-4 w-4" />, label: 'Arrow', shortcut: 'A' },
  { tool: 'text', icon: <Type className="h-4 w-4" />, label: 'Text', shortcut: 'T' },
  { tool: 'blur', icon: <Eraser className="h-4 w-4" />, label: 'Blur/Redact', shortcut: 'B' },
  { tool: 'highlight', icon: <Highlighter className="h-4 w-4" />, label: 'Highlight', shortcut: 'H' },
  { tool: 'freehand', icon: <Pencil className="h-4 w-4" />, label: 'Freehand', shortcut: 'P' },
];

const colors: AnnotationColor[] = ['red', 'yellow', 'green', 'blue', 'white', 'black'];

export function AnnotationToolbar({
  currentTool,
  currentColor,
  strokeWidth,
  fontSize,
  canUndo,
  canRedo,
  hasSelection,
  onToolChange,
  onColorChange,
  onStrokeWidthChange,
  onFontSizeChange,
  onUndo,
  onRedo,
  onDelete,
  onClear,
  onSave,
}: AnnotationToolbarProps) {
  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex flex-wrap items-center gap-1 rounded-lg border bg-background p-1 shadow-sm">
        {/* Tool Selection */}
        <div className="flex items-center gap-0.5">
          {tools.map(({ tool, icon, label, shortcut }) => (
            <Tooltip key={tool}>
              <TooltipTrigger asChild>
                <Button
                  variant={currentTool === tool ? 'default' : 'ghost'}
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => onToolChange(tool)}
                >
                  {icon}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>{label} ({shortcut})</p>
              </TooltipContent>
            </Tooltip>
          ))}
        </div>

        <Separator orientation="vertical" className="mx-1 h-6" />

        {/* Color Picker */}
        <Popover>
          <Tooltip>
            <TooltipTrigger asChild>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <div
                    className="h-5 w-5 rounded border-2 border-muted-foreground/30"
                    style={{ backgroundColor: COLOR_VALUES[currentColor] }}
                  />
                </Button>
              </PopoverTrigger>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>Color</p>
            </TooltipContent>
          </Tooltip>
          <PopoverContent className="w-auto p-2" align="start">
            <div className="grid grid-cols-3 gap-1">
              {colors.map((color) => (
                <button
                  key={color}
                  className={cn(
                    'relative h-8 w-8 rounded border-2 transition-all hover:scale-110',
                    currentColor === color ? 'border-primary' : 'border-transparent'
                  )}
                  style={{ backgroundColor: COLOR_VALUES[color] }}
                  onClick={() => onColorChange(color)}
                >
                  {currentColor === color && (
                    <Check className={cn(
                      'absolute inset-0 m-auto h-4 w-4',
                      color === 'white' || color === 'yellow' ? 'text-black' : 'text-white'
                    )} />
                  )}
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        {/* Stroke Width */}
        <Popover>
          <Tooltip>
            <TooltipTrigger asChild>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 px-2 text-xs">
                  {strokeWidth}px
                </Button>
              </PopoverTrigger>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>Stroke Width</p>
            </TooltipContent>
          </Tooltip>
          <PopoverContent className="w-48" align="start">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Stroke Width</span>
                <span className="text-muted-foreground">{strokeWidth}px</span>
              </div>
              <Slider
                value={[strokeWidth]}
                onValueChange={([v]) => onStrokeWidthChange(v)}
                min={1}
                max={10}
                step={1}
              />
            </div>
          </PopoverContent>
        </Popover>

        {/* Font Size (for text tool) */}
        {currentTool === 'text' && (
          <Popover>
            <Tooltip>
              <TooltipTrigger asChild>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 px-2 text-xs">
                    {fontSize}pt
                  </Button>
                </PopoverTrigger>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>Font Size</p>
              </TooltipContent>
            </Tooltip>
            <PopoverContent className="w-48" align="start">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Font Size</span>
                  <span className="text-muted-foreground">{fontSize}pt</span>
                </div>
                <Slider
                  value={[fontSize]}
                  onValueChange={([v]) => onFontSizeChange(v)}
                  min={10}
                  max={48}
                  step={2}
                />
              </div>
            </PopoverContent>
          </Popover>
        )}

        <Separator orientation="vertical" className="mx-1 h-6" />

        {/* Undo/Redo */}
        <div className="flex items-center gap-0.5">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={onUndo}
                disabled={!canUndo}
              >
                <Undo2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>Undo (Ctrl+Z)</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={onRedo}
                disabled={!canRedo}
              >
                <Redo2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>Redo (Ctrl+Y)</p>
            </TooltipContent>
          </Tooltip>
        </div>

        <Separator orientation="vertical" className="mx-1 h-6" />

        {/* Delete/Clear */}
        <div className="flex items-center gap-0.5">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={onDelete}
                disabled={!hasSelection}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>Delete Selected (Del)</p>
            </TooltipContent>
          </Tooltip>
        </div>

        <div className="ml-auto flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="default"
                size="sm"
                className="h-8 gap-1.5"
                onClick={onSave}
              >
                <Download className="h-4 w-4" />
                Save
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>Save Annotated Image</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    </TooltipProvider>
  );
}
