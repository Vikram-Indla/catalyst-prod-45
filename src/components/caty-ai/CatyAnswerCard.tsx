/**
 * Caty AI V7 — Enterprise Answer Card Renderer
 * Renders structured JSON responses with chips, tables, and action buttons
 */

import React from 'react';
import ReactMarkdown from 'react-markdown';
import {
  CatyStructuredResponse,
  ResourceAnswerResponse,
  GeneralAnswerResponse,
  Risk,
  AllocationItem,
  NextAction,
} from './schema';

// ============ UTILITY FUNCTIONS ============

function getUtilizationColor(status: string): string {
  switch (status) {
    case 'under': return 'var(--caty-warning)';
    case 'on_target': return 'var(--caty-success)';
    case 'over': return 'var(--caty-error)';
    default: return 'var(--caty-text-secondary)';
  }
}

function getUtilizationLabel(status: string): string {
  switch (status) {
    case 'under': return 'Under Target';
    case 'on_target': return 'On Target';
    case 'over': return 'Over Allocated';
    default: return 'Unknown';
  }
}

function getSeverityColor(severity: string): string {
  switch (severity) {
    case 'high': return 'var(--caty-error)';
    case 'medium': return 'var(--caty-warning)';
    case 'low': return 'var(--caty-info)';
    default: return 'var(--caty-text-secondary)';
  }
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  } catch {
    return dateStr;
  }
}

// ============ SUB-COMPONENTS ============

const Chip: React.FC<{ children: React.ReactNode; variant?: 'default' | 'success' | 'warning' | 'error' | 'info' }> = ({ 
  children, 
  variant = 'default' 
}) => {
  const colors: Record<string, string> = {
    default: 'var(--caty-surface-card)',
    success: 'rgba(34, 197, 94, 0.15)',
    warning: 'rgba(234, 179, 8, 0.15)',
    error: 'rgba(239, 68, 68, 0.15)',
    info: 'rgba(59, 130, 246, 0.15)',
  };
  
  const textColors: Record<string, string> = {
    default: 'var(--caty-text-primary)',
    success: 'var(--ds-text-success, var(--ds-text-success, #22c55e))',
    warning: '#eab308',
    error: 'var(--ds-text-danger, var(--ds-text-danger, #ef4444))',
    info: 'var(--ds-text-brand, var(--ds-text-brand, #3b82f6))',
  };

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '4px 10px',
        borderRadius: '16px',
        fontSize: '12px',
        fontWeight: 500,
        background: colors[variant],
        color: textColors[variant],
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </span>
  );
};

const SectionHeader: React.FC<{ title: string; icon?: React.ReactNode }> = ({ title, icon }) => (
  <div style={{ 
    display: 'flex', 
    alignItems: 'center', 
    gap: '8px', 
    marginBottom: '12px',
    paddingBottom: '8px',
    borderBottom: '1px solid var(--caty-border-subtle)'
  }}>
    {icon}
    <h4 style={{ 
      margin: 0, 
      fontSize: '14px', 
      fontWeight: 600, 
      color: 'var(--caty-text-primary)' 
    }}>
      {title}
    </h4>
  </div>
);

const ActionButton: React.FC<{ action: NextAction; onAction?: (action: NextAction) => void }> = ({ 
  action, 
  onAction 
}) => (
  <button
    className="caty-btn secondary"
    onClick={() => onAction?.(action)}
    style={{ fontSize: '12px', padding: '6px 12px' }}
  >
    {action.label}
  </button>
);

// ============ RESOURCE ANSWER RENDERER ============

