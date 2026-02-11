/**
 * ReleasesPage — Release management with tabbed filtering
 * Route: /workhub/releases
 */
import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Rocket, Plus, Loader2 } from 'lucide-react';
import { useReleaseProgress } from '@/hooks/workhub/useReleases';
import type { ReleaseStatus } from '@/types/workhub.types';
import { ReleaseCard } from './ReleaseCard';
import { ReleaseModal } from './ReleaseModal';

type TabKey = 'All' | ReleaseStatus;

const TABS: TabKey[] = ['All', 'Active', 'At Risk', 'Planned', 'Completed'];

export function ReleasesPage() {
  const navigate = useNavigate();
  const { data: releases, isLoading, error, refetch } = useReleaseProgress();
  const [activeTab, setActiveTab] = useState<TabKey>('All');
  const [showModal, setShowModal] = useState(false);

  const tabCounts = useMemo(() => {
    const all = releases ?? [];
    return {
      All: all.length,
      Active: all.filter(r => r.status === 'Active').length,
      'At Risk': all.filter(r => r.status === 'At Risk').length,
      Planned: all.filter(r => r.status === 'Planned').length,
      Completed: all.filter(r => r.status === 'Completed').length,
    };
  }, [releases]);

  const filtered = useMemo(() => {
    if (!releases) return [];
    if (activeTab === 'All') return releases;
    return releases.filter(r => r.status === activeTab);
  }, [releases, activeTab]);

  if (isLoading) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100%', color: 'var(--wh-text-secondary, #64748b)',
      }}>
        <Loader2 className="animate-spin" size={24} />
        <span style={{ marginLeft: 8, fontSize: 14 }}>Loading releases...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        height: '100%', gap: 12,
      }}>
        <p style={{ color: '#ef4444', fontSize: 14 }}>Failed to load releases</p>
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
    <div style={{ padding: '24px 32px', maxWidth: 900, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10, background: '#dbeafe',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <Rocket size={20} color="#2563eb" />
          </div>
          <div>
            <h1 style={{
              fontSize: 24, fontWeight: 700, margin: 0,
              fontFamily: 'var(--wh-font-display, Sora, sans-serif)',
              color: 'var(--wh-text-primary, #0f172a)',
            }}>
              Releases
            </h1>
            <p style={{
              fontSize: 14, color: 'var(--wh-text-secondary, #64748b)',
              margin: '2px 0 0',
            }}>
              Deployment timelines & health — {releases?.length ?? 0} releases
            </p>
          </div>
        </div>

        <button onClick={() => setShowModal(true)} style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          height: 36, padding: '0 16px', borderRadius: 'var(--wh-radius-md, 6px)',
          border: 'none', background: 'var(--wh-primary, #2563eb)', color: '#fff',
          fontSize: 13, fontWeight: 600, cursor: 'pointer',
        }}>
          <Plus size={16} /> New Release
        </button>
      </div>

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

      {/* Cards */}
      {filtered.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '48px 0',
          color: 'var(--wh-text-tertiary, #94a3b8)', fontSize: 14,
        }}>
          No {activeTab === 'All' ? '' : activeTab.toLowerCase() + ' '}releases found
        </div>
      ) : (
        filtered.map(rel => (
          <ReleaseCard
            key={rel.id}
            release={rel}
            onClick={() => navigate(`/workhub/releases/${rel.id}`)}
          />
        ))
      )}

      {/* Create Modal */}
      <ReleaseModal isOpen={showModal} onClose={() => setShowModal(false)} />

      <style>{`
        .wh-release-card:hover {
          box-shadow: var(--wh-shadow-md) !important;
          border-color: var(--wh-border-hover, #cbd5e1) !important;
        }
        .wh-view-detail:hover { text-decoration: underline; }
      `}</style>
    </div>
  );
}
