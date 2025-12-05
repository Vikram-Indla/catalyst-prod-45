/**
 * Document Watchers Component
 * Source: https://support.atlassian.com/confluence-cloud/docs/watch-pages-spaces-and-blogs/
 * - Users can watch pages to receive notifications
 * - Shows who is watching a page
 */
import { useState } from 'react';
import { Eye, EyeOff, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface DocumentWatchersProps {
  documentId: string;
}

interface Watcher {
  id: string;
  document_id: string;
  user_id: string;
  created_at: string;
}

export function DocumentWatchers({ documentId }: DocumentWatchersProps) {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);

  // Fetch current user
  const { data: currentUser } = useQuery({
    queryKey: ['current-user'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    },
  });

  // Fetch watchers
  const { data: watchers, isLoading } = useQuery({
    queryKey: ['kb-watchers', documentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('kb_document_watchers')
        .select('*')
        .eq('document_id', documentId);
      if (error) throw error;
      return data as Watcher[];
    },
  });

  const isWatching = watchers?.some(w => w.user_id === currentUser?.id);

  // Watch mutation
  const watchMutation = useMutation({
    mutationFn: async () => {
      if (!currentUser) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('kb_document_watchers')
        .insert({
          document_id: documentId,
          user_id: currentUser.id,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kb-watchers', documentId] });
      toast.success('You are now watching this page');
    },
    onError: () => {
      toast.error('Failed to watch page');
    },
  });

  // Unwatch mutation
  const unwatchMutation = useMutation({
    mutationFn: async () => {
      if (!currentUser) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('kb_document_watchers')
        .delete()
        .eq('document_id', documentId)
        .eq('user_id', currentUser.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kb-watchers', documentId] });
      toast.success('You are no longer watching this page');
    },
    onError: () => {
      toast.error('Failed to unwatch page');
    },
  });

  const handleToggleWatch = () => {
    if (isWatching) {
      unwatchMutation.mutate();
    } else {
      watchMutation.mutate();
    }
  };

  const isPending = watchMutation.isPending || unwatchMutation.isPending;

  return (
    <div className="flex items-center gap-2">
      <Button
        variant={isWatching ? "default" : "outline"}
        size="sm"
        onClick={handleToggleWatch}
        disabled={isPending || !currentUser}
        className={isWatching ? "bg-brand-gold hover:bg-brand-gold-hover" : ""}
      >
        {isWatching ? (
          <>
            <Eye className="h-4 w-4 mr-2" />
            Watching
          </>
        ) : (
          <>
            <EyeOff className="h-4 w-4 mr-2" />
            Watch
          </>
        )}
      </Button>

      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 px-2">
            <Users className="h-4 w-4 mr-1" />
            <span className="text-xs">{watchers?.length || 0}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-3" align="end">
          <div className="space-y-2">
            <p className="text-sm font-medium">Watchers</p>
            {isLoading ? (
              <p className="text-xs text-muted-foreground">Loading...</p>
            ) : watchers && watchers.length > 0 ? (
              <div className="space-y-2">
                {watchers.map((watcher) => (
                  <div key={watcher.id} className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarFallback className="bg-brand-gold/20 text-brand-gold text-xs">
                        U
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm">
                      {watcher.user_id === currentUser?.id ? 'You' : 'User'}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">No watchers yet</p>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
