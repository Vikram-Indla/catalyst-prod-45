import React, { useState } from 'react';
import { Plus, Search, FolderOpen, Trash2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import CreatePlanModal from '../modals/CreatePlanModal';
import type { PlanWithLead, PlanStatus, PlanHealth, PlanFilters } from '@/types/planhub.types';

interface Props {
  onPlanSelect: (planId: string) => void;
}

export default function PlanLibrary({ onPlanSelect }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [filters, setFilters] = useState<PlanFilters>({});
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch plans
  const { data: plans, isLoading } = useQuery({
    queryKey: ['planhub', 'plans', filters, searchTerm],
    queryFn: async () => {
      let query = supabase
        .from('planhub_plans')
        .select('*, lead:profiles!planhub_plans_lead_id_fkey(id, full_name, avatar_url)')
        .order('updated_at', { ascending: false });

      if (filters.status) query = query.eq('status', filters.status);
      if (filters.health) query = query.eq('health', filters.health);
      if (searchTerm) {
        query = query.or(`name.ilike.%${searchTerm}%,code.ilike.%${searchTerm}%`);
      }

      const { data, error } = await query;
      if (error) throw new Error(error.message);
      return data as unknown as PlanWithLead[];
    },
  });

  // Delete mutation
  const deletePlan = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('planhub_plans').delete().eq('id', id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planhub', 'plans'] });
      toast({ title: 'Plan deleted' });
    },
    onError: () => {
      toast({ title: 'Failed to delete plan', variant: 'destructive' });
    },
  });

  // Stats
  const stats = {
    total: plans?.length || 0,
    active: plans?.filter(p => p.status === 'active').length || 0,
    ontrack: plans?.filter(p => p.health === 'ontrack').length || 0,
    atrisk: plans?.filter(p => p.health === 'atrisk' || p.health === 'critical').length || 0,
  };

  const getHealthBadge = (health: PlanHealth) => {
    const styles: Record<PlanHealth, string> = {
      ontrack: 'ph-badge-success',
      atrisk: 'ph-badge-warning',
      critical: 'ph-badge-danger',
    };
    return styles[health];
  };

  const getStatusBadge = (status: PlanStatus) => {
    const styles: Record<PlanStatus, string> = {
      draft: 'ph-badge-gray',
      active: 'ph-badge-primary',
      review: 'ph-badge-warning',
      archived: 'ph-badge-gray',
    };
    return styles[status];
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this plan?')) {
      deletePlan.mutate(id);
    }
  };

  return (
    <>
      {/* Header */}
      <div className="ph-page-header ph-flex ph-items-center ph-justify-between">
        <div>
          <h1 className="ph-page-title">Plan Library</h1>
          <p className="ph-page-subtitle">Manage and track all your project plans</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="ph-btn ph-btn-primary"
        >
          <Plus size={18} />
          New Plan
        </button>
      </div>

      <div className="ph-page-body">
        {/* Stats */}
        <div className="ph-grid ph-grid-cols-4 ph-gap-4 ph-mb-6">
          <div className="ph-stat-card">
            <div className="ph-stat-label">
              <span className="ph-stat-dot" style={{ background: 'var(--ph-primary)' }} />
              Total Plans
            </div>
            <div className="ph-stat-value">{stats.total}</div>
          </div>
          <div className="ph-stat-card">
            <div className="ph-stat-label">
              <span className="ph-stat-dot" style={{ background: 'var(--ph-primary)' }} />
              Active
            </div>
            <div className="ph-stat-value">{stats.active}</div>
          </div>
          <div className="ph-stat-card">
            <div className="ph-stat-label">
              <span className="ph-stat-dot" style={{ background: 'var(--ph-success)' }} />
              On Track
            </div>
            <div className="ph-stat-value">{stats.ontrack}</div>
          </div>
          <div className="ph-stat-card">
            <div className="ph-stat-label">
              <span className="ph-stat-dot" style={{ background: 'var(--ph-danger)' }} />
              At Risk
            </div>
            <div className="ph-stat-value">{stats.atrisk}</div>
          </div>
        </div>

        {/* Filters */}
        <div className="ph-flex ph-gap-4 ph-mb-4">
          <div style={{ position: 'relative', flex: 1, maxWidth: 320 }}>
            <Search size={18} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--ph-gray-400)' }} />
            <input
              type="text"
              placeholder="Search plans..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="ph-form-input"
              style={{ paddingLeft: 36 }}
            />
          </div>
          <select
            value={filters.status || ''}
            onChange={e => setFilters(f => ({ ...f, status: e.target.value as PlanStatus || undefined }))}
            className="ph-select"
          >
            <option value="">All Status</option>
            <option value="draft">Draft</option>
            <option value="active">Active</option>
            <option value="review">Review</option>
            <option value="archived">Archived</option>
          </select>
          <select
            value={filters.health || ''}
            onChange={e => setFilters(f => ({ ...f, health: e.target.value as PlanHealth || undefined }))}
            className="ph-select"
          >
            <option value="">All Health</option>
            <option value="ontrack">On Track</option>
            <option value="atrisk">At Risk</option>
            <option value="critical">Critical</option>
          </select>
        </div>

        {/* Table */}
        <div className="ph-card">
          {isLoading ? (
            <div className="ph-flex ph-items-center ph-justify-center" style={{ padding: 48 }}>
              <div className="ph-spinner"></div>
            </div>
          ) : plans?.length === 0 ? (
            <div className="ph-empty">
              <FolderOpen className="ph-empty-icon" />
              <h2 className="ph-empty-title">No plans found</h2>
              <p className="ph-empty-text">Create your first plan to get started</p>
              <button onClick={() => setShowCreateModal(true)} className="ph-btn ph-btn-primary">
                <Plus size={18} />
                Create Plan
              </button>
            </div>
          ) : (
            <table className="ph-table">
              <thead>
                <tr>
                  <th>Plan</th>
                  <th>Health</th>
                  <th>Status</th>
                  <th>Lead</th>
                  <th>Timeline</th>
                  <th>Confidence</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {plans?.map(plan => (
                  <tr key={plan.id} onClick={() => onPlanSelect(plan.id)}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{plan.name}</div>
                      <div className="ph-text-sm ph-text-gray-500">{plan.code}</div>
                    </td>
                    <td>
                      <span className={`ph-badge ${getHealthBadge(plan.health)}`}>
                        {plan.health === 'ontrack' ? 'On Track' : plan.health === 'atrisk' ? 'At Risk' : 'Critical'}
                      </span>
                    </td>
                    <td>
                      <span className={`ph-badge ${getStatusBadge(plan.status)}`}>
                        {plan.status}
                      </span>
                    </td>
                    <td>
                      {plan.lead ? (
                        <div className="ph-flex ph-items-center ph-gap-2">
                          <div style={{ 
                            width: 28, height: 28, borderRadius: 'var(--ph-radius-full)',
                            background: 'var(--ph-primary-light)', color: 'var(--ph-primary)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 'var(--ph-text-xs)', fontWeight: 600
                          }}>
                            {plan.lead.full_name?.charAt(0) || '?'}
                          </div>
                          {plan.lead.full_name}
                        </div>
                      ) : (
                        <span className="ph-text-gray-500">Unassigned</span>
                      )}
                    </td>
                    <td>
                      {plan.start_date && plan.end_date ? (
                        <>
                          {format(new Date(plan.start_date), 'MMM d')} - {format(new Date(plan.end_date), 'MMM d, yyyy')}
                        </>
                      ) : (
                        <span className="ph-text-gray-500">Not set</span>
                      )}
                    </td>
                    <td>
                      <div className="ph-flex ph-items-center ph-gap-2">
                        <div style={{ width: 48, height: 6, background: 'var(--ph-gray-200)', borderRadius: 'var(--ph-radius-full)', overflow: 'hidden' }}>
                          <div style={{ 
                            width: `${plan.confidence}%`, height: '100%',
                            background: plan.confidence >= 80 ? 'var(--ph-success)' : plan.confidence >= 50 ? 'var(--ph-warning)' : 'var(--ph-danger)',
                            borderRadius: 'var(--ph-radius-full)'
                          }} />
                        </div>
                        {plan.confidence}%
                      </div>
                    </td>
                    <td>
                      <button
                        onClick={(e) => handleDelete(e, plan.id)}
                        className="ph-btn ph-btn-ghost ph-btn-sm"
                        style={{ color: 'var(--ph-gray-400)' }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <CreatePlanModal
          onClose={() => setShowCreateModal(false)}
          onCreated={(planId) => {
            setShowCreateModal(false);
            onPlanSelect(planId);
          }}
        />
      )}
    </>
  );
}
