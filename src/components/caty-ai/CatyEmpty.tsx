/**
 * Caty AI V7 — Empty State with Data Summary
 * Uses actual database stats
 */

import React from 'react';
import { HubIcon } from './constants';
import { useCatyStats } from './hooks/useCatyStats';
import { useDepartments } from './hooks/useDepartments';

interface CatyEmptyProps {
  onSuggestionClick: (text: string) => void;
  departmentId?: string | null;
}

export const CatyEmpty: React.FC<CatyEmptyProps> = ({ onSuggestionClick, departmentId }) => {
  const { data: stats } = useCatyStats(departmentId);
  const { data: departments = [] } = useDepartments();
  
  return (
    <div className="caty-empty">
      <div className="caty-empty-icon">
        <HubIcon />
      </div>
      <h3>CATY AI<sup className="caty-trademark">™</sup></h3>
      <p>Capacity Intelligence Assistant</p>
      
      {/* Data Summary */}
      <div className="caty-data-summary">
        <div className="caty-data-stat">
          <span className="caty-data-value">{stats?.totalResources || 0}</span>
          <span className="caty-data-label">Resources</span>
        </div>
        <div className="caty-data-stat">
          <span className="caty-data-value">{stats?.expiringContracts || 0}</span>
          <span className="caty-data-label">Expiring</span>
        </div>
        <div className="caty-data-stat">
          <span className="caty-data-value">{departments.length}</span>
          <span className="caty-data-label">Depts</span>
        </div>
      </div>
      
      {/* Suggestions */}
      <div className="caty-empty-suggestions">
        <p className="caty-empty-label">Try asking</p>
        <button onClick={() => onSuggestionClick('Show utilization')}>
          Show utilization
        </button>
        <button onClick={() => onSuggestionClick('Who is over 90% utilized?')}>
          Who is over 90% utilized?
        </button>
        <button onClick={() => onSuggestionClick('Expiring contracts')}>
          Expiring contracts
        </button>
        <button onClick={() => onSuggestionClick('Off-shore teams')}>
          Off-shore teams
        </button>
      </div>
    </div>
  );
};
