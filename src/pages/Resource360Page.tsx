import React, { useState, useCallback, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useResource, useResourceSummary, useWorkItems } from '@/hooks/useResource360';
import { ArrowLeft } from 'lucide-react';
import ResourceBanner from '@/components/resource360/ResourceBanner';
import Toolbar, { R360View, RoleFilter } from '@/components/resource360/Toolbar';
import TentacleView from '@/components/resource360/TentacleView';
import ChronologyView from '@/components/resource360/ChronologyView';
import ListView from '@/components/resource360/ListView';

import ContextModal from '@/components/resource360/ContextModal';
import AiIntelligenceOverlay from '@/components/resource360/AiIntelligenceOverlay';

const SkeletonBlock = ({ height = 40 }: { height?: number }) => (
  <div className="r360-skeleton" style={{ height, borderRadius: 6, width: '100%' }} />
);

const ErrorBanner = ({ message, onRetry }: { message: string; onRetry: () => void }) => (
  <div style={{
    background: '#FEE2E2', border: '1.5px solid #FCA5A5', borderRadius: 8,
    padding: '12px 16px', margin: '12px 20px',
    display: 'flex', alignItems: 'center', gap: 12,
    fontFamily: "'Inter', sans-serif",
  }}>
    <span style={{ fontSize: 13, color: '#DC2626', flex: 1 }}>⚠ Failed to load data: {message}</span>
    <button onClick={onRetry} style={{
      fontSize: 12, fontWeight: 600, padding: '5px 14px', borderRadius: 6,
      background: '#FFFFFF', border: '1px solid #FCA5A5', color: '#DC2626',
      cursor: 'pointer',
    }}>Retry</button>
  </div>
);

