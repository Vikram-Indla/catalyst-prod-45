/**
 * CATY AI Viewport — High-Density Enterprise Tiles (Jira-style)
 * Dense metric tiles with progress indicators and compact typography
 */

import React from 'react';
import { AlertTriangle, Clock, Users, TrendingUp, ChevronRight, Zap } from 'lucide-react';
import { useCatyViewportData } from '@/hooks/useCatyViewportData';
import type { ProbingQuestion, ViewportSection as ViewportSectionType } from '@/types/caty-viewport';

interface CatyViewportProps {
  selectedDepartmentId: string | null;
  onQuestionClick: (question: ProbingQuestion) => void;
}

export function CatyViewport({ selectedDepartmentId, onQuestionClick }: CatyViewportProps) {
  const { data: viewportData, isLoading } = useCatyViewportData(selectedDepartmentId);

  if (isLoading) {
    return <ViewportSkeleton />;
  }

  if (!viewportData) {
    return null;
  }

  const hasIssues = viewportData.sections.length > 0;

  return (
    <div style={styles.viewport}>
      {/* Metrics Dashboard - High Density Grid */}
      <div style={styles.metricsGrid}>
        <MetricTile 
          icon={Users}
          value={viewportData.stats.totalResources}
          label="Total Resources"
          variant="neutral"
        />
        <MetricTile 
          icon={Clock}
          value={viewportData.stats.expiringContracts}
          label="Expiring Soon"
          variant={viewportData.stats.expiringContracts > 0 ? 'danger' : 'neutral'}
          showProgress={viewportData.stats.expiringContracts > 0}
          progressPercent={Math.min((viewportData.stats.expiringContracts / viewportData.stats.totalResources) * 100, 100)}
        />
        <MetricTile 
          icon={AlertTriangle}
          value={viewportData.stats.overAllocated}
          label="Over 100%"
          variant={viewportData.stats.overAllocated > 0 ? 'warning' : 'neutral'}
          showProgress={viewportData.stats.overAllocated > 0}
          progressPercent={Math.min((viewportData.stats.overAllocated / viewportData.stats.totalResources) * 100, 100)}
        />
        <MetricTile 
          icon={TrendingUp}
          value={viewportData.stats.zeroUtilization}
          label="Unallocated"
          variant={viewportData.stats.zeroUtilization > 0 ? 'info' : 'neutral'}
          showProgress={viewportData.stats.zeroUtilization > 0}
          progressPercent={Math.min((viewportData.stats.zeroUtilization / viewportData.stats.totalResources) * 100, 100)}
        />
      </div>

      {/* Issue Tiles */}
      {hasIssues && (
        <div style={styles.issuesContainer}>
          <div style={styles.issuesHeader}>
            <Zap size={14} style={{ color: '#f59e0b' }} />
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
}

const variantColors = {
  neutral: { bg: '#f8fafc', border: '#e2e8f0', text: '#475569', accent: '#64748b' },
  danger: { bg: '#fef2f2', border: '#fecaca', text: '#dc2626', accent: '#dc2626' },
  warning: { bg: '#fffbeb', border: '#fde68a', text: '#d97706', accent: '#f59e0b' },
  info: { bg: '#eff6ff', border: '#bfdbfe', text: '#2563eb', accent: '#3b82f6' },
};

function MetricTile({ icon: Icon, value, label, variant, showProgress, progressPercent = 0 }: MetricTileProps) {
  const colors = variantColors[variant];
  
  return (
    <div style={{
      ...styles.metricTile,
      background: colors.bg,
      borderColor: colors.border,
    }}>
      <div style={styles.metricHeader}>
        <Icon size={14} style={{ color: colors.accent, flexShrink: 0 }} />
        <span style={{ ...styles.metricLabel, color: '#64748b' }}>{label}</span>
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
    danger: '#dc2626',
    warning: '#f59e0b',
    info: '#3b82f6',
    critical: '#dc2626',
  };
  
  const accentColor = sectionColors[section.severity as keyof typeof sectionColors] || '#64748b';

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
        e.currentTarget.style.background = '#f8fafc';
        e.currentTarget.style.borderColor = '#cbd5e1';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = '#ffffff';
        e.currentTarget.style.borderColor = '#e2e8f0';
      }}
    >
      {/* Left Accent Bar */}
      <div style={{ ...styles.tileAccent, background: accentColor }} />
      
      {/* Content */}
      <div style={styles.tileContent}>
        <div 
          style={styles.tileText}
          dangerouslySetInnerHTML={{ __html: question.text }}
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
      <ChevronRight size={16} style={{ color: '#94a3b8', flexShrink: 0 }} />
    </button>
  );
}

