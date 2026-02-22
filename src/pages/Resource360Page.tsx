import React, { useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useResource, useResourceSummary, useWorkItems } from '@/hooks/useResource360';
import ResourceBanner from '@/components/resource360/ResourceBanner';
import Toolbar, { R360View, RoleFilter } from '@/components/resource360/Toolbar';
import TentacleView from '@/components/resource360/TentacleView';
import ChronologyView from '@/components/resource360/ChronologyView';
import ListView from '@/components/resource360/ListView';
import ConstellationView from '@/components/resource360/ConstellationView';
import ContextModal from '@/components/resource360/ContextModal';
import AiIntelligenceOverlay from '@/components/resource360/AiIntelligenceOverlay';

const Resource360Page = () => {
  const { resourceId } = useParams<{ resourceId: string }>();
  const rid = resourceId ?? '009';
  const { data: resource, isLoading, error } = useResource(rid);
  const { data: summary } = useResourceSummary(resource?.id ?? '');
  const { data: items } = useWorkItems(resource?.id ?? '');

  const [activeView, setActiveView] = useState<R360View>('tentacle');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [groupBy, setGroupBy] = useState('status');
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [showAi, setShowAi] = useState(false);

  const handleItemClick = useCallback((item: any) => {
    setSelectedItem(item);
  }, []);

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontFamily: "'Inter', sans-serif" }}>
        <p style={{ fontSize: 14, color: '#64748B' }}>Loading resource...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontFamily: "'Inter', sans-serif" }}>
        <p style={{ fontSize: 14, color: '#DC2626' }}>Error: {error.message}</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%', fontFamily: "'Inter', sans-serif" }}>
      <ResourceBanner resource={resource} summary={summary} />
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
          <TentacleView
            resource={resource}
            items={items || []}
            roleFilter={roleFilter}
            onItemClick={handleItemClick}
          />
        )}
        {activeView === 'chronology' && (
          <ChronologyView
            resourceId={resource?.id ?? ''}
            onItemClick={handleItemClick}
          />
        )}
        {activeView === 'list' && (
          <ListView
            items={items || []}
            roleFilter={roleFilter}
            onItemClick={handleItemClick}
          />
        )}
        {activeView === 'constellation' && (
          <ConstellationView currentResourceId={resource?.id ?? ''} />
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
    </div>
  );
};

export default Resource360Page;
