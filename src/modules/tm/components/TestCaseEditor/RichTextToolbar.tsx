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
      className="flex items-center justify-between px-3 border-b bg-[var(--bg-0)]"
      style={{ height: '44px', borderColor: 'var(--stroke-1)' }}
    >
      {/* Left - Formatting tools */}
      <div className="flex items-center gap-0.5">
        {tools.map((tool, i) => {
          if (tool.type === 'separator') {
            return (
              <Separator
                key={`sep-${i}`}
                orientation="vertical"
                className="h-5 mx-1.5"
                style={{ backgroundColor: 'var(--stroke-1)' }}
              />
            );
          }
          const Icon = tool.icon!;
          return (
            <button
              key={tool.title}
              title={tool.title}
              className="p-1.5 rounded hover:bg-[var(--row-hover)] text-[var(--text-3)] hover:text-[var(--text-1)] transition-colors"
              style={{ transitionDuration: '150ms' }}
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
          className="h-8 px-3 gap-1.5 border-ai-purple text-ai-purple hover:bg-ai-purple-light transition-colors"
          style={{ 
            borderColor: 'hsl(var(--ai-purple))', 
            color: 'hsl(var(--ai-purple))',
            transitionDuration: '150ms',
            boxShadow: '0 4px 14px -2px rgba(124, 58, 237, 0.3)'
          }}
        >
          <Sparkles className="h-3.5 w-3.5" />
          AI Assist
        </Button>
        <button
          onClick={onPreview}
          className="p-1.5 rounded hover:bg-[var(--row-hover)] text-[var(--text-4)] hover:text-[var(--text-2)] transition-colors"
          style={{ transitionDuration: '150ms' }}
          title="Preview"
        >
          <Eye className="h-4 w-4" />
        </button>
        <button
          onClick={onExpand}
          className="p-1.5 rounded hover:bg-[var(--row-hover)] text-[var(--text-4)] hover:text-[var(--text-2)] transition-colors"
          style={{ transitionDuration: '150ms' }}
          title="Expand"
        >
          <Maximize2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export default RichTextToolbar;
