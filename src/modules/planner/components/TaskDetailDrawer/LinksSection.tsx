// ============================================================
// LINKS SECTION - ENTERPRISE V2 DESIGN
// External links and web links with add/delete functionality
// Fully wired to Supabase via task_external_links table
// ============================================================

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Link2, Plus, X, ExternalLink, Globe, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface LinksSectionProps {
  taskId: string;
}

interface TaskLink {
  id: string;
  task_id: string;
  url: string;
  title: string | null;
  created_at: string;
}

// Hook to fetch task links - using type assertion for new table
function useTaskLinks(taskId: string) {
  return useQuery({
    queryKey: ['task-links', taskId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('task_external_links')
        .select('*')
        .eq('task_id', taskId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return (data || []) as TaskLink[];
    },
    enabled: !!taskId,
  });
}

// Hook to add a link
function useAddLink() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ taskId, url, title }: { taskId: string; url: string; title: string }) => {
      const { error } = await (supabase as any)
        .from('task_external_links')
        .insert({ task_id: taskId, url, title: title || null });
      
      if (error) throw error;
    },
    onSuccess: (_, { taskId }) => {
      queryClient.invalidateQueries({ queryKey: ['task-links', taskId] });
      toast.success('Link added');
    },
    onError: () => {
      toast.error('Failed to add link');
    },
  });
}

// Hook to delete a link
function useDeleteLink() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (linkId: string) => {
      const { error } = await (supabase as any)
        .from('task_external_links')
        .delete()
        .eq('id', linkId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-links'] });
      toast.success('Link removed');
    },
    onError: () => {
      toast.error('Failed to remove link');
    },
  });
}

export function LinksSection({ taskId }: LinksSectionProps) {
  const { data: links = [], isLoading } = useTaskLinks(taskId);
  const addLink = useAddLink();
  const deleteLink = useDeleteLink();
  
  const [isAdding, setIsAdding] = useState(false);
  const [newUrl, setNewUrl] = useState('');
  const [newTitle, setNewTitle] = useState('');

  const handleAddLink = async () => {
    if (!newUrl.trim()) return;
    
    // Validate URL
    let url = newUrl.trim();
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }
    
    try {
      new URL(url);
    } catch {
      toast.error('Please enter a valid URL');
      return;
    }
    
    await addLink.mutateAsync({ 
      taskId, 
      url, 
      title: newTitle.trim() || extractDomain(url) 
    });
    
    setNewUrl('');
    setNewTitle('');
    setIsAdding(false);
  };

  const extractDomain = (url: string): string => {
    try {
      const domain = new URL(url).hostname.replace('www.', '');
      return domain;
    } catch {
      return url;
    }
  };

  const getFavicon = (url: string): string => {
    try {
      const domain = new URL(url).hostname;
      return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
    } catch {
      return '';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link2 className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-semibold text-foreground">External Links</span>
          {links.length > 0 && (
            <span className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-medium text-muted-foreground">
              {links.length}
            </span>
          )}
        </div>
      </div>

      {/* Links List */}
      {links.length > 0 && (
        <div className="space-y-2">
          {links.map(link => (
            <LinkItem 
              key={link.id}
              link={link}
              onDelete={() => deleteLink.mutate(link.id)}
              isDeleting={deleteLink.isPending}
            />
          ))}
        </div>
      )}

      {/* Add Link Form */}
      {isAdding ? (
        <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-3">
          <div className="space-y-2">
            <Input
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              placeholder="https://example.com"
              autoFocus
              className="text-sm"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddLink();
                if (e.key === 'Escape') {
                  setIsAdding(false);
                  setNewUrl('');
                  setNewTitle('');
                }
              }}
            />
            <Input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Link title (optional)"
              className="text-sm"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddLink();
                if (e.key === 'Escape') {
                  setIsAdding(false);
                  setNewUrl('');
                  setNewTitle('');
                }
              }}
            />
          </div>
          <div className="flex items-center justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setIsAdding(false);
                setNewUrl('');
                setNewTitle('');
              }}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleAddLink}
              disabled={!newUrl.trim() || addLink.isPending}
            >
              {addLink.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                'Add Link'
              )}
            </Button>
          </div>
        </div>
      ) : (
        <button 
          onClick={() => setIsAdding(true)}
          className="w-full flex items-center gap-2 p-3 border border-dashed border-muted-foreground/30 rounded-lg text-sm text-muted-foreground hover:border-primary hover:text-primary hover:bg-primary/5 transition-all"
        >
          <Plus className="w-4 h-4" />
          Add external link
        </button>
      )}

      {/* Empty State */}
      {links.length === 0 && !isAdding && (
        <div className="text-center py-6 text-muted-foreground">
          <Globe className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No external links added yet</p>
        </div>
      )}
    </div>
  );
}

function LinkItem({ 
  link, 
  onDelete,
  isDeleting 
}: { 
  link: TaskLink; 
  onDelete: () => void;
  isDeleting: boolean;
}) {
  const getFavicon = (url: string): string => {
    try {
      const domain = new URL(url).hostname;
      return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
    } catch {
      return '';
    }
  };

  const extractDomain = (url: string): string => {
    try {
      const domain = new URL(url).hostname.replace('www.', '');
      return domain;
    } catch {
      return url;
    }
  };

  return (
    <div className="group flex items-center gap-3 px-3 py-2.5 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors">
      {/* Favicon */}
      <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0 overflow-hidden">
        <img 
          src={getFavicon(link.url)} 
          alt=""
          className="w-5 h-5"
          onError={(e) => {
            e.currentTarget.style.display = 'none';
            e.currentTarget.nextElementSibling?.classList.remove('hidden');
          }}
        />
        <Globe className="w-4 h-4 text-muted-foreground hidden" />
      </div>
      
      {/* Link Info */}
      <div className="flex-1 min-w-0">
        <a
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-medium text-foreground hover:text-primary hover:underline truncate block"
        >
          {link.title || extractDomain(link.url)}
        </a>
        <p className="text-xs text-muted-foreground truncate">
          {extractDomain(link.url)}
        </p>
      </div>
      
      {/* Actions */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <a
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          className="p-1.5 rounded-md hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
          title="Open in new tab"
        >
          <ExternalLink className="w-4 h-4" />
        </a>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          disabled={isDeleting}
          className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
          title="Remove link"
        >
          {isDeleting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <X className="w-4 h-4" />
          )}
        </button>
      </div>
    </div>
  );
}
