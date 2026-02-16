/**
 * ALL RELEASES PAGE V2 — ReleaseHub Complete Rebuild
 * Orchestrator component using modular architecture per DYNAMITE PROMPT V2
 */
import { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, Sparkles, Plus, Loader2, RefreshCw } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useReleasesV2, type ViewMode, type ReleaseFiltersV2, type ReleaseStatusV2, type ReleaseHealthLevel } from '@/hooks/releases/useReleasesV2';
import { ReleaseSummaryStrip } from '@/components/releases/ReleaseSummaryStrip';
import { ReleaseToolbar } from '@/components/releases/ReleaseToolbar';
import { ReleaseCards } from '@/components/releases/ReleaseCards';
import { ReleaseTable } from '@/components/releases/ReleaseTable';
import { ReleaseTimeline } from '@/components/releases/ReleaseTimeline';
import { ReleaseAIInsights } from '@/components/releases/ReleaseAIInsights';
import { ReleaseNewModal } from '@/components/releases/ReleaseNewModal';
import styles from '@/styles/release-hub.module.css';

export default function AllReleasesPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [view, setView] = useState<ViewMode>('cards');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ReleaseStatusV2[]>([]);
  const [healthFilter, setHealthFilter] = useState<ReleaseHealthLevel[]>([]);
  const [showNewModal, setShowNewModal] = useState(false);
  const [showAI, setShowAI] = useState(false);

  const filters: ReleaseFiltersV2 = useMemo(() => ({
    search, status: statusFilter, health: healthFilter,
  }), [search, statusFilter, healthFilter]);

  const { data: releases = [], isLoading, isError, error, refetch } = useReleasesV2(filters);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel(`rh-live-${crypto.randomUUID().slice(0, 6)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'releases' }, () => {
        queryClient.invalidateQueries({ queryKey: ['releases-v2'] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  // Keyboard: ⌘K for search
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        document.getElementById('rh-search')?.focus();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const handleNavigate = useCallback((id: string) => {
    navigate(`/releasehub/command-center?releaseId=${id}`);
  }, [navigate]);

  const toggleStatus = useCallback((s: ReleaseStatusV2) => {
    setStatusFilter(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  }, []);

  return (
    <div className={styles.releaseHub}>
      {/* ═══ PAGE HEADER ═══ */}
      <header className={styles.pageHeader}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Package size={20} style={{ color: 'var(--rh-primary)' }} />
          <h1 className={styles.pageTitle}>All Releases</h1>
          <span className={styles.pageSubtitle}>{releases.length} releases</span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className={styles.btnAI} onClick={() => setShowAI(true)}>
            <Sparkles size={14} /> AI Insights
          </button>
          <button className={styles.btnPrimary} onClick={() => setShowNewModal(true)}>
            <Plus size={14} /> New Release
          </button>
        </div>
      </header>

      {/* ═══ SUMMARY STRIP ═══ */}
      <ReleaseSummaryStrip releases={releases} />

      {/* ═══ TOOLBAR ═══ */}
      <ReleaseToolbar
        search={search}
        onSearchChange={setSearch}
        statusFilter={statusFilter}
        onToggleStatus={toggleStatus}
        view={view}
        onViewChange={setView}
        releases={releases}
      />

      {/* ═══ CONTENT ═══ */}
      <div className={styles.content}>
        {isLoading ? (
          <div className={styles.loadingCenter}>
            <Loader2 size={24} style={{ animation: 'spin 1s linear infinite' }} />
            Loading releases...
          </div>
        ) : isError ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyStateTitle}>Error loading releases</div>
            <div className={styles.emptyStateDesc}>{(error as Error).message}</div>
            <button className={styles.btnOutline} onClick={() => refetch()} style={{ marginTop: 16 }}>
              <RefreshCw size={14} /> Retry
            </button>
          </div>
        ) : releases.length === 0 ? (
          <div className={styles.emptyState}>
            <Package size={40} style={{ color: 'var(--rh-text-muted)', marginBottom: 12 }} />
            <div className={styles.emptyStateTitle}>No releases found</div>
            <div className={styles.emptyStateDesc}>
              {search || statusFilter.length > 0 ? 'Try adjusting your filters' : 'Create your first release to get started'}
            </div>
            {!search && statusFilter.length === 0 && (
              <button className={styles.btnPrimary} onClick={() => setShowNewModal(true)} style={{ marginTop: 16 }}>
                <Plus size={14} /> New Release
              </button>
            )}
          </div>
        ) : (
          <>
            {view === 'cards' && <ReleaseCards releases={releases} onNavigate={handleNavigate} />}
            {view === 'table' && <ReleaseTable releases={releases} onNavigate={handleNavigate} />}
            {view === 'timeline' && <ReleaseTimeline releases={releases} onNavigate={handleNavigate} />}
          </>
        )}
      </div>

      {/* ═══ STATUS BAR ═══ */}
      <div className={styles.statusBar}>
        <span className={styles.statusBarText}>{releases.length} releases</span>
        <span className={styles.statusBarText}>{view.charAt(0).toUpperCase() + view.slice(1)} view</span>
      </div>

      {/* ═══ MODALS ═══ */}
      <ReleaseNewModal
        isOpen={showNewModal}
        onClose={() => setShowNewModal(false)}
        onCreated={() => queryClient.invalidateQueries({ queryKey: ['releases-v2'] })}
      />
      <ReleaseAIInsights isOpen={showAI} onClose={() => setShowAI(false)} />
    </div>
  );
}
