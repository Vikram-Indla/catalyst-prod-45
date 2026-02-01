// Aqd¹⁰ Executive Dashboard Quick Actions
import React from 'react';
import { Upload, Download, BarChart2, Lightbulb } from 'lucide-react';

interface AqdQuickActionsProps {
  onImport?: () => void;
  onExport?: () => void;
  onAnalytics?: () => void;
}

export function AqdQuickActions({ 
  onImport, 
  onExport, 
  onAnalytics 
}: AqdQuickActionsProps) {
  return (
    <div className="aqd-dash-quick">
      <div className="aqd-dash-quick-title">Quick Actions</div>
      <div className="aqd-dash-quick-grid">
        <div 
          className="aqd-dash-quick-card"
          onClick={onImport}
          role="button"
          tabIndex={0}
        >
          <div className="aqd-dash-quick-icon">
            <Upload size={20} />
          </div>
          <div className="aqd-dash-quick-info">
            <h4>Import Lists</h4>
            <p>Upload CSV or Excel</p>
          </div>
        </div>

        <div 
          className="aqd-dash-quick-card"
          onClick={onExport}
          role="button"
          tabIndex={0}
        >
          <div className="aqd-dash-quick-icon">
            <Download size={20} />
          </div>
          <div className="aqd-dash-quick-info">
            <h4>Export Report</h4>
            <p>Download as PDF</p>
          </div>
        </div>

        <div 
          className="aqd-dash-quick-card"
          onClick={onAnalytics}
          role="button"
          tabIndex={0}
        >
          <div className="aqd-dash-quick-icon">
            <BarChart2 size={20} />
          </div>
          <div className="aqd-dash-quick-info">
            <h4>View Analytics</h4>
            <p>Insights & trends</p>
          </div>
        </div>
      </div>

      {/* Tip Banner */}
      <div className="aqd-dash-tip">
        <Lightbulb size={20} />
        <p>
          <strong>Tip:</strong> Click a list to manage its top 10 priorities. 
          Use the weekly checkout to carry items forward or mark them resolved.
        </p>
      </div>
    </div>
  );
}
