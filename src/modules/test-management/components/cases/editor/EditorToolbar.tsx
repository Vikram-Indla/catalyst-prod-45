/**
 * Editor Toolbar Component
 * Rich text formatting toolbar with AI assist button
 */

import React from 'react';
import {
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  CheckSquare,
  Code,
  Link2,
  Image,
  Paperclip,
  AtSign,
  Hash,
  Eye,
  Maximize2,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface ToolbarButtonProps {
  icon: React.ReactNode;
  label: string;
  isActive?: boolean;
  onClick?: () => void;
}

function ToolbarButton({ icon, label, isActive, onClick }: ToolbarButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={onClick}
          className={cn(
            'flex items-center justify-center w-[30px] h-[30px] rounded-md bg-transparent border-none',
            'text-muted-foreground cursor-pointer transition-all duration-100',
            'hover:bg-muted hover:text-foreground',
            isActive && 'bg-primary/10 text-primary'
          )}
        >
          {icon}
        </button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

interface EditorToolbarProps {
  onAIAssist?: () => void;
  onPreview?: () => void;
  onFullscreen?: () => void;
}

export function EditorToolbar({ onAIAssist, onPreview, onFullscreen }: EditorToolbarProps) {
  return (
    <div className="flex items-center justify-between px-5 py-2 bg-background border-b border-border shrink-0">
      <div className="flex items-center gap-0.5">
        {/* Text formatting */}
        <ToolbarButton icon={<Bold className="h-4 w-4" />} label="Bold (⌘B)" />
        <ToolbarButton icon={<Italic className="h-4 w-4" />} label="Italic (⌘I)" />
        <ToolbarButton icon={<Underline className="h-4 w-4" />} label="Underline (⌘U)" />
        
        <Separator orientation="vertical" className="h-[18px] mx-1.5" />
        
        {/* Lists */}
        <ToolbarButton icon={<List className="h-4 w-4" />} label="Bullet List" />
        <ToolbarButton icon={<ListOrdered className="h-4 w-4" />} label="Numbered List" />
        <ToolbarButton icon={<CheckSquare className="h-4 w-4" />} label="Checklist" />
        
        <Separator orientation="vertical" className="h-[18px] mx-1.5" />
        
        {/* Code & Links */}
        <ToolbarButton icon={<Code className="h-4 w-4" />} label="Code" />
        <ToolbarButton icon={<Link2 className="h-4 w-4" />} label="Link (⌘K)" />
        
        <Separator orientation="vertical" className="h-[18px] mx-1.5" />
        
        {/* Media */}
        <ToolbarButton icon={<Image className="h-4 w-4" />} label="Image" />
        <ToolbarButton icon={<Paperclip className="h-4 w-4" />} label="Attachment" />
        
        <Separator orientation="vertical" className="h-[18px] mx-1.5" />
        
        {/* Mentions */}
        <ToolbarButton icon={<AtSign className="h-4 w-4" />} label="Mention" />
        <ToolbarButton icon={<Hash className="h-4 w-4" />} label="Tag" />
      </div>

      <div className="flex items-center gap-2">
        {/* AI Assist Button */}
        <button
          type="button"
          onClick={onAIAssist}
          className={cn(
            'inline-flex items-center gap-1.5 px-3 py-1.5',
            'bg-gradient-to-r from-primary/10 to-purple-500/10',
            'border border-primary/20 rounded-lg',
            'text-xs font-medium text-primary',
            'cursor-pointer transition-all duration-150',
            'hover:from-primary/20 hover:to-purple-500/20',
            'hover:border-primary/30 hover:shadow-[0_0_20px_hsl(var(--primary)/0.15)]',
            'hover:-translate-y-px'
          )}
        >
          <div className="flex items-center justify-center w-[18px] h-[18px] bg-gradient-to-br from-primary to-purple-500 rounded text-white">
            <Sparkles className="h-3 w-3" />
          </div>
          AI Assist
        </button>

        <Separator orientation="vertical" className="h-[18px]" />

        {/* View controls */}
        <ToolbarButton icon={<Eye className="h-4 w-4" />} label="Preview" onClick={onPreview} />
        <ToolbarButton icon={<Maximize2 className="h-4 w-4" />} label="Fullscreen" onClick={onFullscreen} />
      </div>
    </div>
  );
}
