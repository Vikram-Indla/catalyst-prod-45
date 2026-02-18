/**
 * InitiativeLinksTab — Category badges, grouped links/attachments, inline add form.
 */
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { catalystToast } from '@/lib/catalystToast';
import { Plus, Link2, FileText, Palette, GitBranch, Ticket, MessageSquare, ExternalLink, BookOpen, Paperclip, Download, ChevronDown } from 'lucide-react';

interface InitiativeLinksTabProps {
  initiativeId: string;
}

const LINK_CATEGORIES = ['document', 'design', 'repository', 'ticket', 'communication', 'external', 'reference'];
const CATEGORY_ICONS: Record<string, React.ElementType> = {
  document: FileText, design: Palette, repository: GitBranch,
  ticket: Ticket, communication: MessageSquare, external: ExternalLink, reference: BookOpen,
};
const CATEGORY_META = [
  { key: 'document', label: 'Documents', icon: FileText },
  { key: 'design', label: 'Designs', icon: Palette },
  { key: 'repository', label: 'Repos', icon: GitBranch },
  { key: 'ticket', label: 'Tickets', icon: Ticket },
  { key: 'communication', label: 'Comms', icon: MessageSquare },
  { key: 'external', label: 'External', icon: ExternalLink },
  { key: 'reference', label: 'Reference', icon: BookOpen },
];

