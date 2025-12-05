/**
 * Document Favorite/Star Component
 * Source: https://support.atlassian.com/confluence-cloud/docs/save-and-remove-pages-from-your-favorites/
 * - Star pages to save them to favorites
 * - Quick access to starred pages
 */
import { Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface DocumentFavoriteProps {
  documentId: string;
  variant?: 'button' | 'icon';
}

export function DocumentFavorite({ documentId, variant = 'button' }: DocumentFavoriteProps) {
  const queryClient = useQueryClient();

  // Fetch current user
  const { data: currentUser } = useQuery({
    queryKey: ['current-user'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    },
  });

  // Check if document is favorited
  const { data: isFavorited } = useQuery({
    queryKey: ['kb-favorite', documentId, currentUser?.id],
    queryFn: async () => {
      if (!currentUser) return false;
      const { data, error } = await supabase
        .from('kb_document_favorites')
        .select('id')
        .eq('document_id', documentId)
        .eq('user_id', currentUser.id)
        .maybeSingle();
      if (error) throw error;
      return !!data;
    },
    enabled: !!currentUser,
  });

  // Add to favorites
  const addFavoriteMutation = useMutation({
    mutationFn: async () => {
      if (!currentUser) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('kb_document_favorites')
        .insert({
          document_id: documentId,
          user_id: currentUser.id,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kb-favorite', documentId] });
      queryClient.invalidateQueries({ queryKey: ['kb-favorites'] });
      toast.success('Added to favorites');
    },
    onError: () => {
      toast.error('Failed to add to favorites');
    },
  });

  // Remove from favorites
  const removeFavoriteMutation = useMutation({
    mutationFn: async () => {
      if (!currentUser) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('kb_document_favorites')
        .delete()
        .eq('document_id', documentId)
        .eq('user_id', currentUser.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kb-favorite', documentId] });
      queryClient.invalidateQueries({ queryKey: ['kb-favorites'] });
      toast.success('Removed from favorites');
    },
    onError: () => {
      toast.error('Failed to remove from favorites');
    },
  });

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isFavorited) {
      removeFavoriteMutation.mutate();
    } else {
      addFavoriteMutation.mutate();
    }
  };

  const isPending = addFavoriteMutation.isPending || removeFavoriteMutation.isPending;

  if (variant === 'icon') {
    return (
      <button
        onClick={handleToggle}
        disabled={isPending || !currentUser}
        className={cn(
          "p-1 rounded hover:bg-muted transition-colors",
          isPending && "opacity-50"
        )}
      >
        <Star 
          className={cn(
            "h-4 w-4 transition-colors",
            isFavorited ? "fill-brand-gold text-brand-gold" : "text-muted-foreground hover:text-brand-gold"
          )} 
        />
      </button>
    );
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleToggle}
      disabled={isPending || !currentUser}
      className={cn(isFavorited && "text-brand-gold")}
    >
      <Star 
        className={cn(
          "h-4 w-4 mr-2",
          isFavorited && "fill-brand-gold"
        )} 
      />
      {isFavorited ? 'Starred' : 'Star'}
    </Button>
  );
}

/**
 * Hook to fetch user's favorite documents
 */
export function useFavoriteDocuments() {
  const { data: currentUser } = useQuery({
    queryKey: ['current-user'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    },
  });

  return useQuery({
    queryKey: ['kb-favorites', currentUser?.id],
    queryFn: async () => {
      if (!currentUser) return [];
      const { data, error } = await supabase
        .from('kb_document_favorites')
        .select(`
          id,
          created_at,
          document:kb_documents(id, title, updated_at, linked_work_item_type)
        `)
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!currentUser,
  });
}
