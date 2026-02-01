// Aqd¹⁰ Executive Dashboard Summary Cards
import React from 'react';
import { List, CheckCircle, BarChart3, Zap } from 'lucide-react';

interface AqdSummaryCardsProps {
  totalLists: number;
  totalItems: number;
  completionPercent: number;
  activeLists: number;
}

export function AqdSummaryCards({ 
  totalLists, 
  totalItems, 
  completionPercent, 
  activeLists 
}: AqdSummaryCardsProps) {
  return (
    <div className="aqd-dash-summary">
      <div className="aqd-dash-card">
        <div className="aqd-dash-card-icon aqd-dash-card-icon--blue">
          <List size={22} />
        </div>
        <div className="aqd-dash-card-value">{totalLists}</div>
        <div className="aqd-dash-card-label">Total Lists</div>
        <div className="aqd-dash-card-sub">Priority lists created</div>
      </div>
      
      <div className="aqd-dash-card">
        <div className="aqd-dash-card-icon aqd-dash-card-icon--green">
          <CheckCircle size={22} />
        </div>
        <div className="aqd-dash-card-value">{totalItems}</div>
        <div className="aqd-dash-card-label">Total Items</div>
        <div className="aqd-dash-card-sub">Across all lists</div>
      </div>
      
      <div className="aqd-dash-card">
        <div className="aqd-dash-card-icon aqd-dash-card-icon--amber">
          <BarChart3 size={22} />
        </div>
        <div className="aqd-dash-card-value">{completionPercent}%</div>
        <div className="aqd-dash-card-label">Completion</div>
        <div className="aqd-dash-progress-mini">
          <div 
            className="aqd-dash-progress-mini-fill" 
            style={{ width: `${completionPercent}%` }} 
          />
        </div>
      </div>
      
      <div className="aqd-dash-card">
        <div className="aqd-dash-card-icon aqd-dash-card-icon--purple">
          <Zap size={22} />
        </div>
        <div className="aqd-dash-card-value">{activeLists}</div>
        <div className="aqd-dash-card-label">Active</div>
        <div className="aqd-dash-card-sub">Lists in progress</div>
      </div>
    </div>
  );
}
