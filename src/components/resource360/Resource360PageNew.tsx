import React, { useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import type { Resource360Item, StatusCategory, ViewMode, Quarter } from '@/types/resource360';
import { useResource360Items } from './hooks/useResource360Items';
import { useResource360Summary } from './hooks/useResource360Summary';
import { Resource360Banner } from './Resource360Banner';
import { Resource360Toolbar } from './Resource360Toolbar';
import { Resource360Ring } from './Resource360Ring';
import { Resource360Chronology } from './Resource360Chronology';
import { Resource360List } from './Resource360List';
import { Resource360ContextModal } from './Resource360ContextModal';
import { Resource360AIPanel } from './Resource360AIPanel';

/**
 * Resource 360° main page container.
 * Manages all state and wires together: banner, toolbar, view panels, modal, AI panel.
 */
export default function Resource360PageNew() {
  const { resourceId } = useParams<{ resourceId: string }>();
  const navigate = useNavigate();

  // State
  const [activeView, setActiveView] = useState<ViewMode>('ring');
  const [statusFilter, setStatusFilter] = useState<StatusCategory>('all');
  const [quarter, setQuarter] = useState<Quarter>('Q1-2026');
  const [selectedItem, setSelectedItem] = useState<Resource360Item | null>(null);
  const [aiOpen, setAIOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Data
  const { data: items = [], isLoading: itemsLoading } = useResource360Items(resourceId);
  const { data: summary, isLoading: summaryLoading } = useResource360Summary(resourceId);

  // Handlers
  const handleItemClick = useCallback((item: Resource360Item) => {
    setSelectedItem(item);
  }, []);

  const handleModalClose = useCallback(() => {
    setSelectedItem(null);
  }, []);

  const handleModalNavigate = useCallback((item: Resource360Item) => {
    setSelectedItem(item);
  }, []);

  const handleFullscreenToggle = useCallback(() => {
    setIsFullscreen((prev) => !prev);
  }, []);

  // Resource info
  const resourceName = summary?.name ?? 'Resource';
  const resourceAvatar = summary?.avatar_url ?? null;
  const jobRole = summary?.role ?? '';
  const department = summary?.department ?? '';

  // No resource ID
  if (!resourceId) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontFamily: "'Inter', sans-serif" }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: 40, marginBottom: 8 }}>👤</p>
          <p style={{ fontSize: 16, fontWeight: 600, color: '#374151' }}>No resource selected</p>
          <p style={{ fontSize: 13, color: '#9CA3AF', marginTop: 4 }}>
            Select a team member to view their 360° workload
          </p>
        </div>
      </div>
    );
  }

  // Loading state — only show skeleton on initial load, not on error/empty
  if (itemsLoading && !items.length && !summary) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', fontFamily: "'Inter', sans-serif" }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, padding: '16px 20px', background: '#FFFFFF', borderBottom: '1px solid #E2E8F0' }}>
          <div className="r360-skeleton" style={{ width: 64, height: 64, borderRadius: '50%' }} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div className="r360-skeleton" style={{ height: 20, borderRadius: 6, width: '100%' }} />
            <div className="r360-skeleton" style={{ height: 14, borderRadius: 6, width: '60%' }} />
          </div>
        </div>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center', color: '#9CA3AF', fontSize: 13 }}>Loading Resource 360°...</div>
        </div>
        <style>{skeletonCSS}</style>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%', fontFamily: "'Inter', sans-serif" }}>
      {/* Back navigation */}
      {!isFullscreen && (
        <div style={{
          padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 12,
          borderBottom: '1px solid #F1F5F9', background: '#FFFFFF',
        }}>
          <button
            onClick={() => navigate('/project-hub/resources')}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              fontSize: 12, fontWeight: 600, color: '#374151',
              border: '1px solid #E2E8F0', borderRadius: 6,
              padding: '6px 12px', background: 'transparent', cursor: 'pointer',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = '#2563EB'; e.currentTarget.style.borderColor = '#2563EB'; e.currentTarget.style.background = '#EFF6FF'; }}
            onMouseLeave={e => { e.currentTarget.style.color = '#374151'; e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.background = 'transparent'; }}
          >
            <ArrowLeft size={14} />
            All Resources
          </button>
          <span style={{ fontSize: 11, fontWeight: 500, color: '#475569' }}>
            Resources › <strong style={{ color: '#0F172A' }}>{resourceName}</strong>
          </span>
        </div>
      )}

      {/* Banner */}
      {!isFullscreen && (
        <Resource360Banner summary={summary ?? null} isLoading={summaryLoading} />
      )}

      {/* Toolbar */}
      <Resource360Toolbar
        activeView={activeView}
        onViewChange={setActiveView}
        quarter={quarter}
        onQuarterChange={setQuarter}
        onAIOpen={() => setAIOpen(true)}
        isFullscreen={isFullscreen}
        onFullscreenToggle={handleFullscreenToggle}
      />

      {/* View container */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        {activeView === 'ring' && (
          <Resource360Ring
            items={items}
            resourceName={resourceName}
            resourceAvatar={resourceAvatar}
            jobRole={jobRole}
            department={department}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            onItemClick={handleItemClick}
          />
        )}

        {activeView === 'chronology' && (
          <Resource360Chronology items={items} onItemClick={handleItemClick} />
        )}

        {activeView === 'list' && (
          <Resource360List items={items} onItemClick={handleItemClick} />
        )}
      </div>

      {/* Context Modal */}
      {selectedItem && (
        <Resource360ContextModal
          item={selectedItem}
          allItems={items}
          onClose={handleModalClose}
          onNavigate={handleModalNavigate}
        />
      )}

      {/* AI Intelligence Panel */}
      <Resource360AIPanel
        items={items}
        resourceName={resourceName}
        isOpen={aiOpen}
        onClose={() => setAIOpen(false)}
      />

      <style>{skeletonCSS}</style>
    </div>
  );
}

const skeletonCSS = `
  .r360-skeleton {
    background: linear-gradient(90deg, #F1F5F9 25%, #E2E8F0 50%, #F1F5F9 75%);
    background-size: 200% 100%;
    animation: r360shimmer 1.5s infinite;
  }
  @keyframes r360shimmer {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }
`;
