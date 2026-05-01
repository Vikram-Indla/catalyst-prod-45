/**
 * CATY AI Viewport — High-Density Enterprise Tiles (Jira-style)
 * Dense metric tiles with progress indicators and compact typography
 */

import React from 'react';
import DOMPurify from 'dompurify';
import { AlertTriangle, Clock, Users, TrendingUp, ChevronRight, Zap } from 'lucide-react';
import { useCatyViewportData } from '@/hooks/useCatyViewportData';
import type { ProbingQuestion, ViewportSection as ViewportSectionType } from '@/types/caty-viewport';

interface CatyViewportProps {
  selectedDepartmentId: string | null;
  onQuestionClick: (question: ProbingQuestion) => void;
  onTileClick?: (tileType: 'expiring' | 'overallocated' | 'unallocated') => void;
}

export function CatyViewport({ selectedDepartmentId, onQuestionClick, onTileClick }: CatyViewportProps) {
  const { data: viewportData, isLoading } = useCatyViewportData(selectedDepartmentId);

  if (isLoading) {
    return <ViewportSkeleton />;
  }

  if (!viewportData) {
    return null;
  }

  const hasIssues = viewportData.sections.length > 0;

  const handleTileClick = (tileType: 'expiring' | 'overallocated' | 'unallocated') => {
    if (onTileClick) {
      onTileClick(tileType);
    }
  };

  return (
    <div style={styles.viewport}>
      {/* Metrics Dashboard - High Density Grid */}
      <div style={styles.metricsGrid}>
        <MetricTile 
          icon={Users}
          value={viewportData.stats.totalResources}
          label="Total Resources"
          variant="neutral"
          isClickable={false}
        />
        <MetricTile 
          icon={Clock}
          value={viewportData.stats.expiringContracts}
          label="Expiring Soon"
          variant={viewportData.stats.expiringContracts > 0 ? 'danger' : 'neutral'}
          showProgress={viewportData.stats.expiringContracts > 0}
          progressPercent={Math.min((viewportData.stats.expiringContracts / viewportData.stats.totalResources) * 100, 100)}
          isClickable={true}
          onClick={() => handleTileClick('expiring')}
        />
        <MetricTile 
          icon={AlertTriangle}
          value={viewportData.stats.overAllocated}
          label="Over 100%"
          variant={viewportData.stats.overAllocated > 0 ? 'warning' : 'neutral'}
          showProgress={viewportData.stats.overAllocated > 0}
          progressPercent={Math.min((viewportData.stats.overAllocated / viewportData.stats.totalResources) * 100, 100)}
          isClickable={true}
          onClick={() => handleTileClick('overallocated')}
        />
        <MetricTile 
          icon={TrendingUp}
          value={viewportData.stats.zeroUtilization}
          label="Unallocated"
          variant={viewportData.stats.zeroUtilization > 0 ? 'info' : 'neutral'}
          showProgress={viewportData.stats.zeroUtilization > 0}
          progressPercent={Math.min((viewportData.stats.zeroUtilization / viewportData.stats.totalResources) * 100, 100)}
          isClickable={true}
          onClick={() => handleTileClick('unallocated')}
        />
      </div>

      {/* Issue Tiles */}
      {hasIssues && (
        <div style={styles.issuesContainer}>
          <div style={styles.issuesHeader}>
            <Zap size={14} style={{ color: 'var(--ds-text-warning, #f59e0b)' }} />
            <span style={styles.issuesTitle}>ACTION ITEMS</span>
            <span style={styles.issuesBadge}>{viewportData.sections.reduce((acc, s) => acc + s.totalCount, 0)}</span>
          </div>
          
          {viewportData.sections.map((section) => (
            <IssueSection 
              key={section.id} 
              section={section} 
              onQuestionClick={onQuestionClick}
            />
          ))}
        </div>
      )}

      {/* All Clear State */}
      {!hasIssues && (
        <div style={styles.allClear}>
          <div style={styles.allClearIcon}>✓</div>
          <div style={styles.allClearText}>All systems nominal</div>
          <div style={styles.allClearSubtext}>No action items detected</div>
        </div>
      )}
    </div>
  );
}

// ============================================
// METRIC TILE
// ============================================

interface MetricTileProps {
  icon: React.ElementType;
  value: number;
  label: string;
  variant: 'neutral' | 'danger' | 'warning' | 'info';
  showProgress?: boolean;
  progressPercent?: number;
  onClick?: () => void;
  isClickable?: boolean;
}

const variantColors = {
  neutral: { bg: 'var(--ds-surface-sunken, #f8fafc)', border: 'var(--ds-border, #e2e8f0)', text: 'var(--ds-text-subtle, #475569)', accent: 'var(--ds-text-subtlest, #64748b)' },
  danger: { bg: 'var(--ds-background-danger, #fef2f2)', border: '#fecaca', text: 'var(--ds-text-danger, #dc2626)', accent: 'var(--ds-text-danger, #dc2626)' },
  warning: { bg: '#fffbeb', border: '#fde68a', text: 'var(--ds-text-warning, #d97706)', accent: 'var(--ds-text-warning, #f59e0b)' },
  info: { bg: 'var(--ds-background-selected, #eff6ff)', border: '#bfdbfe', text: 'var(--ds-text-brand, #2563eb)', accent: 'var(--ds-text-brand, #3b82f6)' },
};

