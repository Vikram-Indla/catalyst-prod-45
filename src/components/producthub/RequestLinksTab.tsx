/**
 * Shared Request Links Tab
 * Used by both Panel A (Roadmap/Kanban) and Panel B (Backlog)
 * Full CRUD against ph_request_links
 */

import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase, typedQuery } from '@/integrations/supabase/client';
import { Plus, Link as LinkIcon, ExternalLink, Trash2 } from 'lucide-react';
import { logInitiativeAudit } from '@/lib/initiativeAudit';
import { toast } from 'sonner';

interface RequestLinksTabProps {
  requestId: string;
}

const CATEGORIES = [
  { value: 'reference', label: 'Reference' },
  { value: 'jira', label: 'Jira' },
  { value: 'confluence', label: 'Confluence' },
  { value: 'figma', label: 'Figma' },
  { value: 'other', label: 'Other' },
];

function AddLinkForm({ requestId, onClose }: { requestId: string; onClose: () => void }) {
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [category, setCategory] = useState('reference');
  const [submitting, setSubmitting] = useState(false);
  const queryClient = useQueryClient();

  const handleSubmit = async () => {
    if (!title.trim() || !url.trim()) {
      toast.error('Title and URL required');
      return;
    }
    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: rows, error } = await typedQuery('ph_request_links')
        .insert({
          request_id: requestId,
          title: title.trim(),
          url: url.trim(),
          category,
          added_by: user?.id || null,
        })
        .select();
      if (error) throw error;
      if (!rows || rows.length === 0) {
        toast.error('Failed to add link — no rows inserted');
        return;
      }
      queryClient.invalidateQueries({ queryKey: ['ph-links', requestId] });
      toast.success('Link added');
      logInitiativeAudit({
        request_id: requestId,
        action: 'link_added',
        entity_type: 'link',
        entity_id: rows[0]?.id,
        new_value: JSON.stringify({ title: title.trim(), url: url.trim(), category }),
      });
      onClose();
    } catch (err: any) {
      toast.error('Failed: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-3 mt-3 p-3 border border-border rounded-lg bg-muted/30">
      <input
        type="text"
        value={title}
        onChange={e => setTitle(e.target.value)}
        placeholder="Link title"
        className="h-9 px-3 text-[13px] border border-border rounded-md bg-background text-foreground outline-none focus:ring-1 focus:ring-primary w-full"
      />
      <input
        type="url"
        value={url}
        onChange={e => setUrl(e.target.value)}
        placeholder="https://..."
        className="h-9 px-3 text-[13px] border border-border rounded-md bg-background text-foreground outline-none focus:ring-1 focus:ring-primary w-full"
        onKeyDown={e => e.key === 'Enter' && handleSubmit()}
      />
      <select
        value={category}
        onChange={e => setCategory(e.target.value)}
        className="h-9 px-3 text-[13px] border border-border rounded-md bg-background text-foreground outline-none"
      >
        {CATEGORIES.map(c => (
          <option key={c.value} value={c.value}>{c.label}</option>
        ))}
      </select>
      <div className="flex justify-end gap-2 mt-1">
        <button
          onClick={onClose}
          className="h-8 px-3 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="h-8 px-3 text-xs font-semibold text-primary-foreground bg-primary rounded-md hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          {submitting ? 'Adding…' : 'Add Link'}
        </button>
      </div>
    </div>
  );
}

export function RequestLinksTab({ requestId }: RequestLinksTabProps) {
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);

  const { data: links = [], isLoading, isError } = useQuery({
    queryKey: ['ph-links', requestId],
    queryFn: async () => {
      const { data, error } = await typedQuery('ph_request_links')
        .select('*')
        .eq('request_id', requestId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const handleDelete = async (id: string, linkTitle: string) => {
    try {
      const { error } = await typedQuery('ph_request_links')
        .delete()
        .eq('id', id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['ph-links', requestId] });
      toast.success('Link removed');
      logInitiativeAudit({
        request_id: requestId,
        action: 'link_deleted',
        entity_type: 'link',
        entity_id: id,
      });
    } catch (err: any) {
      toast.error('Delete failed: ' + err.message);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-sm text-muted-foreground">Loading links…</div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-sm text-destructive">Failed to load links</div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-[13px] font-semibold text-foreground tracking-tight">Links</h3>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
        >
          <Plus size={14} /> Add Link
        </button>
      </div>

      {/* Add Form */}
      {showAdd && (
        <AddLinkForm
          requestId={requestId}
          onClose={() => {
            setShowAdd(false);
            queryClient.invalidateQueries({ queryKey: ['ph-links', requestId] });
          }}
        />
      )}

      {/* Empty State */}
      {links.length === 0 && !showAdd ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <LinkIcon size={28} className="text-muted-foreground/40 mb-2" />
          <p className="text-[13px] font-medium text-muted-foreground">No links yet</p>
          <p className="text-xs text-muted-foreground/70 mt-1">Add links to related documents, Jira issues, or designs</p>
        </div>
      ) : (
        /* Links List */
        <div className="flex flex-col gap-0.5">
          {links.map((link: any) => (
            <div
              key={link.id}
              className="group flex items-center gap-3 px-3 py-2.5 border border-border rounded-md bg-background hover:bg-accent/20 transition-colors"
            >
              <LinkIcon size={14} className="text-primary flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[13px] font-medium text-primary hover:underline inline-flex items-center gap-1 truncate"
                >
                  {link.title} <ExternalLink size={11} />
                </a>
                {link.category && (
                  <span className="block text-[11px] text-muted-foreground capitalize mt-0.5">
                    {link.category}
                  </span>
                )}
              </div>
              {link.is_pinned && (
                <span className="text-[10px] font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">
                  Pinned
                </span>
              )}
              <button
                onClick={() => handleDelete(link.id, link.title)}
                className="text-muted-foreground hover:text-destructive transition-colors p-1 opacity-0 group-hover:opacity-100"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
