/**
 * Links Tab Component
 * URL/Title form + external links list
 */

import React, { useState } from 'react';
import { Link2, ExternalLink, Trash2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface LinksTabProps {
  taskId: string;
}

interface TaskLink {
  id: string;
  task_id: string;
  url: string;
  title: string | null;
  created_at: string;
}

export function LinksTab({ taskId }: LinksTabProps) {
  const [newUrl, setNewUrl] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const queryClient = useQueryClient();

  // Fetch links
  const { data: links = [], isLoading } = useQuery({
    queryKey: ['task-links', taskId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('task_external_links')
        .select('*')
        .eq('task_id', taskId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as TaskLink[];
    },
    enabled: !!taskId,
  });

  // Add link mutation
  const addLink = useMutation({
    mutationFn: async ({ url, title }: { url: string; title: string }) => {
      const { error } = await supabase
        .from('task_external_links')
        .insert({ task_id: taskId, url, title: title || url });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-links', taskId] });
      setNewUrl('');
      setNewTitle('');
    },
  });

  // Delete link mutation
  const deleteLink = useMutation({
    mutationFn: async (linkId: string) => {
      const { error } = await supabase
        .from('task_external_links')
        .delete()
        .eq('id', linkId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-links', taskId] });
    },
  });

  const handleAddLink = () => {
    if (!newUrl.trim()) return;
    addLink.mutate({ url: newUrl.trim(), title: newTitle.trim() });
  };

  if (isLoading) {
    return (
      <div className="empty-state">
        <div className="loading-spinner" style={{ width: 32, height: 32 }} />
      </div>
    );
  }

  return (
    <div className="links-tab">
      {/* ADD LINK FORM */}
      <div className="add-link-form">
        <div className="link-field url-field">
          <label>URL</label>
          <input
            type="url"
            placeholder="https://example.com"
            value={newUrl}
            onChange={(e) => setNewUrl(e.target.value)}
          />
        </div>
        <div className="link-field">
          <label>TITLE (OPTIONAL)</label>
          <input
            type="text"
            placeholder="Link title"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
          />
        </div>
        <button 
          className="btn-add-link" 
          onClick={handleAddLink}
          disabled={!newUrl.trim() || addLink.isPending}
        >
          Add Link
        </button>
      </div>

      {/* LINKS LIST */}
      <div className="links-list">
        {links.map((link) => (
          <div key={link.id} className="link-item">
            <div className="link-icon">
              <Link2 size={20} />
            </div>
            <div className="link-info">
              <div className="link-title">{link.title || link.url}</div>
              <a href={link.url} target="_blank" rel="noopener noreferrer" className="link-url">
                {link.url}
              </a>
            </div>
            <div className="link-actions">
              <button
                className="item-action-btn"
                onClick={() => window.open(link.url, '_blank')}
              >
                <ExternalLink size={16} />
              </button>
              <button
                className="item-action-btn"
                onClick={() => deleteLink.mutate(link.id)}
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