function MetricTile({ icon: Icon, value, label, variant, showProgress, progressPercent = 0, onClick, isClickable = false }: MetricTileProps) {
  const colors = variantColors[variant];
  
  const tileStyle: React.CSSProperties = {
    ...styles.metricTile,
    background: colors.bg,
    borderColor: colors.border,
    ...(isClickable && {
      cursor: 'pointer',
      transition: 'all 0.2s ease',
    }),
  };
  
  const handleClick = () => {
    if (isClickable && onClick) {
      onClick();
    }
  };

  const handleMouseEnter = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isClickable) {
      e.currentTarget.style.transform = 'translateY(-2px)';
      e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
    }
  };

  const handleMouseLeave = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isClickable) {
      e.currentTarget.style.transform = 'translateY(0)';
      e.currentTarget.style.boxShadow = 'none';
    }
  };
  
  return (
    <div 
      style={tileStyle}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onKeyDown={isClickable ? (e) => e.key === 'Enter' && handleClick() : undefined}
      aria-label={isClickable ? `${label}: ${value}. Click to view details.` : undefined}
    >
      <div style={styles.metricHeader}>
        <Icon size={14} style={{ color: colors.accent, flexShrink: 0 }} />
        <span style={{ ...styles.metricLabel, color: 'var(--fg-3)' }}>{label}</span>
      </div>
      <div style={{ ...styles.metricValue, color: colors.text }}>
        {value}
      </div>
      {showProgress && progressPercent > 0 && (
        <div style={styles.progressTrack}>
          <div style={{
            ...styles.progressBar,
            width: `${Math.min(progressPercent, 100)}%`,
            background: colors.accent,
          }} />
        </div>
      )}
    </div>
  );
}

// ============================================
// ISSUE SECTION
// ============================================

interface IssueSectionProps {
  section: ViewportSectionType;
  onQuestionClick: (question: ProbingQuestion) => void;
}

function IssueSection({ section, onQuestionClick }: IssueSectionProps) {
  const sectionColors = {
    danger: 'var(--ds-text-danger, #dc2626)',
    warning: 'var(--ds-text-warning, #f59e0b)',
    info: 'var(--ds-text-brand, #3b82f6)',
    critical: 'var(--ds-text-danger, #dc2626)',
  };
  
  const accentColor = sectionColors[section.severity as keyof typeof sectionColors] || 'var(--ds-text-subtlest, #64748b)';

  return (
    <div style={styles.issueSection}>
      <div style={styles.issueSectionHeader}>
        <div style={{ ...styles.sectionDot, background: accentColor }} />
        <span style={styles.sectionName}>{section.title}</span>
        <span style={styles.sectionCount}>{section.totalCount}</span>
      </div>
      <div style={styles.issueList}>
        {section.questions.map((question) => (
          <IssueTile 
            key={question.id} 
            question={question}
            accentColor={accentColor}
            onClick={() => onQuestionClick(question)}
          />
        ))}
      </div>
    </div>
  );
}

// ============================================
// ISSUE TILE (High-Density Card)
// ============================================

interface IssueTileProps {
  question: ProbingQuestion;
  accentColor: string;
  onClick: () => void;
}

function IssueTile({ question, accentColor, onClick }: IssueTileProps) {
  return (
    <button
      onClick={onClick}
      style={styles.issueTile}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'var(--ds-surface-sunken, #f8fafc)';
        e.currentTarget.style.borderColor = 'var(--ds-text-disabled, #cbd5e1)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'var(--ds-surface, #ffffff)';
        e.currentTarget.style.borderColor = 'var(--ds-border, #e2e8f0)';
      }}
    >
      {/* Left Accent Bar */}
      <div style={{ ...styles.tileAccent, background: accentColor }} />
      
      {/* Content */}
      <div style={styles.tileContent}>
        <div 
          style={styles.tileText}
          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(question.text) }}
        />
        
        {/* Tags Row */}
        {question.tags.length > 0 && (
          <div style={styles.tagRow}>
            {question.tags.map((tag, idx) => (
              <span key={idx} style={{
                ...styles.tag,
                ...getTagStyle(tag.type),
              }}>
                {tag.label}
              </span>
            ))}
          </div>
        )}
      </div>
      
      {/* Chevron */}
      <ChevronRight size={16} style={{ color: 'var(--fg-4)', flexShrink: 0 }} />
    </button>
  );
}

function getTagStyle(type: string): React.CSSProperties {
  switch (type) {
    case 'vendor':
      return { background: '#f0fdfa', color: '#0d9488', borderColor: '#99f6e4' };
    case 'date':
      return { background: 'var(--bg-app, #fff)', color: 'var(--ds-text-danger, #dc2626)', borderColor: '#fecaca' };
    case 'project':
      return { background: '#faf5ff', color: '#7c3aed', borderColor: '#e9d5ff' };
    case 'count':
    default:
      return { background: 'var(--ds-surface-sunken, #f1f5f9)', color: 'var(--ds-text-subtle, #475569)', borderColor: 'var(--ds-border, #e2e8f0)' };
  }
}

