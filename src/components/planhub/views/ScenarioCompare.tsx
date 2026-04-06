import React, { useState } from 'react';
import { GitCompare, Check, Plus, Layers } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface PlanVersion {
  id: string;
  plan_id: string;
  tag: string;
  notes: string | null;
  is_baseline: boolean;
  snapshot: {
    total_tasks?: number;
    progress?: number;
    budget?: number;
    milestones?: number;
  } | null;
  created_at: string;
  plan?: {
    name: string;
    code: string;
  };
}

export default function ScenarioCompare() {
  const [selectedVersions, setSelectedVersions] = useState<string[]>([]);

  const { data: versions = [], isLoading } = useQuery({
    queryKey: ['planhub-versions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('planhub_versions')
        .select('*, plan:planhub_plans(name, code)')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return (data || []) as PlanVersion[];
    }
  });

  const toggleVersion = (versionId: string) => {
    setSelectedVersions(prev => 
      prev.includes(versionId) 
        ? prev.filter(id => id !== versionId)
        : prev.length < 3 
          ? [...prev, versionId]
          : prev
    );
  };

  const selectedData = versions.filter(v => selectedVersions.includes(v.id));

  const formatCurrency = (val: number | undefined) => 
    val ? `$${(val / 1000000).toFixed(2)}M` : '-';

  if (isLoading) {
    return (
      <div className="ph-page-body">
        <div className="ph-flex ph-items-center ph-justify-center" style={{ minHeight: '400px' }}>
          <div className="ph-spinner" />
        </div>
      </div>
    );
  }

  if (versions.length === 0) {
    return (
      <div className="ph-page-body">
        <div className="ph-empty">
          <GitCompare className="ph-empty-icon" />
          <h2 className="ph-empty-title">No Scenarios Available</h2>
          <p className="ph-empty-text">Create plan versions to compare different scenarios</p>
        </div>
      </div>
    );
  }

  return (
    <div className="ph-page-body">
      {/* Header */}
      <div className="ph-page-header">
        <div>
          <h1 className="ph-page-title">Scenario Compare</h1>
          <p className="ph-page-subtitle">Compare plan versions side by side (select up to 3)</p>
        </div>
      </div>

      <div className="ph-grid" style={{ gridTemplateColumns: '320px 1fr', gap: 'var(--ph-space-6)' }}>
        {/* Version List */}
        <div className="ph-card">
          <div className="ph-card-header">
            <h3 className="ph-card-title">
              <Layers size={16} />
              Available Versions
            </h3>
            <span className="ph-badge">{versions.length}</span>
          </div>
          <div className="ph-card-body" style={{ padding: 0 }}>
            <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
              {versions.map(version => (
                <button
                  key={version.id}
                  onClick={() => toggleVersion(version.id)}
                  className={`ph-list-item ${selectedVersions.includes(version.id) ? 'active' : ''}`}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: 'var(--ph-space-3) var(--ph-space-4)',
                    borderBottom: '1px solid var(--ph-border)',
                    background: selectedVersions.includes(version.id) ? 'var(--ph-primary-bg)' : 'transparent',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 'var(--ph-space-3)'
                  }}
                >
                  <div 
                    style={{ 
                      width: '20px', 
                      height: '20px', 
                      borderRadius: '4px',
                      border: selectedVersions.includes(version.id) 
                        ? '2px solid var(--ph-primary)' 
                        : '2px solid var(--ph-border)',
                      background: selectedVersions.includes(version.id) ? 'var(--ph-primary)' : 'transparent',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      marginTop: '2px'
                    }}
                  >
                    {selectedVersions.includes(version.id) && (
                      <Check size={14} style={{ color: 'white' }} />
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ 
                      fontWeight: 500, 
                      fontSize: '13px',
                      color: 'var(--ph-text)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 'var(--ph-space-2)'
                    }}>
                      {version.tag}
                      {version.is_baseline && (
                        <span className="ph-badge ph-badge-blue" style={{ fontSize: '10px' }}>Baseline</span>
                      )}
                    </div>
                    <div style={{ 
                      fontSize: '12px', 
                      color: 'var(--ph-text-muted)',
                      marginTop: '2px'
                    }}>
                      {version.plan?.name || 'Unknown Plan'}
                    </div>
                    <div style={{ 
                      fontSize: '11px', 
                      color: 'var(--ph-text-muted)',
                      marginTop: '4px'
                    }}>
                      {new Date(version.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Comparison View */}
        <div>
          {selectedData.length === 0 ? (
            <div className="ph-card">
              <div className="ph-empty" style={{ padding: 'var(--ph-space-10)' }}>
                <GitCompare size={48} style={{ color: 'var(--ph-text-muted)', marginBottom: 'var(--ph-space-4)' }} />
                <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: 'var(--ph-space-2)' }}>
                  Select Versions to Compare
                </h3>
                <p style={{ fontSize: '13px', color: 'var(--ph-text-muted)' }}>
                  Choose up to 3 versions from the list to see a side-by-side comparison
                </p>
              </div>
            </div>
          ) : (
            <div className="ph-card">
              <div className="ph-card-header">
                <h3 className="ph-card-title">
                  <GitCompare size={16} />
                  Comparison ({selectedData.length} selected)
                </h3>
              </div>
              <div className="ph-card-body" style={{ padding: 0 }}>
                <table className="ph-table" style={{ width: '100%' }}>
                  <thead>
                    <tr>
                      <th style={{ width: '180px' }}>Metric</th>
                      {selectedData.map(v => (
                        <th key={v.id} style={{ textAlign: 'center' }}>
                          <div>{v.tag}</div>
                          <div style={{ fontSize: '11px', fontWeight: 400, color: 'var(--ph-text-muted)' }}>
                            {v.plan?.code}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={{ fontWeight: 500 }}>Plan Name</td>
                      {selectedData.map(v => (
                        <td key={v.id} style={{ textAlign: 'center' }}>{v.plan?.name || '-'}</td>
                      ))}
                    </tr>
                    <tr>
                      <td style={{ fontWeight: 500 }}>Total Tasks</td>
                      {selectedData.map(v => (
                        <td key={v.id} style={{ textAlign: 'center' }}>
                          {v.snapshot?.total_tasks ?? '-'}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td style={{ fontWeight: 500 }}>Progress</td>
                      {selectedData.map(v => (
                        <td key={v.id} style={{ textAlign: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                            <div style={{ 
                              width: '60px', 
                              height: '6px', 
                              background: 'var(--ph-bg-subtle)', 
                              borderRadius: '4px',
                              overflow: 'hidden'
                            }}>
                              <div style={{ 
                                width: `${v.snapshot?.progress || 0}%`, 
                                height: '100%', 
                                background: 'var(--ph-primary)',
                                borderRadius: '4px'
                              }} />
                            </div>
                            <span>{v.snapshot?.progress ?? 0}%</span>
                          </div>
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td style={{ fontWeight: 500 }}>Budget</td>
                      {selectedData.map(v => (
                        <td key={v.id} style={{ textAlign: 'center' }}>
                          {formatCurrency(v.snapshot?.budget)}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td style={{ fontWeight: 500 }}>Milestones</td>
                      {selectedData.map(v => (
                        <td key={v.id} style={{ textAlign: 'center' }}>
                          {v.snapshot?.milestones ?? '-'}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td style={{ fontWeight: 500 }}>Baseline</td>
                      {selectedData.map(v => (
                        <td key={v.id} style={{ textAlign: 'center' }}>
                          {v.is_baseline ? (
                            <span className="ph-badge ph-badge-blue">Yes</span>
                          ) : (
                            <span style={{ color: 'var(--ph-text-muted)' }}>No</span>
                          )}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td style={{ fontWeight: 500 }}>Created</td>
                      {selectedData.map(v => (
                        <td key={v.id} style={{ textAlign: 'center', fontSize: '12px' }}>
                          {new Date(v.created_at).toLocaleDateString()}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td style={{ fontWeight: 500 }}>Notes</td>
                      {selectedData.map(v => (
                        <td key={v.id} style={{ textAlign: 'center', fontSize: '12px' }}>
                          {v.notes || '-'}
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Budget Comparison Chart */}
          {selectedData.length >= 2 && (
            <div className="ph-card" style={{ marginTop: 'var(--ph-space-4)' }}>
              <div className="ph-card-header">
                <h3 className="ph-card-title">Budget Comparison</h3>
              </div>
              <div className="ph-card-body">
                <div style={{ display: 'flex', gap: 'var(--ph-space-4)', alignItems: 'flex-end', height: '200px' }}>
                  {selectedData.map((v, i) => {
                    const maxBudget = Math.max(...selectedData.map(d => d.snapshot?.budget || 0));
                    const height = maxBudget > 0 ? ((v.snapshot?.budget || 0) / maxBudget) * 180 : 0;
                    const colors = ['var(--ph-primary)', 'var(--ph-warning)', 'var(--ph-success)'];
                    return (
                      <div key={v.id} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <div 
                          style={{ 
                            width: '60px', 
                            height: `${height}px`, 
                            background: colors[i % colors.length],
                            borderRadius: '4px 4px 0 0',
                            transition: 'height 0.3s ease'
                          }} 
                        />
                        <div style={{ 
                          marginTop: 'var(--ph-space-2)', 
                          fontSize: '11px', 
                          fontWeight: 500,
                          textAlign: 'center'
                        }}>
                          {formatCurrency(v.snapshot?.budget)}
                        </div>
                        <div style={{ 
                          fontSize: '10px', 
                          color: 'var(--ph-text-muted)',
                          textAlign: 'center',
                          maxWidth: '80px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>
                          {v.tag}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
