import { X, MessageSquare, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CatyConversation } from '@/types/caty-ai';
import { useDeleteCatyConversation } from '@/hooks/useCatyAI';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

interface Props {
  conversations: CatyConversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onClose: () => void;
}

export function CatyAIHistorySidebar({ conversations, activeId, onSelect, onClose }: Props) {
  const deleteMutation = useDeleteCatyConversation();

  return (
    <div className="w-72 border-r border-border bg-muted/30 flex flex-col">
      <div className="flex items-center justify-between p-4 border-b border-border">
        <h2 className="font-semibold text-foreground">Chat History</h2>
        <Button variant="ghost" size="sm" onClick={onClose}><X className="h-4 w-4" /></Button>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {conversations.map((conv) => (
            <div key={conv.id}
              className={cn("group flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors",
                activeId === conv.id ? "bg-primary/10 text-primary" : "hover:bg-muted")}
              onClick={() => onSelect(conv.id)}>
              <MessageSquare className="h-4 w-4 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{conv.title || 'New conversation'}</p>
                <p className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(conv.updated_at), { addSuffix: true })}</p>
              </div>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(conv.id); }}>
                <Trash2 className="h-3.5 w-3.5 text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
