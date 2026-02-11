import { useState, useRef, KeyboardEvent } from 'react';
import { Send, Loader2, Paperclip } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

interface Props {
  onSend: (message: string) => void;
  isLoading?: boolean;
  placeholder?: string;
}

export function CatyAIInput({ onSend, isLoading, placeholder = "Ask CATY anything..." }: Props) {
  const [message, setMessage] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    if (message.trim() && !isLoading) {
      onSend(message.trim());
      setMessage('');
      textareaRef.current?.focus();
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  return (
    <div className="border border-border rounded-lg bg-background p-2">
      <div className="flex items-end gap-2">
        <Button variant="ghost" size="sm" className="h-9 w-9 p-0 flex-shrink-0" title="Attach file" disabled={isLoading}>
          <Paperclip className="h-4 w-4" />
        </Button>
        <Textarea ref={textareaRef} value={message} onChange={(e) => setMessage(e.target.value)} onKeyDown={handleKeyDown}
          placeholder={placeholder} rows={1} className="min-h-[36px] max-h-[200px] resize-none border-0 focus-visible:ring-0 p-2" disabled={isLoading} />
        <Button size="sm" className="h-9 w-9 p-0 flex-shrink-0" onClick={handleSend} disabled={!message.trim() || isLoading}>
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground mt-2 px-2">Press Enter to send, Shift+Enter for new line</p>
    </div>
  );
}
