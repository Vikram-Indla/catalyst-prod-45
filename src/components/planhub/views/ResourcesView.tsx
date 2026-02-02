import React, { useState } from 'react';
import { Plus, Users, AlertTriangle, UserX, Trash2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { ResourceRow } from '@/types/planhub.types';

interface Props {
  planId?: string | null;
}

export default function ResourcesView({ planId }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showAddModal, setShowAddModal] = useState(false);

  // Fetch resources for selected plan
  const { data: resources, isLoading } = useQuery({
    queryKey: ['planhub', 'resources', planId],
    queryFn: async () => {
      let query = supabase
        .from('planhub_resources')
        .select('*')
        .order('name');
      
      if (planId) {
        query = query.eq('plan_id', planId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as ResourceRow[];
    },
    enabled: !!planId,
  });

  // Delete mutation
  const deleteResource = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('planhub_resources').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planhub', 'resources'] });
      toast({ title: 'Resource removed' });
    },
  });

  // Stats
  const stats = {
    total: resources?.length || 0,
    assigned: resources?.filter(r => !r.is_skeleton).length || 0,
    skeleton: resources?.filter(r => r.is_skeleton).length || 0,
    avgUtilization: resources?.length 
      ? Math.round(resources.reduce((sum, r) => sum + r.utilization, 0) / resources.length)
      : 0,
    overallocated: resources?.filter(r => r.utilization > 100).length || 0,
  };

  const getUtilizationClass = (util: number) => {
    if (util <= 80) return 'low';
    if (util <= 100) return 'medium';
    return 'high';
  };

  const handleDelete = (id: string) => {
    if (confirm('Remove this resource?')) {
      deleteResource.mutate(id);
    }
  };

  if (!planId) {
    return (
      <>
        <div className="ph-page-header">
          <h1 className="ph-page-title">Resources</h1>
          <p className="ph-page-subtitle">Select a plan to manage its resources</p>
        </div>
        <div className="ph-page-body">
          <div className="ph-empty">
            <Users className="ph-empty-icon" />
            <h2 className="ph-empty-title">No Plan Selected</h2>
            <p className="ph-empty-text">Go to Plan Library and select a plan to manage its resources</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="ph-page-header">
        <div className="ph-page-header-content">
          <div>
            <h1 className="ph-page-title">Resources</h1>
            <p className="ph-page-subtitle">Team allocation and utilization</p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="ph-btn ph-btn-primary"
          >
            <Plus size={16} />
            Add Resource
          </button>
        </div>
      </div>

      <div className="ph-page-body">
        {/* Stats */}
        <div className="ph-resource-stats">
          <div className="ph-resource-stat-card">
            <div className="ph-resource-stat-label">
              <Users size={14} />
              Total Resources
            </div>
            <div className="ph-resource-stat-value">{stats.total}</div>
          </div>
          <div className="ph-resource-stat-card">
            <div className="ph-resource-stat-label">
              <Users size={14} />
              Assigned
            </div>
            <div className="ph-resource-stat-value">{stats.assigned}</div>
          </div>
          <div className="ph-resource-stat-card">
            <div className="ph-resource-stat-label">
              <UserX size={14} />
              Skeleton (TBH)
            </div>
            <div className="ph-resource-stat-value">{stats.skeleton}</div>
          </div>
          <div className="ph-resource-stat-card">
            <div className="ph-resource-stat-label">
              <AlertTriangle size={14} style={{ color: stats.avgUtilization > 100 ? 'var(--ph-danger)' : 'var(--ph-primary)' }} />
              Avg. Utilization
            </div>
            <div className="ph-resource-stat-value">{stats.avgUtilization}%</div>
          </div>
        </div>

        {/* Warning for overallocation */}
        {stats.overallocated > 0 && (
          <div className="ph-resource-warning">
            <AlertTriangle size={16} />
            {stats.overallocated} resource{stats.overallocated > 1 ? 's' : ''} overallocated (&gt;100%)
          </div>
        )}

        {/* Resource Grid */}
        {isLoading ? (
          <div className="ph-loading-container">
            <div className="ph-spinner" />
          </div>
        ) : resources?.length === 0 ? (
          <div className="ph-empty">
            <Users className="ph-empty-icon" />
            <h2 className="ph-empty-title">No resources yet</h2>
            <p className="ph-empty-text">Add team members to track allocation</p>
            <button onClick={() => setShowAddModal(true)} className="ph-btn ph-btn-primary">
              <Plus size={16} />
              Add Resource
            </button>
          </div>
        ) : (
          <div className="ph-resource-grid">
            {/* Headers */}
            <div className="ph-resource-grid-header">Name</div>
            <div className="ph-resource-grid-header">Role</div>
            <div className="ph-resource-grid-header">Assignment</div>
            <div className="ph-resource-grid-header">Utilization</div>
            <div className="ph-resource-grid-header">Skills</div>
            <div className="ph-resource-grid-header"></div>

            {/* Rows */}
            {resources?.map(resource => (
              <React.Fragment key={resource.id}>
                <div className={`ph-resource-grid-cell ${resource.is_skeleton ? 'skeleton' : ''}`}>
                  <div className="ph-resource-name-cell">
                    <span className="ph-resource-name">{resource.name}</span>
                    {resource.is_skeleton && (
                      <span className="ph-resource-skeleton-badge">TBH</span>
                    )}
                  </div>
                </div>
                <div className={`ph-resource-grid-cell ${resource.is_skeleton ? 'skeleton' : ''}`}>
                  {resource.role}
                </div>
                <div className={`ph-resource-grid-cell ${resource.is_skeleton ? 'skeleton' : ''}`}>
                  {resource.assignment || '—'}
                </div>
                <div className={`ph-resource-grid-cell ${resource.is_skeleton ? 'skeleton' : ''}`}>
                  <div className="ph-resource-utilization">
                    <div className="ph-resource-utilization-bar">
                      <div 
                        className={`ph-resource-utilization-fill ${getUtilizationClass(resource.utilization)}`}
                        style={{ width: `${Math.min(resource.utilization, 100)}%` }}
                      />
                    </div>
                    <span style={{ 
                      fontSize: 'var(--ph-text-sm)',
                      color: resource.utilization > 100 ? 'var(--ph-danger)' : 'var(--ph-gray-600)'
                    }}>
                      {resource.utilization}%
                    </span>
                  </div>
                </div>
                <div className={`ph-resource-grid-cell ${resource.is_skeleton ? 'skeleton' : ''}`}>
                  <div className="ph-resource-skills">
                    {resource.skills?.slice(0, 3).map((skill, i) => (
                      <span key={i} className="ph-resource-skill-tag">{skill}</span>
                    ))}
                    {(resource.skills?.length || 0) > 3 && (
                      <span className="ph-resource-skill-more">+{resource.skills!.length - 3}</span>
                    )}
                  </div>
                </div>
                <div className={`ph-resource-grid-cell ${resource.is_skeleton ? 'skeleton' : ''}`}>
                  <button
                    onClick={() => handleDelete(resource.id)}
                    className="ph-btn ph-btn-ghost ph-btn-sm"
                    style={{ color: 'var(--ph-gray-400)' }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </React.Fragment>
            ))}
          </div>
        )}
      </div>

      {/* Add Resource Modal */}
      {showAddModal && (
        <div className="ph-modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="ph-modal" onClick={e => e.stopPropagation()}>
            <div className="ph-modal-header">
              <h2 className="ph-modal-title">Add Resource</h2>
            </div>
            <div className="ph-modal-body">
              <p className="ph-text-muted">Resource form coming in next iteration...</p>
            </div>
            <div className="ph-modal-footer">
              <button onClick={() => setShowAddModal(false)} className="ph-btn ph-btn-secondary">Close</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