const ResourceAnswerCard: React.FC<{ 
  response: ResourceAnswerResponse; 
  onAction?: (action: NextAction) => void 
}> = ({ response, onAction }) => {
  const { resource, utilization, allocations_summary, risks, next_best_actions, data_quality, time_range } = response;

  const utilizationVariant = utilization.status === 'on_target' ? 'success' 
    : utilization.status === 'over' ? 'error' 
    : utilization.status === 'under' ? 'warning' 
    : 'default';

  const siteVariant = resource.site_status.value === 'on_site' ? 'success' : 
    resource.site_status.value === 'off_shore' ? 'info' : 'default';

  return (
    <div className="caty-answer-card">
      {/* Title */}
      <h3 style={{ 
        margin: '0 0 16px 0', 
        fontSize: '16px', 
        fontWeight: 600,
        color: 'var(--caty-text-primary)'
      }}>
        {response.title}
      </h3>

      {/* Time Range Badge */}
      {time_range?.label && (
        <div style={{ marginBottom: '12px' }}>
          <Chip variant="info">{time_range.label}</Chip>
        </div>
      )}

      {/* Resource Summary Chips */}
      <div style={{ 
        display: 'flex', 
        flexWrap: 'wrap', 
        gap: '8px', 
        marginBottom: '20px',
        padding: '12px',
        background: 'var(--caty-surface-card)',
        borderRadius: '8px'
      }}>
        <Chip>{resource.display_name}</Chip>
        {resource.department.name && (
          <Chip variant="default">{resource.department.name}</Chip>
        )}
        <Chip variant={utilizationVariant}>
          {utilization.current_percent !== null ? `${utilization.current_percent}%` : '—'} • {getUtilizationLabel(utilization.status)}
        </Chip>
        <Chip variant={siteVariant}>
          {resource.site_status.value === 'on_site' ? '🏢 On-Site' : 
           resource.site_status.value === 'off_shore' ? '🌐 Off-Shore' : '❓ Unknown'}
        </Chip>
        {resource.vendor.name && (
          <Chip variant="default">📋 {resource.vendor.name}</Chip>
        )}
      </div>

      {/* Utilization Section */}
      <div style={{ marginBottom: '20px' }}>
        <SectionHeader 
          title="Utilization" 
          icon={<span style={{ fontSize: '16px' }}>📊</span>} 
        />
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(3, 1fr)', 
          gap: '12px',
          padding: '12px',
          background: 'var(--caty-surface-card)',
          borderRadius: '8px'
        }}>
          <div>
            <div style={{ fontSize: '24px', fontWeight: 700, color: getUtilizationColor(utilization.status) }}>
              {utilization.current_percent !== null ? `${utilization.current_percent}%` : '—'}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--caty-text-secondary)' }}>Current</div>
          </div>
          <div>
            <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--caty-text-primary)' }}>
              {utilization.target_percent}%
            </div>
            <div style={{ fontSize: '12px', color: 'var(--caty-text-secondary)' }}>Target</div>
          </div>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 600, color: getUtilizationColor(utilization.status) }}>
              {getUtilizationLabel(utilization.status)}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--caty-text-secondary)' }}>Status</div>
          </div>
        </div>
        {utilization.calc_notes && (
          <div style={{ 
            marginTop: '8px', 
            fontSize: '11px', 
            color: 'var(--caty-text-tertiary)',
            fontStyle: 'italic'
          }}>
            {utilization.calc_notes}
          </div>
        )}
      </div>

      {/* Allocations Section */}
      <div style={{ marginBottom: '20px' }}>
        <SectionHeader 
          title="Allocations" 
          icon={<span style={{ fontSize: '16px' }}>📁</span>} 
        />
        {allocations_summary.top_allocations.length > 0 ? (
          <div style={{ 
            background: 'var(--caty-surface-card)',
            borderRadius: '8px',
            overflow: 'hidden'
          }}>
            <table style={{ 
              width: '100%', 
              borderCollapse: 'collapse',
              fontSize: '13px'
            }}>
              <thead>
                <tr style={{ background: 'var(--caty-surface-page)' }}>
                  <th style={{ textAlign: 'left', padding: '10px 12px', fontWeight: 600 }}>Project</th>
                  <th style={{ textAlign: 'right', padding: '10px 12px', fontWeight: 600 }}>Allocation</th>
                  <th style={{ textAlign: 'right', padding: '10px 12px', fontWeight: 600 }}>From</th>
                  <th style={{ textAlign: 'right', padding: '10px 12px', fontWeight: 600 }}>To</th>
                </tr>
              </thead>
              <tbody>
                {allocations_summary.top_allocations.map((alloc, idx) => (
                  <tr key={idx} style={{ borderTop: '1px solid var(--caty-border-subtle)' }}>
                    <td style={{ padding: '10px 12px', color: 'var(--caty-text-primary)' }}>
                      {alloc.project_name || 'Unknown Project'}
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600 }}>
                      {alloc.allocation_percent !== null ? `${alloc.allocation_percent}%` : '—'}
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', color: 'var(--caty-text-secondary)' }}>
                      {formatDate(alloc.from)}
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', color: 'var(--caty-text-secondary)' }}>
                      {formatDate(alloc.to)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {allocations_summary.active_projects_count !== null && allocations_summary.active_projects_count > 3 && (
              <div style={{ 
                padding: '8px 12px', 
                fontSize: '12px', 
                color: 'var(--caty-text-secondary)',
                borderTop: '1px solid var(--caty-border-subtle)'
              }}>
                +{allocations_summary.active_projects_count - 3} more projects
              </div>
            )}
          </div>
        ) : (
          <div style={{ 
            padding: '16px', 
            textAlign: 'center', 
            color: 'var(--caty-text-secondary)',
            background: 'var(--caty-surface-card)',
            borderRadius: '8px'
          }}>
            No active allocations found.
          </div>
        )}
      </div>

      {/* Risks Section */}
      {risks.length > 0 && (
        <div style={{ marginBottom: '20px' }}>
          <SectionHeader 
            title="Risks / Alerts" 
            icon={<span style={{ fontSize: '16px' }}>⚠️</span>} 
          />
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '8px',
            padding: '12px',
            background: 'var(--caty-surface-card)',
            borderRadius: '8px'
          }}>
            {risks.map((risk, idx) => (
              <div 
                key={idx}
                style={{ 
                  display: 'flex', 
                  alignItems: 'flex-start', 
                  gap: '10px',
                  padding: '8px',
                  borderRadius: '6px',
                  background: 'var(--caty-surface-page)'
                }}
              >
                <span style={{ 
                  width: '8px', 
                  height: '8px', 
                  borderRadius: '50%', 
                  background: getSeverityColor(risk.severity),
                  marginTop: '6px',
                  flexShrink: 0
                }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--caty-text-primary)' }}>
                    {risk.title}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--caty-text-secondary)', marginTop: '2px' }}>
                    {risk.detail}
                  </div>
                  {risk.action && (
                    <div style={{ fontSize: '11px', color: 'var(--caty-accent)', marginTop: '4px' }}>
                      💡 {risk.action}
                    </div>
                  )}
                </div>
                <Chip variant={risk.severity === 'high' ? 'error' : risk.severity === 'medium' ? 'warning' : 'info'}>
                  {risk.severity.toUpperCase()}
                </Chip>
              </div>
            ))}
          </div>
        </div>
      )}

      {risks.length === 0 && (
        <div style={{ 
          marginBottom: '20px',
          padding: '12px',
          background: 'rgba(34, 197, 94, 0.1)',
          borderRadius: '8px',
          fontSize: '13px',
          color: 'var(--ds-text-success, var(--ds-text-success, #22c55e))',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          ✅ No risks detected from current tables.
        </div>
      )}

      {/* Next Actions - REMOVED: User wants straight answers only, no suggestions */}

      {/* Data Quality Footer */}
      {data_quality && (
        <div style={{ 
          marginTop: '16px',
          paddingTop: '12px',
          borderTop: '1px solid var(--caty-border-subtle)',
          fontSize: '11px',
          color: 'var(--caty-text-tertiary)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span>
            Data: {data_quality.freshness} • Confidence: {data_quality.confidence}
          </span>
          {data_quality.missing_fields.length > 0 && (
            <span style={{ color: 'var(--caty-warning)' }}>
              ⚠️ Missing: {data_quality.missing_fields.join(', ')}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

// ============ GENERAL ANSWER RENDERER ============

const GeneralAnswerCard: React.FC<{ 
  response: GeneralAnswerResponse; 
  onAction?: (action: NextAction) => void 
}> = ({ response, onAction }) => {
  return (
    <div className="caty-answer-card">
      {/* Title */}
      <h3 style={{ 
        margin: '0 0 16px 0', 
        fontSize: '16px', 
        fontWeight: 600,
        color: 'var(--caty-text-primary)'
      }}>
        {response.title}
      </h3>

      {/* Markdown Content */}
      <div className="caty-markdown-content" style={{ marginBottom: '16px' }}>
        <ReactMarkdown>{response.content_markdown}</ReactMarkdown>
      </div>

      {/* Next Actions - REMOVED: User wants straight answers only, no suggestions */}

      {/* Data Quality Footer */}
      {response.data_quality && (
        <div style={{ 
          marginTop: '16px',
          paddingTop: '12px',
          borderTop: '1px solid var(--caty-border-subtle)',
          fontSize: '11px',
          color: 'var(--caty-text-tertiary)'
        }}>
          Data: {response.data_quality.freshness} • Confidence: {response.data_quality.confidence}
        </div>
      )}
    </div>
  );
};

// ============ MAIN EXPORT ============

interface CatyAnswerCardProps {
  response: CatyStructuredResponse;
  onAction?: (action: NextAction) => void;
}

export const CatyAnswerCard: React.FC<CatyAnswerCardProps> = ({ response, onAction }) => {
  if (response.response_type === 'resource_answer') {
    return <ResourceAnswerCard response={response} onAction={onAction} />;
  }
  
  return <GeneralAnswerCard response={response} onAction={onAction} />;
};

export default CatyAnswerCard;
