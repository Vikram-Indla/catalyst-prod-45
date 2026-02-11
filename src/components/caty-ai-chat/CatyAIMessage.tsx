import { useState } from 'react';
import { ThumbsUp, ThumbsDown, Copy, Check, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CatyAIAvatar } from './CatyAIAvatar';
import { CatyMessage as Msg } from '@/types/caty-ai';
import { useCatyFeedback } from '@/hooks/useCatyAI';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';

interface Props {
  message: Msg;
}

export function CatyAIMessage({ message }: Props) {
  const [copied, setCopied] = useState(false);
  const feedbackMutation = useCatyFeedback();
  const isUser = message.role === 'user';
  const isError = message.status === 'error';

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={cn("flex gap-3 p-4 rounded-lg", isUser ? "bg-muted/50" : "bg-background border border-border", isError && "border-destructive/30 bg-destructive/5")}>
      <div className="flex-shrink-0">
        {isUser ? (
          <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center">
            <User className="h-4 w-4 text-primary-foreground" />
          </div>
        ) : (
          <CatyAIAvatar />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium text-sm text-foreground">{isUser ? 'You' : 'CATY'}</span>
          <span className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}</span>
        </div>
        <div className={cn("prose prose-sm max-w-none dark:prose-invert", isError && "text-destructive")}>
          {isError ? <p>{message.error_message || 'An error occurred'}</p> : <ReactMarkdown>{message.content}</ReactMarkdown>}
        </div>
        {!isUser && message.status === 'complete' && (
          <div className="flex items-center gap-2 mt-3 pt-2 border-t border-border">
            <Button variant="ghost" size="sm" className="h-7 px-2" onClick={handleCopy}>
              {copied ? <Check className="h-3.5 w-3.5 mr-1" /> : <Copy className="h-3.5 w-3.5 mr-1" />}
              {copied ? 'Copied' : 'Copy'}
            </Button>
            <div className="flex items-center gap-1 ml-auto">
              <Button variant="ghost" size="sm" className={cn("h-7 w-7 p-0", message.feedback_rating === 1 && "text-green-600 bg-green-50")} onClick={() => feedbackMutation.mutate({ messageId: message.id, rating: 1 })}>
                <ThumbsUp className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="sm" className={cn("h-7 w-7 p-0", message.feedback_rating === -1 && "text-red-600 bg-red-50")} onClick={() => feedbackMutation.mutate({ messageId: message.id, rating: -1 })}>
                <ThumbsDown className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
