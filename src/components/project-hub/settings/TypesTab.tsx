import { useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { TypeRow } from './types/TypeRow';
import { TypeHierarchy } from './types/TypeHierarchy';
import { FeatureLayerToggle } from './types/FeatureLayerToggle';
import { FieldLayoutPanel } from './types/FieldLayoutPanel';

interface TypesTabProps {
  projectId: string;
  featureLayer: boolean;
}

interface WorkType {
  id: string;
  name: string;
  icon: string;
  color: string;
  level: string;
  is_enabled: boolean;
  position: number;
}

export function TypesTab({ projectId, featureLayer }: TypesTabProps) {
  const queryClient = useQueryClient();
  const [selectedTypeId, setSelectedTypeId] = useState<string | null>(null);
  const [currentFeatureLayer, setCurrentFeatureLayer] = useState(featureLayer);

  const { data: types = [], isLoading } = useQuery({
    queryKey: ['ph-work-types', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ph_work_types')
        .select('*')
        .eq('project_id', projectId)
        .order('position');
      if (error) throw new Error(error.message);
      return (data || []) as WorkType[];
    },
    enabled: !!projectId,
  });

  const selectedType = types.find(t => t.id === selectedTypeId);

  const handleToggled = useCallback(() => {
    setCurrentFeatureLayer(prev => !prev);
    queryClient.invalidateQueries({ queryKey: ['ph-work-types', projectId] });
    queryClient.invalidateQueries({ queryKey: ['ph-project-settings'] });
  }, [queryClient, projectId]);

  return (
    <div className="space-y-5">
      {/* Work Types List */}
      <div
        className="rounded-xl"
        style={{
          background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 12,
          padding: '20px 24px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
        }}
      >
        <h3 style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', fontFamily: "'Sora', sans-serif" }}>
          Work Types
        </h3>
        <p style={{ fontSize: 12, color: '#64748B', marginTop: 4, marginBottom: 16 }}>
          Types define the hierarchy and field layout of work items.
        </p>

        {isLoading ? (
          <div style={{ padding: '20px 0', textAlign: 'center', fontSize: 13, color: '#94A3B8' }}>Loading...</div>
        ) : types.length === 0 ? (
          <div style={{ padding: '20px 0', textAlign: 'center', fontSize: 13, color: '#94A3B8' }}>No work types configured</div>
        ) : (
          <div className="space-y-0.5">
            {types.map(t => (
              <TypeRow
                key={t.id}
                name={t.name}
                icon={t.icon}
                color={t.color}
                level={t.level}
                isEnabled={t.is_enabled}
                isFeatureType={t.name === 'Feature'}
                featureLayerEnabled={currentFeatureLayer}
                itemCount={0}
                onViewFields={() => setSelectedTypeId(selectedTypeId === t.id ? null : t.id)}
              />
            ))}
          </div>
        )}

        {/* Field Layout Panel */}
        {selectedType && (
          <FieldLayoutPanel
            typeId={selectedType.id}
            typeName={selectedType.name}
            onClose={() => setSelectedTypeId(null)}
          />
        )}
      </div>

      {/* Type Hierarchy */}
      <TypeHierarchy featureLayerEnabled={currentFeatureLayer} />

      {/* Feature Layer Toggle inside hierarchy card - rendered separately for layout */}
      <div
        className="rounded-xl"
        style={{
          background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 12,
          padding: '16px 24px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
        }}
      >
        <FeatureLayerToggle projectId={projectId} enabled={currentFeatureLayer} onToggled={handleToggled} />
      </div>
    </div>
  );
}