const Resource360Page = () => {
  const { resourceId } = useParams<{ resourceId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const rid = resourceId ?? '009';
  const { data: resource, isLoading, error, refetch } = useResource(rid);
  const { data: summary, isLoading: summaryLoading, error: summaryError, refetch: refetchSummary } = useResourceSummary(resource?.id ?? '');
  const { data: items, isLoading: itemsLoading, error: itemsError, refetch: refetchItems } = useWorkItems(resource?.id ?? '');

  const viewParam = searchParams.get('view') as R360View | null;
  const [activeView, setActiveView] = useState<R360View>(viewParam || 'tentacle');

  // Sync view from URL query param
  useEffect(() => {
    if (viewParam && ['tentacle', 'chronology', 'list'].includes(viewParam)) {
      setActiveView(viewParam);
    }
  }, [viewParam]);
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [groupBy, setGroupBy] = useState('status');
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [showAi, setShowAi] = useState(false);

  const handleItemClick = useCallback((item: any) => {
    setSelectedItem(item);
  }, []);

  // Full page loading skeleton
  if (isLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%', fontFamily: "'Inter', sans-serif" }}>
        {/* Banner skeleton */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, padding: '16px 20px', background: '#FFFFFF', borderBottom: '1px solid #E2E8F0' }}>
          <div className="r360-skeleton" style={{ width: 64, height: 64, borderRadius: '50%' }} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <SkeletonBlock height={20} />
            <SkeletonBlock height={14} />
            <div style={{ display: 'flex', gap: 6 }}>
              {[80, 90, 120, 60, 80, 60].map((w, i) => (
                <div key={i} className="r360-skeleton" style={{ width: w, height: 22, borderRadius: 4 }} />
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {[1,2,3,4].map(i => (
              <div key={i} className="r360-skeleton" style={{ width: 90, height: 56, borderRadius: 8 }} />
            ))}
          </div>
        </div>
        {/* Toolbar skeleton */}
        <div style={{ padding: '8px 20px', background: '#FFFFFF', borderBottom: '1px solid #E2E8F0' }}>
          <SkeletonBlock height={36} />
        </div>
        {/* Content skeleton */}
        <div style={{ flex: 1, padding: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
          <div className="r360-skeleton" style={{ width: 72, height: 72, borderRadius: '50%' }} />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center' }}>
            {[1,2,3,4,5,6].map(i => (
              <div key={i} className="r360-skeleton" style={{ width: 185, height: 120, borderRadius: 8 }} />
            ))}
          </div>
        </div>
        <style>{skeletonCSS}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', fontFamily: "'Inter', sans-serif" }}>
        <ErrorBanner message={error.message} onRetry={() => refetch()} />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%', fontFamily: "'Inter', sans-serif" }}>
      {/* Back navigation */}
      <div style={{
        padding: '10px 20px', display: 'flex', alignItems: 'center', gap: '12px',
        borderBottom: '1px solid #F1F5F9', background: '#FFFFFF',
      }}>
        <button
          onClick={() => navigate('/project-hub/resources')}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            fontSize: '12px', fontWeight: 600, color: '#374151',
            border: '1px solid #E2E8F0', borderRadius: '6px',
            padding: '6px 12px', background: 'transparent', cursor: 'pointer',
          }}
          onMouseEnter={e => { e.currentTarget.style.color = '#2563EB'; e.currentTarget.style.borderColor = '#2563EB'; e.currentTarget.style.background = '#EFF6FF'; }}
          onMouseLeave={e => { e.currentTarget.style.color = '#374151'; e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.background = 'transparent'; }}
        >
          <ArrowLeft size={14} />
          All Resources
        </button>
        <span style={{ fontSize: '11px', fontWeight: 500, color: '#475569' }}>
          Resources › <strong style={{ color: '#0F172A' }}>{resource?.full_name || `RID ${rid}`}</strong>
        </span>
      </div>
      {summaryLoading ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, padding: '16px 20px', background: '#FFFFFF', borderBottom: '1px solid #E2E8F0' }}>
          <div className="r360-skeleton" style={{ width: 64, height: 64, borderRadius: '50%' }} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <SkeletonBlock height={20} />
            <SkeletonBlock height={14} />
          </div>
        </div>
      ) : (
        <ResourceBanner resource={resource} summary={summary} />
      )}

      {summaryError && <ErrorBanner message={summaryError.message} onRetry={() => refetchSummary()} />}
      {itemsError && <ErrorBanner message={itemsError.message} onRetry={() => refetchItems()} />}

      <Toolbar
        activeView={activeView}
        onViewChange={setActiveView}
        roleFilter={roleFilter}
        onRoleFilterChange={setRoleFilter}
        onAiClick={() => setShowAi(true)}
        groupBy={groupBy}
        onGroupByChange={setGroupBy}
      />

      <div style={{ flex: 1, overflow: 'auto' }}>
        {activeView === 'tentacle' && (
          itemsLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 'calc(100vh - 280px)', gap: 16 }}>
              <div className="r360-skeleton" style={{ width: 72, height: 72, borderRadius: '50%' }} />
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center' }}>
                {[1,2,3,4,5,6].map(i => (
                  <div key={i} className="r360-skeleton" style={{ width: 185, height: 120, borderRadius: 8 }} />
                ))}
              </div>
            </div>
          ) : (
            <TentacleView resource={resource} items={items || []} roleFilter={roleFilter} onItemClick={handleItemClick} />
          )
        )}
        {activeView === 'chronology' && (
          <ChronologyView resourceId={resource?.id ?? ''} onItemClick={handleItemClick} />
        )}
        {activeView === 'list' && (
          itemsLoading ? (
            <div style={{ padding: '0 20px 20px', display: 'flex', flexDirection: 'column', gap: 2 }}>
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="r360-skeleton" style={{ height: 44, borderRadius: 4 }} />
              ))}
            </div>
          ) : (
            <ListView items={items || []} roleFilter={roleFilter} onItemClick={handleItemClick} />
          )
        )}
      </div>

      {selectedItem && (
        <ContextModal item={selectedItem} onClose={() => setSelectedItem(null)} />
      )}

      {showAi && resource && (
        <AiIntelligenceOverlay
          resourceId={resource.id}
          resource={resource}
          onClose={() => setShowAi(false)}
        />
      )}

      <style>{skeletonCSS}</style>
    </div>
  );
};

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
  *:focus-visible {
    outline: 2px solid #2563EB;
    outline-offset: 2px;
  }
`;

export default Resource360Page;