function getTagStyle(type: string): React.CSSProperties {
  switch (type) {
    case 'vendor':
      return { background: '#f0fdfa', color: '#0d9488', borderColor: '#99f6e4' };
    case 'date':
      return { background: '#fff', color: '#dc2626', borderColor: '#fecaca' };
    case 'project':
      return { background: '#faf5ff', color: '#7c3aed', borderColor: '#e9d5ff' };
    case 'count':
    default:
      return { background: '#f1f5f9', color: '#475569', borderColor: '#e2e8f0' };
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
          <div key={i} style={{ ...styles.metricTile, background: '#f8fafc', borderColor: '#e2e8f0' }}>
            <div style={{ height: 14, width: '60%', background: '#e2e8f0', borderRadius: 4, marginBottom: 8 }} />
            <div style={{ height: 28, width: '40%', background: '#e2e8f0', borderRadius: 4 }} />
          </div>
        ))}
      </div>
      <div style={styles.issuesContainer}>
        <div style={{ height: 16, width: '30%', background: '#e2e8f0', borderRadius: 4, marginBottom: 16 }} />
        {[1, 2].map((i) => (
          <div key={i} style={{ height: 60, background: '#f8fafc', borderRadius: 8, marginBottom: 8, border: '1px solid #e2e8f0' }} />
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
    fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
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
    borderRadius: 10,
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
    fontSize: 10,
    fontWeight: 600,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.04em',
    whiteSpace: 'nowrap' as const,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  metricValue: {
    fontFamily: "'JetBrains Mono', ui-monospace, SFMono-Regular, monospace",
    fontSize: 22,
    fontWeight: 700,
    lineHeight: 1,
  },
  progressTrack: {
    height: 3,
    background: 'rgba(0, 0, 0, 0.08)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 2,
    transition: 'width 0.3s ease',
  },
  
  // Issues Container
  issuesContainer: {
    background: '#ffffff',
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
    fontSize: 11,
    fontWeight: 700,
    color: '#475569',
    letterSpacing: '0.06em',
  },
  issuesBadge: {
    marginLeft: 'auto',
    fontSize: 11,
    fontWeight: 600,
    color: '#64748b',
    background: '#f1f5f9',
    padding: '2px 8px',
    borderRadius: 10,
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
    fontSize: 12,
    fontWeight: 600,
    color: '#334155',
  },
  sectionCount: {
    fontSize: 11,
    color: '#94a3b8',
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
    background: '#ffffff',
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
    borderRadius: 2,
    flexShrink: 0,
  },
  tileContent: {
    flex: 1,
    minWidth: 0,
  },
  tileText: {
    fontSize: 12,
    fontWeight: 500,
    color: '#334155',
    lineHeight: 1.4,
    marginBottom: 4,
  },
  tagRow: {
    display: 'flex',
    alignItems: 'center',
    flexWrap: 'wrap' as const,
    gap: 6,
  },
  tag: {
    fontSize: 10,
    fontWeight: 500,
    padding: '2px 8px',
    borderRadius: 4,
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
    background: '#22c55e',
    color: '#ffffff',
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
    color: '#16a34a',
  },
};
