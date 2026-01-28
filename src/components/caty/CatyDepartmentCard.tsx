/**
 * Caty V4 — Department Card Component
 * Expandable department with capacity bar and resource list
 */

import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  type DepartmentStats, 
  type ResourceInfo,
  getCapacityClass, 
  getWarningBadgeClass,
  getDeptClass,
  formatContractDate
} from './types';

interface CatyDepartmentCardProps {
  department: DepartmentStats;
  isExpanded: boolean;
  onToggle: () => void;
}

export function CatyDepartmentCard({ 
  department, 
  isExpanded, 
  onToggle 
}: CatyDepartmentCardProps) {
  const capacityClass = getCapacityClass(department.utilization);
  const warningClass = getWarningBadgeClass(department.critical + department.warning);
  const totalWarnings = department.critical + department.warning;
  const isCritical = totalWarnings >= 4 || department.utilization >= 90;
  const deptClass = getDeptClass(department.name);

  return (
    <div 
      className={cn(
        "caty-dept-card",
        deptClass,
        isExpanded && "expanded",
        isCritical && "critical-dept"
      )}
    >
      <div
        className="caty-dept-header"
        role="button"
        tabIndex={0}
        aria-expanded={isExpanded}
        aria-controls={`dept-details-${department.id}`}
        aria-label={`${department.name} department. ${department.count} resources. ${department.utilization}% utilization. ${totalWarnings} warnings.`}
        onClick={onToggle}
        onKeyDown={(e) => e.key === 'Enter' && onToggle()}
      >
        {/* Department Icon */}
        <div 
          className="caty-dept-icon"
          style={{ backgroundColor: department.color }}
        >
          {department.shortName}
        </div>
        
        {/* Department Info */}
        <div className="caty-dept-info">
          <div className="caty-dept-name">{department.name}</div>
          <div className="caty-dept-meta">{department.count} resources</div>
        </div>
        
        {/* Capacity Bar */}
        <div className="caty-dept-capacity">
          <div className="caty-capacity-bar">
            <div 
              className={cn("caty-capacity-fill", capacityClass)}
              style={{ width: `${Math.min(department.utilization, 100)}%` }}
            />
          </div>
          <span className={cn("caty-capacity-value", capacityClass)}>
            {department.utilization}%
          </span>
        </div>
        
        {/* Warning Badge */}
        <span className={cn("caty-dept-status", warningClass)}>
          {totalWarnings >= 4 && <span aria-hidden="true">⚠️ </span>}
          {totalWarnings > 0 
            ? `${totalWarnings} warning${totalWarnings > 1 ? 's' : ''}`
            : 'All safe'}
        </span>
        
        {/* Trend Indicator */}
        {department.trend && department.trend !== 'stable' && (
          <span className={cn(
            "caty-dept-trend",
            department.trend === 'up' ? "trend-up" : "trend-down"
          )}>
            {department.trend === 'up' ? '↑' : '↓'}
          </span>
        )}
        
        {/* Chevron */}
        <ChevronDown 
          size={16} 
          className={cn("caty-dept-chevron", isExpanded && "rotated")}
        />
      </div>
      
      {/* Expanded Details */}
      {isExpanded && (
        <div 
          id={`dept-details-${department.id}`}
          className="caty-dept-details"
          role="region"
          aria-label={`${department.name} department details`}
        >
          {/* Warning Type Breakdown */}
          {department.warningBreakdown && department.warningBreakdown.length > 0 && (
            <div className="caty-warning-types">
              {department.warningBreakdown.map((w, i) => (
                <span key={w.type}>
                  {w.type}: {w.count}
                  {i < department.warningBreakdown!.length - 1 && ' · '}
                </span>
              ))}
            </div>
          )}
          
          {/* Resource List */}
          {department.resources && department.resources.length > 0 && (
            <div className="caty-resource-list">
              {department.resources.map(resource => (
                <CatyResourceItem key={resource.id} resource={resource} />
              ))}
            </div>
          )}
          
          {/* Empty state for no warnings */}
          {(!department.resources || department.resources.length === 0) && totalWarnings === 0 && (
            <div className="caty-dept-empty">
              <span>✓ No capacity concerns</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Resource item sub-component
function CatyResourceItem({ resource }: { resource: ResourceInfo }) {
  return (
    <div className="caty-resource-item">
      <div 
        className={cn(
          "caty-resource-avatar",
          resource.warningType === 'contract' ? "contract-warning" : "utilization-warning"
        )}
      >
        {resource.initials}
      </div>
      <div className="caty-resource-info">
        <div className="caty-resource-name">{resource.name}</div>
        <div className="caty-resource-meta">
          {resource.warningType === 'contract' && resource.contractEnd && (
            <span className="caty-resource-contract">
              Contract ends: {formatContractDate(resource.contractEnd)}
            </span>
          )}
          {resource.warningType === 'utilization' && resource.utilization && (
            <span className="caty-resource-utilization">
              Utilization: {resource.utilization}%
            </span>
          )}
          {resource.role && (
            <span className="caty-resource-role">{resource.role}</span>
          )}
        </div>
      </div>
    </div>
  );
}
