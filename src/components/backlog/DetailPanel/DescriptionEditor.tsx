import { useState } from 'react';
import { Bold, Italic, Underline, List, ListOrdered, AlignLeft } from 'lucide-react';

interface DescriptionEditorProps {
  initialValue: string;
  onChange?: (value: string) => void;
}

export function DescriptionEditor({ initialValue, onChange }: DescriptionEditorProps) {
  const [value, setValue] = useState(initialValue);
  const [activeFormats, setActiveFormats] = useState<Set<string>>(new Set());

  const handleFormat = (format: string) => {
    setActiveFormats(prev => {
      const newSet = new Set(prev);
      if (newSet.has(format)) {
        newSet.delete(format);
      } else {
        newSet.add(format);
      }
      return newSet;
    });
  };

  const handleChange = (e: React.FormEvent<HTMLDivElement>) => {
    const newValue = e.currentTarget.textContent || '';
    setValue(newValue);
    onChange?.(newValue);
  };

  return (
    <div className="border border-border rounded overflow-hidden">
      <div className="flex gap-1 p-2 border-b border-border bg-muted/30">
        <button
          onClick={() => handleFormat('bold')}
          className={`w-7 h-7 flex items-center justify-center rounded transition-colors ${
            activeFormats.has('bold')
              ? 'bg-primary/10 text-primary'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          }`}
        >
          <Bold className="w-4 h-4" />
        </button>
        <button
          onClick={() => handleFormat('italic')}
          className={`w-7 h-7 flex items-center justify-center rounded transition-colors ${
            activeFormats.has('italic')
              ? 'bg-primary/10 text-primary'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          }`}
        >
          <Italic className="w-4 h-4" />
        </button>
        <button
          onClick={() => handleFormat('underline')}
          className={`w-7 h-7 flex items-center justify-center rounded transition-colors ${
            activeFormats.has('underline')
              ? 'bg-primary/10 text-primary'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          }`}
        >
          <Underline className="w-4 h-4" />
        </button>
        <div className="w-px h-7 bg-border mx-1" />
        <button
          onClick={() => handleFormat('bullet')}
          className="w-7 h-7 flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground rounded transition-colors"
        >
          <List className="w-4 h-4" />
        </button>
        <button
          onClick={() => handleFormat('numbered')}
          className="w-7 h-7 flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground rounded transition-colors"
        >
          <ListOrdered className="w-4 h-4" />
        </button>
        <button
          onClick={() => handleFormat('align')}
          className="w-7 h-7 flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground rounded transition-colors"
        >
          <AlignLeft className="w-4 h-4" />
        </button>
      </div>

      <div
        contentEditable
        onInput={handleChange}
        className="min-h-[100px] p-3 text-sm leading-relaxed text-foreground focus:outline-none empty:before:content-['Enter_description...'] empty:before:text-muted-foreground/70"
        suppressContentEditableWarning
      >
        {value}
      </div>
    </div>
  );
}
