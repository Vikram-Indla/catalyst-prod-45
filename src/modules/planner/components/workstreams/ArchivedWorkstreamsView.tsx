// ============================================================
// ARCHIVED WORKSTREAMS VIEW — Dashboard Header Style
// Full page view for managing archived workstreams
// ============================================================

import { useState } from 'react';
import { ArrowLeft, ArchiveRestore, Trash2, Check, Search, Archive } from 'lucide-react';
import { Workstream, useArchiveWorkstream, useDeleteWorkstream } from '../../hooks/usePlannerWorkstreams';
import { Checkbox } from '@/components/ui/checkbox';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface ArchivedWorkstreamsViewProps {
  workstreams: Workstream[];
  isLoading: boolean;
  onBack: () => void;
}

export function ArchivedWorkstreamsView({
  workstreams,
  isLoading,
  onBack,
}: ArchivedWorkstreamsViewProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Workstream | null>(null);
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);

  const archiveWorkstream = useArchiveWorkstream();
  const deleteWorkstream = useDeleteWorkstream();

  // Filter by search
  const filteredWorkstreams = workstreams.filter(ws => 
    !search || ws.name.toLowerCase().includes(search.toLowerCase())
  );

  // Toggle selection
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredWorkstreams.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredWorkstreams.map(ws => ws.id)));
    }
  };

  // Restore handler
  const handleRestore = async (id: string) => {
    await archiveWorkstream.mutateAsync({ id, archive: false });
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  // Bulk restore
  const handleBulkRestore = async () => {
    for (const id of selectedIds) {
      await archiveWorkstream.mutateAsync({ id, archive: false });
    }
    setSelectedIds(new Set());
  };

  // Delete permanently
  const handleDeletePermanently = async () => {
    if (!deleteTarget) return;
    await deleteWorkstream.mutateAsync(deleteTarget.id);
    setDeleteTarget(null);
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.delete(deleteTarget.id);
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Header - Dashboard Style */}
      <header 
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 24px',
          backgroundColor: 'var(--ds-surface, #ffffff)',
          borderBottom: '1px solid #e2e8f0',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button
            onClick={onBack}
            style={{
              padding: '8px',
              color: 'var(--ds-text-subtlest, #64748b)',
              backgroundColor: 'transparent',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--ds-surface-sunken, #f1f5f9)'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            title="Back to workstreams"
          >
            <ArrowLeft size={20} strokeWidth={1.5} />
          </button>
          <div>
            <h1 style={{
              fontSize: '20px',
              fontWeight: 700,
              color: 'var(--ds-text, #0f172a)',
              margin: 0,
            }}>
              Archived Workstreams
            </h1>
            <p style={{
              fontSize: '14px',
              color: 'var(--ds-text-subtlest, #64748b)',
              marginTop: '2px',
              margin: 0,
            }}>
              {filteredWorkstreams.length} archived workstream{filteredWorkstreams.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        {/* Bulk Actions */}
        {selectedIds.size > 0 && (
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-500 dark:text-slate-400">
              {selectedIds.size} selected
            </span>
            <button
              onClick={handleBulkRestore}
              disabled={archiveWorkstream.isPending}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-colors disabled:opacity-50"
            >
              <ArchiveRestore className="w-4 h-4" strokeWidth={1.5} />
              Restore Selected
            </button>
          </div>
        )}
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-6 py-6">
        {/* Search */}
        <div className="mb-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" strokeWidth={1.5} />
            <input
              type="search"
              placeholder="Search archived..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-12 text-center">
            <div className="animate-pulse space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-14 bg-slate-100 dark:bg-slate-700 rounded-lg" />
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && filteredWorkstreams.length === 0 && (
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-12 text-center">
            <div className="w-12 h-12 mx-auto mb-4 bg-slate-100 dark:bg-slate-700 rounded-xl flex items-center justify-center">
              <Archive className="w-6 h-6 text-slate-400" />
            </div>
            <h3 className="text-sm font-medium text-slate-900 dark:text-slate-100 mb-1">
              No archived workstreams
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Archived workstreams will appear here
            </p>
          </div>
        )}

        {/* Table */}
        {!isLoading && filteredWorkstreams.length > 0 && (
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                  <th className="w-12 py-3 px-4">
                    <Checkbox
                      checked={selectedIds.size === filteredWorkstreams.length && filteredWorkstreams.length > 0}
                      onCheckedChange={toggleSelectAll}
                    />
                  </th>
                  <th className="py-3 px-4 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                    Name
                  </th>
                  <th className="py-3 px-4 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                    Health
                  </th>
                  <th className="py-3 px-4 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                    Tasks
                  </th>
                  <th className="py-3 px-4 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                    Archived
                  </th>
                  <th className="py-3 px-4 text-right text-xs font-medium text-slate-500 dark:text-slate-400">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredWorkstreams.map((ws) => (
                  <tr
                    key={ws.id}
                    className={`border-b border-slate-100 dark:border-slate-700 last:border-b-0 transition-colors ${
                      selectedIds.has(ws.id) ? 'bg-blue-50/50 dark:bg-blue-900/10' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                    }`}
                    onMouseEnter={() => setHoveredRow(ws.id)}
                    onMouseLeave={() => setHoveredRow(null)}
                  >
                    {/* Checkbox */}
                    <td className="py-4 px-4">
                      <Checkbox
                        checked={selectedIds.has(ws.id)}
                        onCheckedChange={() => toggleSelect(ws.id)}
                      />
                    </td>

                    {/* Name */}
                    <td className="py-4 px-4">
                      <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                        {ws.name}
                      </span>
                    </td>

                    {/* Health */}
                    <td className="py-4 px-4">
                      <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${
                        ws.health === 'healthy' ? 'text-emerald-600 dark:text-emerald-400' :
                        ws.health === 'at-risk' ? 'text-amber-600 dark:text-amber-400' :
                        'text-red-600 dark:text-red-400'
                      }`}>
                        <span className="w-2 h-2 rounded-full bg-current" />
                        {ws.health === 'healthy' && 'On Track'}
                        {ws.health === 'at-risk' && 'At Risk'}
                        {ws.health === 'critical' && 'Critical'}
                      </span>
                    </td>

                    {/* Tasks */}
                    <td className="py-4 px-4">
                      <span className="text-sm text-slate-600 dark:text-slate-300">
                        {ws.taskCount || 0}
                      </span>
                    </td>

                    {/* Archived Date */}
                    <td className="py-4 px-4">
                      <div className="text-sm">
                        <div className="text-slate-900 dark:text-slate-100">
                          {ws.updated_at 
                            ? new Date(ws.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                            : 'Unknown'
                          }
                        </div>
                      </div>
                    </td>

                    {/* Actions — Hover Reveal with SVG Icons */}
                    <td className="py-4 px-4">
                      <div
                        className={`flex items-center justify-end gap-1 transition-opacity ${
                          hoveredRow === ws.id || selectedIds.has(ws.id) ? 'opacity-100' : 'opacity-0'
                        }`}
                      >
                        {/* RESTORE — SVG Icon */}
                        <button
                          onClick={() => handleRestore(ws.id)}
                          disabled={archiveWorkstream.isPending}
                          className="p-2 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-md transition-colors disabled:opacity-50"
                          title="Restore workstream"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                            <path d="M3 3v5h5" />
                          </svg>
                        </button>

                        {/* DELETE PERMANENTLY — SVG Icon */}
                        <button
                          onClick={() => setDeleteTarget(ws)}
                          disabled={(ws.taskCount || 0) > 0}
                          className="p-2 text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                          title={(ws.taskCount || 0) > 0 ? 'Cannot delete: tasks linked' : 'Delete permanently'}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                            <path d="M3 6h18" />
                            <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                            <line x1="10" y1="11" x2="10" y2="17" />
                            <line x1="14" y1="11" x2="14" y2="17" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer hint */}
        {!isLoading && filteredWorkstreams.length > 0 && (
          <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">
            Archived workstreams can be restored at any time. Permanently deleted workstreams cannot be recovered.
          </p>
        )}
      </main>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete permanently?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes "{deleteTarget?.name}". This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeletePermanently}
              disabled={deleteWorkstream.isPending}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
