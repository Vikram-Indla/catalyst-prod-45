/**
 * CATY AI Viewport — Enterprise Probing Questions Interface
 * Replaces the old empty state with actionable insights
 */

import React from 'react';
import { ChevronRight } from 'lucide-react';
import { useCatyViewportData } from '@/hooks/useCatyViewportData';
import type { ProbingQuestion, ViewportSection as ViewportSectionType } from '@/types/caty-viewport';
import { cn } from '@/lib/utils';

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

  return (
    <div className="caty-viewport">
      {/* Stats Row */}
      <div className="caty-viewport__stats">
        <StatItem value={viewportData.stats.totalResources} label="Resources" />
        <StatItem 
          value={viewportData.stats.expiringContracts} 
          label="Expiring" 
          variant={viewportData.stats.expiringContracts > 0 ? 'danger' : 'muted'} 
        />
        <StatItem 
          value={viewportData.stats.overAllocated} 
          label=">100%" 
          variant={viewportData.stats.overAllocated > 0 ? 'warning' : 'muted'} 
        />
        <StatItem 
          value={viewportData.stats.zeroUtilization} 
          label="0% Util" 
          variant={viewportData.stats.zeroUtilization > 0 ? 'default' : 'muted'} 
        />
      </div>

      {/* Sections */}
      {viewportData.sections.map((section) => (
        <ViewportSection 
          key={section.id} 
          section={section} 
          onQuestionClick={onQuestionClick}
        />
      ))}

      {/* Empty state if no sections */}
      {viewportData.sections.length === 0 && (
        <div className="caty-viewport__empty">
          <p>All systems operational. No critical issues detected.</p>
        </div>
      )}
    </div>
  );
}

// ============================================
// STAT ITEM
// ============================================

interface StatItemProps {
  value: number;
  label: string;
  variant?: 'default' | 'danger' | 'warning' | 'muted';
}

function StatItem({ value, label, variant = 'default' }: StatItemProps) {
  return (
    <div className="caty-viewport__stat">
      <div className={cn(
        'caty-viewport__stat-value',
        variant === 'danger' && 'caty-viewport__stat-value--danger',
        variant === 'warning' && 'caty-viewport__stat-value--warning',
        variant === 'muted' && 'caty-viewport__stat-value--muted',
      )}>
        {value}
      </div>
      <div className="caty-viewport__stat-label">{label}</div>
    </div>
  );
}

// ============================================
// VIEWPORT SECTION
// ============================================

interface ViewportSectionProps {
  section: ViewportSectionType;
  onQuestionClick: (question: ProbingQuestion) => void;
}

function ViewportSection({ section, onQuestionClick }: ViewportSectionProps) {
  return (
    <div className="caty-viewport__section">
      <div className="caty-viewport__section-header">
        <div className={cn(
          'caty-viewport__section-indicator',
          `caty-viewport__section-indicator--${section.severity}`
        )} />
        <span className="caty-viewport__section-title">{section.title}</span>
        <span className="caty-viewport__section-count">{section.totalCount}</span>
      </div>
      <div className="caty-viewport__probe-list">
        {section.questions.map((question) => (
          <ProbeItem 
            key={question.id} 
            question={question} 
            onClick={() => onQuestionClick(question)}
          />
        ))}
      </div>
    </div>
  );
}

// ============================================
// PROBE ITEM (Question Card)
// ============================================

interface ProbeItemProps {
  question: ProbingQuestion;
  onClick: () => void;
}

function ProbeItem({ question, onClick }: ProbeItemProps) {
  return (
    <button
      className={cn(
        'caty-viewport__probe-item',
        `caty-viewport__probe-item--${question.severity}`
      )}
      onClick={onClick}
      type="button"
    >
      <div className="caty-viewport__probe-content">
        <div 
          className="caty-viewport__probe-text"
          dangerouslySetInnerHTML={{ __html: question.text }}
        />
        {question.tags.length > 0 && (
          <div className="caty-viewport__probe-meta">
            {question.tags.map((tag, idx) => (
              <span 
                key={idx} 
                className={cn(
                  'caty-viewport__tag',
                  `caty-viewport__tag--${tag.type}`
                )}
              >
                {tag.label}
              </span>
            ))}
          </div>
        )}
      </div>
      <ChevronRight className="caty-viewport__probe-chevron" />
    </button>
  );
}

// ============================================
// LOADING SKELETON
// ============================================

function ViewportSkeleton() {
  return (
    <div className="caty-viewport__skeleton">
      <div className="caty-viewport__skeleton-stats" />
      <div className="caty-viewport__skeleton-section">
        <div className="caty-viewport__skeleton-header" />
        <div className="caty-viewport__skeleton-card" />
        <div className="caty-viewport__skeleton-card" />
      </div>
      <div className="caty-viewport__skeleton-section">
        <div className="caty-viewport__skeleton-header" />
        <div className="caty-viewport__skeleton-card" />
      </div>
    </div>
  );
}
