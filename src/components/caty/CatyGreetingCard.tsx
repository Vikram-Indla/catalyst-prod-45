/**
 * Caty V4 — Greeting Card Component
 * Initial AI message with KPIs and department breakdown
 */

import { cn } from '@/lib/utils';
import { CatyKPITiles } from './CatyKPITiles';
import { CatyDepartmentCard } from './CatyDepartmentCard';
import { CatyEmptyState } from './CatyStates';
import type { CapacityStats } from './types';
import catalystLogoWhite from '@/assets/catalyst-ai-logo-white.svg';

interface CatyGreetingCardProps {
  greeting: string;
  userName: string;
  stats: CapacityStats;
  expandedDepts: Set<string>;
  onDeptToggle: (deptId: string) => void;
  onKpiClick: (type: 'critical' | 'warning' | 'total') => void;
  timestamp: Date;
}

export function CatyGreetingCard({
  greeting,
  userName,
  stats,
  expandedDepts,
  onDeptToggle,
  onKpiClick,
  timestamp
}: CatyGreetingCardProps) {
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };

  const totalWarnings = stats.critical + stats.warning;
  const isAllClear = totalWarnings === 0;

  return (
    <div className="caty-message ai">
      <div className="caty-message-avatar">
        <img 
          src={catalystLogoWhite} 
          alt="" 
          className="w-5 h-5"
        />
      </div>
      
      <div className="caty-message-content">
        <div className="caty-greeting-card">
          {/* Greeting Header */}
          <div className="caty-greeting-header">
            <h2 className="caty-greeting-title">
              {greeting}, {userName}! 👋
            </h2>
            <p className="caty-greeting-subtitle">
              Here's your capacity snapshot
            </p>
          </div>

          {/* All Clear State */}
          {isAllClear ? (
            <CatyEmptyState type="all-clear" />
          ) : (
            <>
              {/* KPI Tiles */}
              <CatyKPITiles
                critical={stats.critical}
                warning={stats.warning}
                total={stats.total}
                criticalTrend={stats.criticalTrend}
                warningTrend={stats.warningTrend}
                onKpiClick={onKpiClick}
              />

              {/* Department Section Header */}
              <div className="caty-section-header">
                <span className="caty-section-title">By Department</span>
                <span className="caty-section-count">
                  {stats.departments.length} departments
                </span>
              </div>

              {/* Department List */}
              <div className="caty-dept-list">
                {stats.departments
                  .sort((a, b) => {
                    // Sort by total warnings (critical + warning), descending
                    const aTotal = a.critical + a.warning;
                    const bTotal = b.critical + b.warning;
                    return bTotal - aTotal;
                  })
                  .map(dept => (
                    <CatyDepartmentCard
                      key={dept.id}
                      department={dept}
                      isExpanded={expandedDepts.has(dept.id)}
                      onToggle={() => onDeptToggle(dept.id)}
                    />
                  ))}
              </div>
            </>
          )}
        </div>
        
        <span className="caty-message-time">
          {formatTime(timestamp)}
        </span>
      </div>
    </div>
  );
}