function getRelativeTime(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function InitiativeLinksTab({ initiativeId }: InitiativeLinksTabProps) {
  const [showAddLink, setShowAddLink] = useState(false);
  const [showCatDropdown, setShowCatDropdown] = useState(false);
  const [linkForm, setLinkForm] = useState({
    title: '', url: '', category: 'document', description: '', is_pinned: false,
  });

  const { data: links = [], refetch: refetchLinks } = useQuery({
    queryKey: ['initiative-links', initiativeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ph_initiative_links')
        .select('*, author:profiles!added_by(id, full_name)')
        .eq('initiative_id', initiativeId)
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!initiativeId,
  });

  const { data: attachments = [], refetch: refetchAttachments } = useQuery({
    queryKey: ['initiative-attachments', initiativeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ph_initiative_attachments')
        .select('*, uploader:profiles!uploaded_by(id, full_name)')
        .eq('initiative_id', initiativeId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!initiativeId,
  });

  const handleCreateLink = async () => {
    if (!linkForm.title.trim() || !linkForm.url.trim()) return;
    const { error } = await supabase.from('ph_initiative_links').insert({
      initiative_id: initiativeId, title: linkForm.title.trim(), url: linkForm.url.trim(),
      category: linkForm.category, description: linkForm.description.trim() || null,
      is_pinned: linkForm.is_pinned,
      added_by: (await supabase.auth.getUser()).data.user?.id,
    } as any);
    if (error) { catalystToast.error('Failed to add link'); return; }
    catalystToast.success('Link added');
    refetchLinks();
    setShowAddLink(false);
    setLinkForm({ title: '', url: '', category: 'document', description: '', is_pinned: false });
  };

  function renderLinkCard(link: any, isPinned: boolean) {
    const Icon = CATEGORY_ICONS[link.category] || ExternalLink;
    return (
      <div key={link.id} className="flex items-start gap-3 bg-white border border-zinc-200 rounded-lg p-3 hover:border-zinc-300 transition-colors">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${isPinned ? 'bg-blue-100' : 'bg-zinc-100'}`}>
          <Icon className={`w-4 h-4 ${isPinned ? 'text-blue-600' : 'text-zinc-500'}`} />
        </div>
        <div className="flex-1 min-w-0">
          <a href={link.url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-zinc-900 hover:text-blue-600 transition-colors">
            {link.title}
          </a>
          <p className="text-[11px] text-blue-500 truncate mt-0.5">{link.url}</p>
          {link.description && <p className="text-[11px] text-zinc-500 mt-1">{link.description}</p>}
          <p className="text-[10px] text-zinc-400 mt-1">Added by {link.author?.full_name || 'Unknown'} · {getRelativeTime(link.created_at)}</p>
        </div>
      </div>
    );
  }

  function renderAttachmentCard(att: any) {
    const sizeStr = att.file_size > 1048576 ? `${(att.file_size / 1048576).toFixed(1)} MB` : `${(att.file_size / 1024).toFixed(0)} KB`;
    return (
      <div key={att.id} className="flex items-start gap-3 bg-white border border-zinc-200 rounded-lg p-3 hover:border-zinc-300 transition-colors">
        <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
          <Paperclip className="w-4 h-4 text-amber-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-zinc-900">{att.file_name}</p>
          <p className="text-[10px] text-zinc-400 mt-0.5">{sizeStr} · {att.mime_type}</p>
          <p className="text-[10px] text-zinc-400 mt-1">Uploaded by {att.uploader?.full_name || 'Unknown'} · {getRelativeTime(att.created_at)}</p>
        </div>
        <button className="flex-shrink-0 p-1.5 rounded-md hover:bg-zinc-100 transition-colors">
          <Download className="w-4 h-4 text-zinc-400" />
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-zinc-900">Links & Attachments</h3>
          <p className="text-xs text-zinc-400 mt-0.5">{links.length + attachments.length} item{links.length + attachments.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => setShowAddLink(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors">
          <Plus className="w-3.5 h-3.5" /> Add Link
        </button>
      </div>

      {/* Category Summary */}
      {(links.length > 0 || attachments.length > 0) && (
        <div className="flex items-center gap-2 flex-wrap">
          {CATEGORY_META.map(({ key, label, icon: Icon }) => {
            const count = links.filter((l: any) => l.category === key).length + attachments.filter((a: any) => a.category === key).length;
            if (count === 0) return null;
            return (
              <div key={key} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-100 border border-zinc-200">
                <Icon className="w-3 h-3 text-zinc-500" />
                <span className="text-[10px] font-medium text-zinc-600">{label} ({count})</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Inline Add Form */}
      {showAddLink && (
        <div className="border border-blue-200 rounded-lg p-4 bg-blue-50/30 space-y-4">
          <h4 className="text-xs font-semibold text-zinc-700">New Link</h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-medium text-zinc-500 uppercase tracking-wide mb-1 block">Title *</label>
              <input value={linkForm.title} onChange={e => setLinkForm(f => ({ ...f, title: e.target.value }))}
                placeholder="Link title..." className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
            </div>
            <div className="relative">
              <label className="text-[10px] font-medium text-zinc-500 uppercase tracking-wide mb-1 block">Category</label>
              <button type="button" onClick={() => setShowCatDropdown(v => !v)}
                className="w-full flex items-center justify-between border border-zinc-200 rounded-lg px-3 py-2 text-sm text-zinc-700 bg-white hover:bg-zinc-50">
                <span className="capitalize">{linkForm.category}</span><ChevronDown className="w-4 h-4 text-zinc-400" />
              </button>
              {showCatDropdown && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-zinc-200 rounded-lg shadow-lg z-50 py-1">
                  {LINK_CATEGORIES.map(cat => (
                    <button key={cat} onClick={() => { setLinkForm(f => ({ ...f, category: cat })); setShowCatDropdown(false); }}
                      className={`w-full text-left px-3 py-1.5 text-xs capitalize transition-colors ${linkForm.category === cat ? 'bg-blue-50 text-blue-700 font-medium' : 'text-zinc-600 hover:bg-zinc-50'}`}>
                      {cat}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div>
            <label className="text-[10px] font-medium text-zinc-500 uppercase tracking-wide mb-1 block">URL *</label>
            <input value={linkForm.url} onChange={e => setLinkForm(f => ({ ...f, url: e.target.value }))}
              placeholder="https://..." className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
          </div>
          <div>
            <label className="text-[10px] font-medium text-zinc-500 uppercase tracking-wide mb-1 block">Description (optional)</label>
            <textarea value={linkForm.description} onChange={e => setLinkForm(f => ({ ...f, description: e.target.value }))}
              rows={2} placeholder="Brief description..." className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white resize-y" />
          </div>
          <label className="flex items-center gap-2 text-xs text-zinc-700 cursor-pointer">
            <input type="checkbox" checked={linkForm.is_pinned} onChange={e => setLinkForm(f => ({ ...f, is_pinned: e.target.checked }))}
              className="rounded border-zinc-300 text-blue-600 focus:ring-blue-500" />
            Pin this link
          </label>
          <div className="flex items-center gap-2 pt-2">
            <button onClick={() => setShowAddLink(false)} className="px-3 py-1.5 text-xs text-zinc-600 hover:bg-zinc-100 rounded-md">Cancel</button>
            <button onClick={handleCreateLink} disabled={!linkForm.title.trim() || !linkForm.url.trim()}
              className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50">Save Link</button>
          </div>
        </div>
      )}

      {/* Links & Attachments List */}
      {links.length === 0 && attachments.length === 0 && !showAddLink ? (
        <div className="border border-zinc-200 rounded-lg px-4 py-12 text-center">
          <div className="mx-auto w-12 h-12 bg-zinc-100 rounded-full flex items-center justify-center mb-3">
            <Link2 className="w-6 h-6 text-zinc-400" />
          </div>
          <p className="text-sm font-medium text-zinc-600">No links or attachments</p>
          <p className="text-xs text-zinc-400 mt-1">Add links to documents, repos, designs, and more</p>
          <button onClick={() => setShowAddLink(true)}
            className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors">
            <Plus className="w-4 h-4" /> Add Link
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {/* Pinned */}
          {links.filter((l: any) => l.is_pinned).length > 0 && (
            <>
              <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">📌 Pinned</p>
              {links.filter((l: any) => l.is_pinned).map((link: any) => renderLinkCard(link, true))}
              <div className="border-t border-zinc-100 my-3" />
            </>
          )}
          {/* Grouped by category */}
          {LINK_CATEGORIES.map(cat => {
            const catLinks = links.filter((l: any) => l.category === cat && !l.is_pinned);
            const catAttachments = attachments.filter((a: any) => a.category === cat);
            if (catLinks.length === 0 && catAttachments.length === 0) return null;
            return (
              <div key={cat}>
                <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-2">{cat.charAt(0).toUpperCase() + cat.slice(1)}</p>
                {catLinks.map((link: any) => renderLinkCard(link, false))}
                {catAttachments.map((att: any) => renderAttachmentCard(att))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