// ============================================
// LOADING SKELETON
// ============================================

function ViewportSkeleton() {
  return (
    <div style={styles.viewport}>
      <div style={styles.metricsGrid}>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} style={{ ...styles.metricTile, background: 'var(--bg-1)', borderColor: 'var(--divider)' }}>
            <div style={{ height: 14, width: '60%', background: 'var(--divider)', borderRadius: 4, marginBottom: 8 }} />
            <div style={{ height: 28, width: '40%', background: 'var(--divider)', borderRadius: 4 }} />
          </div>
        ))}
      </div>
      <div style={styles.issuesContainer}>
        <div style={{ height: 16, width: '30%', background: 'var(--divider)', borderRadius: 4, marginBottom: 16 }} />
        {[1, 2].map((i) => (
          <div key={i} style={{ height: 60, background: 'var(--bg-1)', borderRadius: 8, marginBottom: 8, border: '1px solid var(--divider)' }} />
        ))}
      </div>
    </div>
  );
}

// ============================================
// STYLES
// ============================================

const styles: Record<string, React.CSSProperties> = {
  viewport: {
    padding: 16,
    fontFamily: 'var(--cp-font-body)',
  },
  
  // Metrics Grid
  metricsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: 10,
    marginBottom: 20,
  },
  metricTile: {
    padding: '12px 14px',
    borderRadius: 12,
    border: '1px solid',
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    minHeight: 72,
  },
  metricHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: 600,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    whiteSpace: 'nowrap' as const,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  metricValue: {
    fontFamily: 'var(--cp-font-mono)',
    fontSize: 26,
    fontWeight: 700,
    lineHeight: 1,
  },
  progressTrack: {
    height: 3,
    background: 'rgba(0, 0, 0, 0.08)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 4,
    transition: 'width 0.3s ease',
  },
  
  // Issues Container
  issuesContainer: {
    background: 'var(--ds-surface, #ffffff)',
    borderRadius: 12,
    border: '1px solid #e2e8f0',
    padding: 16,
  },
  issuesHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
    paddingBottom: 10,
    borderBottom: '1px solid #f1f5f9',
  },
  issuesTitle: {
    fontSize: 13,
    fontWeight: 700,
    color: 'var(--ds-text-subtle, #334155)',
    letterSpacing: '0.08em',
  },
  issuesBadge: {
    marginLeft: 'auto',
    fontSize: 13,
    fontWeight: 600,
    color: 'var(--ds-text-subtle, #475569)',
    background: 'var(--ds-surface-sunken, #f1f5f9)',
    padding: '4px 10px',
    borderRadius: 12,
  },
  
  // Issue Section
  issueSection: {
    marginBottom: 16,
  },
  issueSectionHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  sectionDot: {
    width: 8,
    height: 8,
    borderRadius: '50%',
    flexShrink: 0,
  },
  sectionName: {
    fontSize: 15,
    fontWeight: 600,
    color: '#1e293b',
  },
  sectionCount: {
    fontSize: 13,
    fontWeight: 500,
    color: 'var(--ds-text-subtlest, #64748b)',
    marginLeft: 'auto',
  },
  issueList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  
  // Issue Tile
  issueTile: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '10px 12px',
    background: 'var(--ds-surface, #ffffff)',
    border: '1px solid #e2e8f0',
    borderRadius: 8,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    textAlign: 'left' as const,
    width: '100%',
  },
  tileAccent: {
    width: 3,
    height: 32,
    borderRadius: 4,
    flexShrink: 0,
  },
  tileContent: {
    flex: 1,
    minWidth: 0,
  },
  tileText: {
    fontSize: 14,
    fontWeight: 500,
    color: '#1e293b',
    lineHeight: 1.5,
    marginBottom: 6,
  },
  tagRow: {
    display: 'flex',
    alignItems: 'center',
    flexWrap: 'wrap' as const,
    gap: 8,
  },
  tag: {
    fontSize: 12,
    fontWeight: 500,
    padding: '4px 10px',
    borderRadius: 6,
    border: '1px solid',
    whiteSpace: 'nowrap' as const,
  },
  
  // All Clear State
  allClear: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '32px 16px',
    background: '#f0fdf4',
    borderRadius: 12,
    border: '1px solid #bbf7d0',
  },
  allClearIcon: {
    width: 40,
    height: 40,
    borderRadius: '50%',
    background: 'var(--ds-text-success, #22c55e)',
    color: 'var(--ds-surface, #ffffff)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 20,
    fontWeight: 700,
    marginBottom: 12,
  },
  allClearText: {
    fontSize: 14,
    fontWeight: 600,
    color: '#166534',
    marginBottom: 4,
  },
  allClearSubtext: {
    fontSize: 12,
    color: 'var(--ds-text-success, #16a34a)',
  },
};
