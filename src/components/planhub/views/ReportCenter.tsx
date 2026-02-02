import React, { useState } from 'react';
import { Calendar, Users, DollarSign, AlertTriangle, Sparkles, Download, Loader2, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { LucideIcon } from 'lucide-react';

interface Props {
  planId?: string | null;
}

interface ReportType {
  id: string;
  name: string;
  description: string;
  icon: LucideIcon;
  iconClass: string;
  isAI?: boolean;
}

const REPORTS: ReportType[] = [
  {
    id: 'schedule',
    name: 'Schedule Report',
    description: 'Timeline analysis with milestones and critical path',
    icon: Calendar,
    iconClass: 'schedule',
  },
  {
    id: 'resource',
    name: 'Resource Report',
    description: 'Team utilization and allocation breakdown',
    icon: Users,
    iconClass: 'resource',
  },
  {
    id: 'budget',
    name: 'Budget Report',
    description: 'Cost tracking and financial projections',
    icon: DollarSign,
    iconClass: 'budget',
  },
  {
    id: 'risk',
    name: 'Risk Report',
    description: 'Risk assessment and mitigation status',
    icon: AlertTriangle,
    iconClass: 'risk',
  },
  {
    id: 'ai-summary',
    name: 'AI Executive Summary',
    description: 'AI-generated comprehensive plan overview',
    icon: Sparkles,
    iconClass: 'ai',
    isAI: true,
  },
];

export default function ReportCenter({ planId }: Props) {
  const { toast } = useToast();
  const [generating, setGenerating] = useState<string | null>(null);

  const handleGenerateReport = async (reportId: string) => {
    if (!planId) {
      toast({ 
        title: 'No plan selected', 
        description: 'Please select a plan first',
        variant: 'destructive' 
      });
      return;
    }

    setGenerating(reportId);

    // Simulate report generation
    await new Promise(resolve => setTimeout(resolve, 2000));

    toast({ 
      title: 'Report Generated',
      description: `${REPORTS.find(r => r.id === reportId)?.name} is ready for download`
    });

    setGenerating(null);
  };

  // Stats (mock data - replace with real queries)
  const stats = {
    generated: 12,
    lastGenerated: 'Today',
    scheduled: 3,
  };

  if (!planId) {
    return (
      <>
        <div className="ph-page-header">
          <h1 className="ph-page-title">Report Center</h1>
          <p className="ph-page-subtitle">Select a plan to generate reports</p>
        </div>
        <div className="ph-page-body">
          <div className="ph-empty">
            <FileText className="ph-empty-icon" />
            <h2 className="ph-empty-title">No Plan Selected</h2>
            <p className="ph-empty-text">Go to Plan Library and select a plan to generate reports</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="ph-page-header">
        <div className="ph-page-header-content">
          <div>
            <h1 className="ph-page-title">Report Center</h1>
            <p className="ph-page-subtitle">Generate and download plan reports</p>
          </div>
        </div>
      </div>

      <div className="ph-page-body">
        {/* Stats */}
        <div className="ph-report-stats">
          <div className="ph-report-stat">
            <span className="ph-report-stat-label">Reports Generated</span>
            <span className="ph-report-stat-value">{stats.generated}</span>
          </div>
          <div className="ph-report-stat">
            <span className="ph-report-stat-label">Last Generated</span>
            <span className="ph-report-stat-value">{stats.lastGenerated}</span>
          </div>
          <div className="ph-report-stat">
            <span className="ph-report-stat-label">Scheduled Reports</span>
            <span className="ph-report-stat-value">{stats.scheduled}</span>
          </div>
        </div>

        {/* Section Title */}
        <h2 className="ph-report-section-title">Available Reports</h2>

        {/* Report Cards */}
        <div className="ph-report-grid">
          {REPORTS.map(report => {
            const IconComponent = report.icon;
            return (
              <div key={report.id} className="ph-report-card">
                <div className={`ph-report-icon ${report.iconClass}`}>
                  <IconComponent size={24} />
                </div>
                
                <div className="ph-report-card-header">
                  <span className="ph-report-card-title">{report.name}</span>
                  {report.isAI && (
                    <span className="ph-report-ai-badge">AI</span>
                  )}
                </div>
                
                <p className="ph-report-card-description">{report.description}</p>

                <button
                  onClick={() => handleGenerateReport(report.id)}
                  disabled={generating === report.id}
                  className="ph-btn ph-btn-secondary ph-report-generate-btn"
                >
                  {generating === report.id ? (
                    <>
                      <Loader2 size={14} className="ph-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Download size={14} />
                      Generate
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>

        {/* Recent Reports */}
        <h2 className="ph-report-section-title" style={{ marginTop: 'var(--ph-space-8)' }}>
          Recent Reports
        </h2>

        <div className="ph-report-table-container">
          <table className="ph-report-table">
            <thead>
              <tr>
                <th>Report</th>
                <th>Generated</th>
                <th>Generated By</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={4} className="ph-report-table-empty">
                  No reports generated yet for this plan
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
