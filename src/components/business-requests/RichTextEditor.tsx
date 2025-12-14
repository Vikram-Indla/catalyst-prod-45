import { useRef, useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Bold, 
  Italic, 
  Underline, 
  Strikethrough,
  List, 
  ListOrdered, 
  Link, 
  Image,
  Code,
  Quote,
  RemoveFormatting,
  ChevronDown,
  Type
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  minHeight?: string;
}

export function RichTextEditor({ value, onChange, placeholder, className, minHeight = '200px' }: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkPopoverOpen, setLinkPopoverOpen] = useState(false);

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value || '';
    }
  }, [value]);

  const handleInput = useCallback(() => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  }, [onChange]);

  const execCommand = useCallback((command: string, value?: string) => {
    // Ensure editor is focused before executing command
    editorRef.current?.focus();
    document.execCommand(command, false, value);
    handleInput();
  }, [handleInput]);

  const insertLink = () => {
    if (linkUrl) {
      execCommand('createLink', linkUrl);
      setLinkUrl('');
      setLinkPopoverOpen(false);
    }
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64 = e.target?.result as string;
        if (base64) {
          // Focus and insert the image
          editorRef.current?.focus();
          document.execCommand('insertImage', false, base64);
          handleInput();
        }
      };
      reader.readAsDataURL(file);
    }
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const triggerImageUpload = () => {
    fileInputRef.current?.click();
  };

  const formatBlock = (tag: string) => {
    execCommand('formatBlock', tag);
  };

  const toggleBulletList = () => {
    editorRef.current?.focus();
    document.execCommand('insertUnorderedList', false);
    handleInput();
  };

  const toggleNumberedList = () => {
    editorRef.current?.focus();
    document.execCommand('insertOrderedList', false);
    handleInput();
  };

  const clearFormatting = () => {
    execCommand('removeFormat');
    // Also remove block formatting
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      execCommand('formatBlock', 'p');
    }
  };

  // Handle keyboard events for list behavior
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter') {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const node = selection.anchorNode;
        const parentLi = node?.parentElement?.closest('li');
        
        // If we're in a list item and it's empty, exit the list
        if (parentLi && parentLi.textContent?.trim() === '') {
          e.preventDefault();
          const list = parentLi.closest('ul, ol');
          if (list) {
            // Remove the empty list item
            parentLi.remove();
            // Insert a paragraph after the list
            const p = document.createElement('p');
            p.innerHTML = '<br>';
            list.after(p);
            // Move cursor to the new paragraph
            const range = document.createRange();
            range.setStart(p, 0);
            range.collapse(true);
            selection.removeAllRanges();
            selection.addRange(range);
            handleInput();
          }
        }
      }
    }
  };

  return (
    <div 
      className={cn("rounded-md", className)}
      style={{ 
        border: '1px solid var(--border-color)',
        background: 'var(--surface-1)'
      }}
    >
      {/* Hidden file input for image upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleImageUpload}
      />

      {/* Toolbar */}
      <div 
        className="flex flex-wrap items-center gap-0.5 p-2"
        style={{
          borderBottom: '1px solid var(--border-color)',
          background: 'var(--surface-2)'
        }}
      >
        {/* Text Format Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 px-2 gap-1 text-xs"
              style={{ color: 'var(--text-2)' }}
            >
              <Type className="h-3.5 w-3.5" />
              <ChevronDown className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="min-w-[120px]">
            <DropdownMenuItem onClick={() => formatBlock('p')}>
              <span className="text-sm">Normal</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => formatBlock('h1')}>
              <span className="text-lg font-bold">Heading 1</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => formatBlock('h2')}>
              <span className="text-base font-bold">Heading 2</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => formatBlock('h3')}>
              <span className="text-sm font-bold">Heading 3</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="w-px h-5 mx-1" style={{ background: 'var(--border-color)' }} />

        {/* Basic Formatting */}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 hover:bg-[var(--surface-3)]"
          style={{ color: 'var(--text-2)' }}
          onClick={() => execCommand('bold')}
          title="Bold (Ctrl+B)"
        >
          <Bold className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 hover:bg-[var(--surface-3)]"
          style={{ color: 'var(--text-2)' }}
          onClick={() => execCommand('italic')}
          title="Italic (Ctrl+I)"
        >
          <Italic className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 hover:bg-[var(--surface-3)]"
          style={{ color: 'var(--text-2)' }}
          onClick={() => execCommand('underline')}
          title="Underline (Ctrl+U)"
        >
          <Underline className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 hover:bg-[var(--surface-3)]"
          style={{ color: 'var(--text-2)' }}
          onClick={() => execCommand('strikeThrough')}
          title="Strikethrough"
        >
          <Strikethrough className="h-4 w-4" />
        </Button>

        <div className="w-px h-5 mx-1" style={{ background: 'var(--border-color)' }} />

        {/* Lists */}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 hover:bg-[var(--surface-3)]"
          style={{ color: 'var(--text-2)' }}
          onClick={toggleBulletList}
          title="Bullet List"
        >
          <List className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 hover:bg-[var(--surface-3)]"
          style={{ color: 'var(--text-2)' }}
          onClick={toggleNumberedList}
          title="Numbered List"
        >
          <ListOrdered className="h-4 w-4" />
        </Button>

        <div className="w-px h-5 mx-1" style={{ background: 'var(--border-color)' }} />

        {/* Link */}
        <Popover open={linkPopoverOpen} onOpenChange={setLinkPopoverOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 hover:bg-[var(--surface-3)]"
              style={{ color: 'var(--text-2)' }}
              title="Insert Link"
            >
              <Link className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-72 p-3" align="start">
            <div className="space-y-3">
              <Label className="text-xs font-medium" style={{ color: 'var(--text-2)' }}>Link URL</Label>
              <Input
                type="url"
                placeholder="https://example.com"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                className="h-8 text-sm"
              />
              <Button
                size="sm"
                onClick={insertLink}
                className="w-full h-8 bg-brand-gold hover:bg-brand-gold-hover text-white"
              >
                Insert Link
              </Button>
            </div>
          </PopoverContent>
        </Popover>

        {/* Image Upload */}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 hover:bg-[var(--surface-3)]"
          style={{ color: 'var(--text-2)' }}
          onClick={triggerImageUpload}
          title="Upload Image"
        >
          <Image className="h-4 w-4" />
        </Button>

        <div className="w-px h-5 mx-1" style={{ background: 'var(--border-color)' }} />

        {/* Code */}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 hover:bg-[var(--surface-3)]"
          style={{ color: 'var(--text-2)' }}
          onClick={() => {
            const selection = window.getSelection();
            if (selection && selection.toString()) {
              execCommand('insertHTML', `<code style="background: var(--surface-3); padding: 2px 4px; border-radius: 3px; font-family: monospace;">${selection.toString()}</code>`);
            }
          }}
          title="Inline Code"
        >
          <Code className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 hover:bg-[var(--surface-3)]"
          style={{ color: 'var(--text-2)' }}
          onClick={() => formatBlock('blockquote')}
          title="Quote"
        >
          <Quote className="h-4 w-4" />
        </Button>

        <div className="w-px h-5 mx-1" style={{ background: 'var(--border-color)' }} />

        {/* Clear Formatting */}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 hover:bg-[var(--surface-3)]"
          style={{ color: 'var(--text-2)' }}
          onClick={clearFormatting}
          title="Clear Formatting"
        >
          <RemoveFormatting className="h-4 w-4" />
        </Button>
      </div>

      {/* Editor */}
      <div
        ref={editorRef}
        contentEditable
        className="overflow-y-auto p-3 text-sm focus:outline-none prose prose-sm max-w-none [&_blockquote]:border-l-[3px] [&_blockquote]:border-[var(--accent-color)] [&_blockquote]:pl-4 [&_blockquote]:italic [&_a]:text-[var(--accent-color)] [&_a]:underline [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:my-1 [&_img]:max-w-full [&_img]:h-auto [&_img]:rounded"
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        data-placeholder={placeholder}
        style={{
          minHeight,
          maxHeight: '400px',
          background: 'var(--surface-1)',
          color: 'var(--text-1)',
          caretColor: 'var(--text-1)',
        }}
      />
      <style>{`
        [contentEditable]:empty:before {
          content: attr(data-placeholder);
          color: var(--text-3);
          pointer-events: none;
        }
        [contentEditable] code {
          background: var(--surface-3);
          padding: 2px 4px;
          border-radius: 3px;
        }
        [contentEditable] blockquote {
          color: var(--text-2);
        }
      `}</style>
    </div>
  );
}
