import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useTheme } from '@/hooks/useTheme';
import { useResource, useResourceSummary, useWorkItems, useProjectReleases } from '@/hooks/useResource360';
import AiIntelligencePanelV16 from '@/components/resource360/AiIntelligencePanelV16';
import ResourceBanner from '@/components/resource360/ResourceBanner';
import Toolbar, { R360View, RoleFilter } from '@/components/resource360/Toolbar';
import RingViewV16 from '@/components/resource360/RingViewV16';
import ChronologyView from '@/components/resource360/ChronologyView';
import ListView from '@/components/resource360/ListView';

import ContextModal from '@/components/resource360/ContextModal';
import AiIntelligenceOverlay from '@/components/resource360/AiIntelligenceOverlay';
import '@/components/resource360/r360-tokens.css';

const SkeletonBlock = ({ height = 40 }: { height?: number }) => (
  <div className="r360-skeleton" style={{ height, borderRadius: 6, width: '100%' }} />
);

const ErrorBanner = ({ message, onRetry }: { message: string; onRetry: () => void }) => {
  const { isDark } = useTheme();
  return (
    <div style={{
      background: isDark ? 'rgba(220,38,38,0.1)' : 'rgba(248,113,113,0.10)', border: '1.5px solid #FCA5A5', borderRadius: 8,
      padding: '12px 16px', margin: '12px 20px',
      display: 'flex', alignItems: 'center', gap: 12,
      fontFamily: "'Inter', sans-serif",
    }}>
      <span style={{ fontSize: 13, color: '#DC2626', flex: 1 }}>Failed to load data: {message}</span>
      <button onClick={onRetry} style={{
        fontSize: 12, fontWeight: 600, padding: '5px 14px', borderRadius: 6,
        background: isDark ? '#1A1A1A' : '#FFFFFF', border: '1px solid #FCA5A5', color: '#DC2626',
        cursor: 'pointer',
      }}>Retry</button>
    </div>
  );
};

const Resource360Page = () => {
  const { isDark } = useTheme();
  const { resourceId } = useParams<{ resourceId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const rid = resourceId ?? '009';
  const { data: resource, isLoading, error, refetch } = useResource(rid);
  const jiraAccountId = resource?.jira_account_id ?? null;
  const { data: summary, isLoading: summaryLoading, error: summaryError, refetch: refetchSummary } = useResourceSummary(resource?.id ?? '', jiraAccountId);
  const { data: items, isLoading: itemsLoading, error: itemsError, refetch: refetchItems } = useWorkItems(resource?.id ?? '', jiraAccountId);
  const { data: projectReleases } = useProjectReleases(jiraAccountId);

  const viewParam = searchParams.get('view') as R360View | null;
  const [activeView, setActiveView] = useState<R360View>(viewParam || 'ring');

  // Sync view from URL query param
  useEffect(() => {
    if (viewParam && ['ring', 'chronology', 'list'].includes(viewParam)) {
      setActiveView(viewParam);
    }
  }, [viewParam]);
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [groupBy, setGroupBy] = useState('status');
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [showAi, setShowAi] = useState(false);
  const [selectedRelease, setSelectedRelease] = useState('all');
  const [selectedProject, setSelectedProject] = useState('all');

  // Derive release options from all projects this resource works on
  const releaseOptions = useMemo(() => {
    return projectReleases ?? [];
  }, [projectReleases]);

  const projectOptions = useMemo(() => {
    if (!items?.length) return [];
    const map = new Map<string, string>();
    items.forEach((i: any) => {
      if (i.project_key && !map.has(i.project_key)) {
        map.set(i.project_key, i.project_name || i.project_key);
      }
    });
    return Array.from(map.entries()).map(([key, name]) => ({ key, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [items]);

  // Filter items based on toolbar selections
  const filteredItems = useMemo(() => {
    if (!items?.length) return [];
    return items.filter((i: any) => {
      if (selectedRelease !== 'all') {
        const rels = i.release_names || [];
        if (!rels.includes(selectedRelease)) return false;
      }
      if (selectedProject !== 'all') {
        if (i.project_key !== selectedProject) return false;
      }
      return true;
    });
  }, [items, selectedRelease, selectedProject]);

  const handleItemClick = useCallback((item: any) => {
    setSelectedItem(item);
  }, []);

  // Full page loading skeleton
  if (isLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%', fontFamily: "'Inter', sans-serif" }}>
        {/* Banner skeleton */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, padding: '16px 20px', background: isDark ? '#0A0A0A' : '#FFFFFF', borderBottom: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(255,255,255,0.10)' }}>
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
        <div style={{ padding: '8px 20px', background: isDark ? '#0A0A0A' : '#FFFFFF', borderBottom: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(255,255,255,0.10)' }}>
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
    <div className="r360-root" style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%', fontFamily: "'Inter', sans-serif" }}>
      {summaryLoading ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, padding: '16px 20px', background: isDark ? '#0A0A0A' : '#FFFFFF', borderBottom: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(255,255,255,0.10)' }}>
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
        releaseOptions={releaseOptions}
        projectOptions={projectOptions}
        selectedRelease={selectedRelease}
        onReleaseChange={setSelectedRelease}
        selectedProject={selectedProject}
        onProjectChange={setSelectedProject}
      />

      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {activeView === 'ring' && (
          itemsLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: 16 }}>
              <div className="r360-skeleton" style={{ width: 72, height: 72, borderRadius: '50%' }} />
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center' }}>
                {[1,2,3,4,5,6].map(i => (
                  <div key={i} className="r360-skeleton" style={{ width: 185, height: 120, borderRadius: 8 }} />
                ))}
              </div>
            </div>
          ) : (
            <RingViewV16 resource={resource} items={filteredItems} onItemClick={handleItemClick} onAiClick={() => setShowAi(true)} />
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
            <ListView items={filteredItems} roleFilter={roleFilter} onItemClick={handleItemClick} />
          )
        )}
      </div>

      {selectedItem && (
        <ContextModal item={selectedItem} onClose={() => setSelectedItem(null)} />
      )}

      {showAi && resource && activeView === 'ring' ? (
        <AiIntelligencePanelV16
          resourceName={resource.full_name || 'Resource'}
          onClose={() => setShowAi(false)}
        />
      ) : showAi && resource ? (
        <AiIntelligenceOverlay
          resourceId={resource.id}
          resource={resource}
          rid={rid!}
          onClose={() => setShowAi(false)}
        />
      ) : null}

      <style>{skeletonCSS}</style>
    </div>
  );
};

const skeletonCSS = `
  .r360-skeleton {
    background: linear-gradient(90deg, #1A1A1A 25%, rgba(255,255,255,0.10) 50%, #1A1A1A 75%);
    background-size: 200% 100%;
    animation: r360shimmer 1.5s infinite;
  }
  .dark .r360-skeleton {
    background: linear-gradient(90deg, #1A1A1A 25%, #1A1A1A 50%, #1A1A1A 75%);
    background-size: 200% 100%;
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
