/**
 * Rich Text Toolbar - Matches design exactly
 */

import React from 'react';
import { cn } from '@/lib/utils';
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

interface RichTextToolbarProps {
  onAIAssist?: () => void;
  onPreview?: () => void;
  onExpand?: () => void;
}

export function RichTextToolbar({ onAIAssist, onPreview, onExpand }: RichTextToolbarProps) {
  const tools = [
    { icon: Bold, title: 'Bold' },
    { icon: Italic, title: 'Italic' },
    { icon: Underline, title: 'Underline' },
    { type: 'separator' },
    { icon: List, title: 'Bullet List' },
    { icon: ListOrdered, title: 'Numbered List' },
    { icon: CheckSquare, title: 'Checklist' },
    { type: 'separator' },
    { icon: Code, title: 'Code' },
    { icon: Link2, title: 'Link' },
    { type: 'separator' },
    { icon: Image, title: 'Image' },
    { icon: Paperclip, title: 'Attachment' },
    { type: 'separator' },
    { icon: AtSign, title: 'Mention' },
    { icon: Hash, title: 'Tag' },
  ];

  return (
    <div
      className="flex items-center justify-between px-3 border-b bg-white"
      style={{ height: '44px', borderColor: '#e5e5e5' }}
    >
      {/* Left - Formatting tools */}
      <div className="flex items-center gap-0.5">
        {tools.map((tool, i) => {
          if (tool.type === 'separator') {
            return (
              <Separator
                key={`sep-${i}`}
                orientation="vertical"
                className="h-5 mx-1.5 bg-neutral-200"
              />
            );
          }
          const Icon = tool.icon!;
          return (
            <button
              key={tool.title}
              title={tool.title}
              className="p-1.5 rounded hover:bg-neutral-100 text-neutral-500 hover:text-neutral-700"
            >
              <Icon className="h-4 w-4" />
            </button>
          );
        })}
      </div>

      {/* Right - AI Assist, Preview, Expand */}
      <div className="flex items-center gap-2">
        <Button
          onClick={onAIAssist}
          variant="outline"
          size="sm"
          className="h-8 px-3 gap-1.5 border-[#2563eb] text-[#2563eb] hover:bg-[#2563eb]/5"
        >
          <Sparkles className="h-3.5 w-3.5" />
          AI Assist
        </Button>
        <button
          onClick={onPreview}
          className="p-1.5 rounded hover:bg-neutral-100 text-neutral-400"
          title="Preview"
        >
          <Eye className="h-4 w-4" />
        </button>
        <button
          onClick={onExpand}
          className="p-1.5 rounded hover:bg-neutral-100 text-neutral-400"
          title="Expand"
        >
          <Maximize2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export default RichTextToolbar;
