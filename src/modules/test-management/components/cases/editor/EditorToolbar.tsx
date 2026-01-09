/**
 * Editor Toolbar Component - Pixel Perfect Match
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
import { Separator } from '@/components/ui/separator';

interface ToolbarButtonProps {
  icon: React.ReactNode;
  title: string;
  onClick?: () => void;
}

function ToolbarButton({ icon, title, onClick }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className="p-1.5 rounded hover:bg-neutral-100 text-neutral-500 hover:text-neutral-700"
    >
      {icon}
    </button>
  );
}

interface EditorToolbarProps {
  onAIAssist?: () => void;
  onPreview?: () => void;
  onFullscreen?: () => void;
}

export function EditorToolbar({ onAIAssist, onPreview, onFullscreen }: EditorToolbarProps) {
  return (
    <div
      className="flex items-center justify-between px-3 border-b bg-white shrink-0"
      style={{ height: '44px', borderColor: '#e5e5e5' }}
    >
      {/* Left - Formatting tools */}
      <div className="flex items-center gap-0.5">
        <ToolbarButton icon={<Bold className="h-4 w-4" />} title="Bold" />
        <ToolbarButton icon={<Italic className="h-4 w-4" />} title="Italic" />
        <ToolbarButton icon={<Underline className="h-4 w-4" />} title="Underline" />
        
        <Separator orientation="vertical" className="h-5 mx-1.5 bg-neutral-200" />
        
        <ToolbarButton icon={<List className="h-4 w-4" />} title="Bullet List" />
        <ToolbarButton icon={<ListOrdered className="h-4 w-4" />} title="Numbered List" />
        <ToolbarButton icon={<CheckSquare className="h-4 w-4" />} title="Checklist" />
        
        <Separator orientation="vertical" className="h-5 mx-1.5 bg-neutral-200" />
        
        <ToolbarButton icon={<Code className="h-4 w-4" />} title="Code" />
        <ToolbarButton icon={<Link2 className="h-4 w-4" />} title="Link" />
        
        <Separator orientation="vertical" className="h-5 mx-1.5 bg-neutral-200" />
        
        <ToolbarButton icon={<Image className="h-4 w-4" />} title="Image" />
        <ToolbarButton icon={<Paperclip className="h-4 w-4" />} title="Attachment" />
        
        <Separator orientation="vertical" className="h-5 mx-1.5 bg-neutral-200" />
        
        <ToolbarButton icon={<AtSign className="h-4 w-4" />} title="Mention" />
        <ToolbarButton icon={<Hash className="h-4 w-4" />} title="Tag" />
      </div>

      {/* Right - AI Assist, Preview, Expand */}
      <div className="flex items-center gap-2">
        {/* AI Assist Button - Blue outline style */}
        <button
          type="button"
          onClick={onAIAssist}
          className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md border text-sm font-medium transition-colors hover:bg-blue-50"
          style={{
            borderColor: '#2563eb',
            color: '#2563eb',
          }}
        >
          <Sparkles className="h-3.5 w-3.5" />
          AI Assist
        </button>
        
        <button
          onClick={onPreview}
          className="p-1.5 rounded hover:bg-neutral-100 text-neutral-400"
          title="Preview"
        >
          <Eye className="h-4 w-4" />
        </button>
        <button
          onClick={onFullscreen}
          className="p-1.5 rounded hover:bg-neutral-100 text-neutral-400"
          title="Expand"
        >
          <Maximize2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
