import { useRef, useEffect } from 'react';
import { CatyAIMessage } from './CatyAIMessage';
import { CatyAIInput } from './CatyAIInput';
import { CatyAIQuickActions } from './CatyAIQuickActions';
import { CatyAIAvatar } from './CatyAIAvatar';
import { useCatyMessages, useSendCatyMessage } from '@/hooks/useCatyAI';
import { Skeleton } from '@/components/ui/skeleton';

interface Props {
  conversationId: string;
  onQuickAction: (action: string) => void;
}

export function CatyAIChat({ conversationId, onQuickAction }: Props) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { data: messages, isLoading } = useCatyMessages(conversationId);
  const sendMessage = useSendCatyMessage();

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const isFirstMessage = !messages || messages.length === 0;

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {isLoading ? (
          <div className="space-y-4"><Skeleton className="h-20 w-full" /><Skeleton className="h-32 w-full" /></div>
        ) : isFirstMessage ? (
          <div className="flex gap-3 p-4 rounded-lg bg-background border border-border">
            <CatyAIAvatar size="lg" />
            <div>
              <h3 className="font-semibold mb-2 text-foreground">Hello! I'm CATY 🧠</h3>
              <p className="text-muted-foreground mb-4">I'm your AI testing partner. I can help you:</p>
              <ul className="text-sm text-muted-foreground space-y-1 mb-4">
                <li>• Generate test cases from requirements</li>
                <li>• Analyze your test coverage</li>
                <li>• Prioritize tests by risk</li>
                <li>• Answer questions about your test data</li>
              </ul>
              <CatyAIQuickActions onAction={onQuickAction} />
            </div>
          </div>
        ) : (
          messages?.map((msg) => <CatyAIMessage key={msg.id} message={msg} />)
        )}
        {sendMessage.isPending && (
          <div className="flex gap-3 p-4 rounded-lg bg-background border border-border animate-pulse">
            <CatyAIAvatar />
            <div className="flex-1"><div className="h-4 bg-muted rounded w-24 mb-2" /><div className="h-4 bg-muted rounded w-full mb-1" /><div className="h-4 bg-muted rounded w-3/4" /></div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      <div className="p-4 border-t border-border bg-muted/30">
        <CatyAIInput onSend={(content) => sendMessage.mutate({ conversationId, content })} isLoading={sendMessage.isPending} />
      </div>
    </div>
  );
}
