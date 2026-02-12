/**
 * ThemesPage — Strategic themes management with card grid
 * Route: /workhub/themes
 */
import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Palette, Plus, Loader2 } from 'lucide-react';
import { useThemeProgress } from '@/hooks/workhub/useThemes';
import type { ThemeProgress } from '@/types/workhub.types';
import { CommandCenterHeader } from '@/components/shared/CommandCenterHeader';
import { ThemeCard } from './ThemeCard';
import { ThemeModal } from './ThemeModal';

type TabKey = 'All' | 'Active' | 'Completed' | 'On Hold';
const TABS: TabKey[] = ['All', 'Active', 'Completed', 'On Hold'];

export function ThemesPage() {
  const navigate = useNavigate();
  const { data: themes, isLoading, error, refetch } = useThemeProgress();
  const [activeTab, setActiveTab] = useState<TabKey>('All');
  const [modalOpen, setModalOpen] = useState(false);

  const tabCounts = useMemo(() => {
    const all = themes ?? [];
    return {
      All: all.length,
      Active: all.filter(t => t.status === 'Active').length,
      Completed: all.filter(t => t.status === 'Completed').length,
      'On Hold': all.filter(t => t.status === 'On Hold').length,
    };
  }, [themes]);

  const filtered = useMemo(() => {
    if (!themes) return [];
    if (activeTab === 'All') return themes;
    return themes.filter(t => t.status === activeTab);
  }, [themes, activeTab]);

  if (isLoading) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100%', color: 'var(--wh-text-secondary, #64748b)',
      }}>
        <Loader2 className="animate-spin" size={24} />
        <span style={{ marginLeft: 8, fontSize: 14 }}>Loading themes...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        height: '100%', gap: 12,
      }}>
        <p style={{ color: '#ef4444', fontSize: 14 }}>Failed to load themes</p>
        <button onClick={() => refetch()} style={{
          padding: '8px 16px', borderRadius: 6, border: '1px solid var(--wh-border)',
          background: 'var(--wh-surface)', fontSize: 13, cursor: 'pointer',
        }}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: 'var(--wh-font-sans)', display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Header */}
      <CommandCenterHeader
        title="Themes"
        subtitle={`Strategic initiatives — ${themes?.length ?? 0} themes`}
        onRefresh={() => refetch()}
        actions={
          <button
            onClick={() => setModalOpen(true)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '8px 16px', borderRadius: 8, border: 'none',
              background: 'var(--wh-primary, #2563eb)', color: '#fff',
              fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}
          >
            <Plus size={16} />
            New Theme
          </button>
        }
      />

      {/* Content with padding */}
      <div className="flex flex-col flex-1 min-h-0 px-6 pb-4 overflow-y-auto">

      {/* Status Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
        {TABS.map(tab => {
          const isActive = activeTab === tab;
          return (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{
              padding: '6px 16px', borderRadius: 9999, border: 'none',
              fontSize: 13, fontWeight: 500, cursor: 'pointer',
              background: isActive ? 'var(--wh-primary, #2563eb)' : 'var(--wh-border-light, #f1f5f9)',
              color: isActive ? '#fff' : 'var(--wh-text-secondary, #64748b)',
              transition: 'background 150ms, color 150ms',
            }}>
              {tab} ({tabCounts[tab] ?? 0})
            </button>
          );
        })}
      </div>

      {/* Card Grid */}
      {filtered.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '48px 0',
          color: 'var(--wh-text-tertiary, #94a3b8)', fontSize: 14,
        }}>
          No {activeTab === 'All' ? '' : activeTab.toLowerCase() + ' '}themes found
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
          gap: 20,
        }}>
          {filtered.map(t => (
            <ThemeCard
              key={t.id}
              theme={t}
              onClick={() => navigate(`/projecthub/themes/${t.id}`)}
            />
          ))}
        </div>
      )}

      {/* Create Modal */}
      <ThemeModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />

      <style>{`
        .wh-theme-card:hover {
          box-shadow: var(--wh-shadow-md) !important;
          border-color: var(--wh-border-hover, #cbd5e1) !important;
        }
      `}</style>
      </div>{/* end content wrapper */}
    </div>
  );
}
