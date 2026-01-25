/**
 * DepartmentRunRates - V8 Design System
 * Displays monthly run rate (sum of CTC) for Variable resources by department
 */

import { useMemo } from 'react';
import { Users, AlertTriangle } from 'lucide-react';
import { UserProfile } from '@/hooks/useUsers';

interface DepartmentRunRatesProps {
  users: UserProfile[];
  activeDepartment?: string;
  onDepartmentClick?: (department: string) => void;
}

const DEPARTMENTS = ['Delivery', 'Product', 'Operations', 'Technical Support', 'Governance'];

export function DepartmentRunRates({ users, activeDepartment, onDepartmentClick }: DepartmentRunRatesProps) {
  const runRates = useMemo(() => {
    return DEPARTMENTS.map(dept => {
      // Filter Variable resources (including legacy 'Core' type)
      const variableUsers = users.filter(u => {
        const deptMatch = u.department_name === dept;
        const typeMatch = u.resource_type?.toLowerCase() === 'variable' || 
                         u.resource_type?.toLowerCase() === 'core';
        return deptMatch && typeMatch;
      });
      
      const missingCtcCount = variableUsers.filter(u => !u.ctc || u.ctc === 0).length;
      
      return {
        department: dept,
        monthlyRunRate: variableUsers.reduce((sum, u) => sum + (u.ctc || 0), 0),
        headcount: variableUsers.length,
        missingCtcCount
      };
    });
  }, [users]);

  const formatCurrency = (value: number): string => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `${Math.round(value / 1000).toLocaleString()}K`;
    }
    return value.toLocaleString();
  };

  return (
    <section className="ct-runrate-section">
      <div className="ct-runrate-header">
        <span className="ct-runrate-title">Department Monthly Run Rates</span>
        <span className="ct-runrate-badge">
          <Users size={12} />
          Variable Only
        </span>
      </div>
      
      <div className="ct-runrate-grid">
        {runRates.map(({ department, monthlyRunRate, headcount, missingCtcCount }) => (
          <div 
            key={department} 
            className={`ct-runrate-card ${activeDepartment === department ? 'active' : ''}`}
            onClick={() => onDepartmentClick?.(department)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && onDepartmentClick?.(department)}
          >
            <div className="ct-runrate-dept">{department}</div>
            <div className="ct-runrate-value">
              <span className="ct-runrate-currency">ریال</span>
              {formatCurrency(monthlyRunRate)}
            </div>
            <div className="ct-runrate-headcount">
              <Users size={14} />
              {headcount} Variable {headcount === 1 ? 'resource' : 'resources'}
            </div>
            <div className="ct-runrate-footer">
              <div className="ct-runrate-yearly">
                <span className="ct-runrate-yearly-label">Yearly</span>
                <span className="ct-runrate-yearly-value">ریال {formatCurrency(monthlyRunRate * 12)}</span>
              </div>
              {missingCtcCount > 0 && (
                <div className="ct-runrate-missing">
                  <AlertTriangle size={12} />
                  {missingCtcCount} missing CTC
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
