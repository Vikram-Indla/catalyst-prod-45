/**
 * Executive Reports Tab
 * Comprehensive reporting dashboard with charts, metrics, and PDF export
 */

import { useState } from 'react';
import { Resource, CapacityProject, Vacancy } from '@/types/capacity';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileDown, AlertTriangle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { toast } from 'sonner';

interface ExecutiveReportsTabProps {
  resources: Resource[];
  projects: CapacityProject[];
  vacancies: Vacancy[];
  currentWeek: number;
  currentYear: number;
}

// Calculate resource utilization for current week
function calculateUtilization(resource: Resource, weekNumber: number, year: number): number {
  return resource.allocations
    .filter(a => a.weekNumber === weekNumber && a.year === year)
    .reduce((sum, a) => sum + a.percentage, 0);
}

type ReportPeriod = 'weekly' | 'monthly' | 'yearly';

export function ExecutiveReportsTab({
  resources,
  projects,
  vacancies,
  currentWeek,
  currentYear
}: ExecutiveReportsTabProps) {
  const [period, setPeriod] = useState<ReportPeriod>('weekly');

  // Calculate stats
  const stats = { full: 0, under: 0, over: 0 };
  resources.forEach(r => {
    const util = calculateUtilization(r, currentWeek, currentYear);
    if (util > 100) stats.over++;
    else if (util >= 80) stats.full++;
    else stats.under++;
  });

  const totalFTE = resources.length;
  const allocatedFTE = resources.reduce((sum, r) => {
    const util = calculateUtilization(r, currentWeek, currentYear);
    return sum + (util / 100);
  }, 0);
  const utilizationRate = totalFTE > 0 ? Math.round((allocatedFTE / totalFTE) * 100) : 0;

  // Project chart data
  const projectData = projects.map(project => {
    const totalAlloc = resources.reduce((sum, r) => {
      return sum + r.allocations
        .filter(a => a.projectId === project.id && a.weekNumber === currentWeek && a.year === currentYear)
        .reduce((s, a) => s + a.percentage, 0);
    }, 0);
    return {
      name: project.shortName,
      value: totalAlloc,
      color: project.color
    };
  }).filter(p => p.value > 0);

  const openVacancyCount = vacancies.filter(v => v.status === 'OPEN').length;

  const getPeriodLabel = () => {
    switch (period) {
      case 'weekly': return `Week ${currentWeek}, ${currentYear}`;
      case 'monthly': return `December ${currentYear}`;
      case 'yearly': return `${currentYear}`;
    }
  };

  const handleExportPDF = () => {
    toast.success('Generating PDF report...');
    setTimeout(() => {
      window.print();
    }, 300);
  };

  return (
    <div className="space-y-4">
      {/* PDF Header - Hidden until print */}
      <div className="hidden print:block mb-6 pb-4 border-b-2 border-[#c69c6d]">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#c69c6d] rounded-lg flex items-center justify-center text-white font-bold text-lg">
              C
            </div>
            <div>
              <div className="text-base font-bold text-[#c69c6d]">CATALYST</div>
              <div className="text-xs text-muted-foreground">Ministry of Investment</div>
            </div>
          </div>
          <div className="text-right">
            <h1 className="text-lg font-bold">Executive Capacity Report</h1>
            <p className="text-sm text-muted-foreground">{getPeriodLabel()}</p>
          </div>
          <div className="text-right text-xs text-muted-foreground">
            <div>Generated: {new Date().toLocaleDateString()}</div>
            <div>Prepared by: Resource Management</div>
          </div>
        </div>
      </div>

      {/* Report Header */}
      <div className="flex justify-between items-start border-b border-border pb-4 print:hidden">
        <div>
          <h3 className="text-base font-semibold text-foreground">Executive Summary Report</h3>
          <p className="text-sm text-muted-foreground">{getPeriodLabel()}</p>
        </div>
        <div className="flex gap-3">
          {/* Period Toggle */}
          <div className="flex bg-muted rounded-md p-0.5">
            {(['weekly', 'monthly', 'yearly'] as ReportPeriod[]).map((p) => (
              <button 
                key={p}
                onClick={() => setPeriod(p)}
                className={cn(
                  "px-3 py-1 text-xs rounded capitalize transition-colors",
                  period === p 
                    ? "bg-card shadow text-[#c69c6d] font-medium" 
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {p}
              </button>
            ))}
          </div>
          {/* Export Button */}
          <Button onClick={handleExportPDF} size="sm" className="bg-[#c69c6d] hover:bg-[#8b7355] text-white">
            <FileDown className="w-4 h-4 mr-2" />
            Export PDF
          </Button>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Capacity Overview */}
        <div className="bg-muted/30 border border-border rounded-lg p-3">
          <h4 className="font-medium text-xs text-muted-foreground uppercase tracking-wide mb-3">
            Capacity Overview
          </h4>
          <div className="grid grid-cols-2 gap-2 mb-3">
            <div className="text-center p-2 bg-card rounded">
              <div className="text-2xl font-bold text-[#c69c6d]">{totalFTE}</div>
              <div className="text-[10px] text-muted-foreground uppercase">Total FTE</div>
            </div>
            <div className="text-center p-2 bg-card rounded">
              <div className="text-2xl font-bold text-[#c69c6d]">{allocatedFTE.toFixed(1)}</div>
              <div className="text-[10px] text-muted-foreground uppercase">Allocated FTE</div>
            </div>
          </div>
          <div className="px-1">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-muted-foreground">Utilization</span>
              <span className="font-medium">{utilizationRate}%</span>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-[#c69c6d] rounded-full transition-all"
                style={{ width: `${Math.min(utilizationRate, 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Resource Distribution */}
        <div className="bg-muted/30 border border-border rounded-lg p-3">
          <h4 className="font-medium text-xs text-muted-foreground uppercase tracking-wide mb-3">
            Resource Distribution
          </h4>
          <div className="space-y-2">
            <div className="flex justify-between items-center py-1.5 border-b border-border">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[#5c7c5c]" />
                <span className="text-xs">Fully Allocated</span>
              </div>
              <span className="font-semibold text-xs text-[#5c7c5c]">
                {stats.full} ({totalFTE > 0 ? Math.round(stats.full/totalFTE*100) : 0}%)
              </span>
            </div>
            <div className="flex justify-between items-center py-1.5 border-b border-border">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[#8b7355]" />
                <span className="text-xs">Underallocated</span>
              </div>
              <span className="font-semibold text-xs text-[#8b7355]">
                {stats.under} ({totalFTE > 0 ? Math.round(stats.under/totalFTE*100) : 0}%)
              </span>
            </div>
            <div className="flex justify-between items-center py-1.5">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[#8b5c5c]" />
                <span className="text-xs">Overallocated</span>
              </div>
              <span className="font-semibold text-xs text-[#8b5c5c]">
                {stats.over} ({totalFTE > 0 ? Math.round(stats.over/totalFTE*100) : 0}%)
              </span>
            </div>
          </div>
        </div>

        {/* Skill Distribution */}
        <div className="bg-muted/30 border border-border rounded-lg p-3">
          <h4 className="font-medium text-xs text-muted-foreground uppercase tracking-wide mb-3">
            Skill Distribution
          </h4>
          <div className="space-y-1">
            {(() => {
              const skillCounts: Record<string, { count: number; allocated: number }> = {};
              resources.forEach(r => {
                const skill = r.primarySkill;
                if (!skillCounts[skill]) {
                  skillCounts[skill] = { count: 0, allocated: 0 };
                }
                skillCounts[skill].count++;
                skillCounts[skill].allocated += calculateUtilization(r, currentWeek, currentYear);
              });
              
              const skillColors: Record<string, string> = {
                'Frontend': '#5c7c5c',
                'Backend': '#8b7355',
                'Full Stack': '#c69c6d',
                'DevOps': '#6b8e8e',
                'QA': '#7c6b8e',
                'Product': '#8e7c6b',
                'Design': '#6b7c8e',
                'Data': '#8e6b7c'
              };

              const sortedSkills = Object.entries(skillCounts)
                .sort((a, b) => b[1].count - a[1].count);

              return sortedSkills.map(([skill, data]) => {
                const avgAlloc = data.count > 0 ? Math.round(data.allocated / data.count) : 0;
                const pct = totalFTE > 0 ? Math.round(data.count / totalFTE * 100) : 0;
                
                return (
                  <div key={skill} className="flex justify-between items-center py-1.5">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-2 h-2 rounded-full" 
                        style={{ backgroundColor: skillColors[skill] || '#9ca3af' }}
                      />
                      <span className="text-xs">{skill}</span>
                    </div>
                    <span 
                      className="font-semibold text-xs"
                      style={{ color: skillColors[skill] || '#9ca3af' }}
                    >
                      {data.count} ({pct}%)
                    </span>
                  </div>
                );
              });
            })()}
          </div>
        </div>

        {/* Alerts */}
        <div className="bg-muted/30 border border-border rounded-lg p-3">
          <h4 className="font-medium text-xs text-muted-foreground uppercase tracking-wide mb-3">
            Alerts
          </h4>
          <ul className="space-y-2">
            <li className="flex justify-between items-center py-1.5 border-b border-border">
              <span className="text-xs text-[#8b5c5c] flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" /> Overallocated
              </span>
              <Badge variant="destructive" className="text-[10px] h-5 px-1.5 bg-[#8b5c5c]">
                {stats.over}
              </Badge>
            </li>
            <li className="flex justify-between items-center py-1.5 border-b border-border">
              <span className="text-xs text-[#8b7355]">📋 Open Vacancies</span>
              <Badge variant="secondary" className="text-[10px] h-5 px-1.5 bg-[#8b7355]/10 text-[#8b7355]">
                {openVacancyCount}
              </Badge>
            </li>
            <li className="flex justify-between items-center py-1.5">
              <span className="text-xs">⏰ Soft Expiring</span>
              <Badge variant="secondary" className="text-[10px] h-5 px-1.5">2</Badge>
            </li>
          </ul>
        </div>
      </div>

      {/* Resource Summary Table */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="px-3 py-2 border-b border-border bg-muted/30">
          <h4 className="font-medium text-xs text-muted-foreground uppercase tracking-wide">Resource Summary</h4>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/20">
                <th className="text-left p-2 text-xs font-medium text-muted-foreground">Resource</th>
                <th className="text-left p-2 text-xs font-medium text-muted-foreground">Role</th>
                <th className="text-center p-2 text-xs font-medium text-muted-foreground">Utilization</th>
                <th className="text-left p-2 text-xs font-medium text-muted-foreground">Primary Project</th>
                <th className="text-center p-2 text-xs font-medium text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody>
              {resources.map((resource) => {
                const util = calculateUtilization(resource, currentWeek, currentYear);
                const status = util > 100 ? 'over' : util >= 80 ? 'full' : 'under';
                
                // Find primary project (highest allocation)
                const projectAllocations = projects.map(p => ({
                  project: p,
                  total: resource.allocations
                    .filter(a => a.projectId === p.id && a.weekNumber === currentWeek && a.year === currentYear)
                    .reduce((s, a) => s + a.percentage, 0)
                })).filter(pa => pa.total > 0).sort((a, b) => b.total - a.total);
                
                const primaryProject = projectAllocations[0];

                return (
                  <tr key={resource.id} className="border-b border-border last:border-b-0 hover:bg-muted/10">
                    <td className="p-2 text-sm font-medium">{resource.name}</td>
                    <td className="p-2 text-sm text-muted-foreground">{resource.role}</td>
                    <td className="p-2 text-center">
                      <span className={cn(
                        "font-semibold text-sm",
                        status === 'over' ? 'text-[#8b5c5c]' :
                        status === 'full' ? 'text-[#5c7c5c]' : 'text-[#8b7355]'
                      )}>
                        {util}%
                      </span>
                    </td>
                    <td className="p-2 text-sm">
                      {primaryProject ? primaryProject.project.name : '-'}
                    </td>
                    <td className="p-2 text-center">
                      <Badge 
                        variant="secondary" 
                        className={cn(
                          "text-[10px]",
                          status === 'over' ? 'bg-[#8b5c5c]/10 text-[#8b5c5c]' :
                          status === 'full' ? 'bg-[#5c7c5c]/10 text-[#5c7c5c]' : 'bg-[#8b7355]/10 text-[#8b7355]'
                        )}
                      >
                        {status === 'over' ? 'Over' : status === 'full' ? 'Full' : 'Under'}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Project Breakdown Table */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="px-3 py-2 border-b border-border bg-muted/30">
          <h4 className="font-medium text-xs text-muted-foreground uppercase tracking-wide">Project Breakdown</h4>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/20">
                <th className="text-left p-2 text-xs font-medium text-muted-foreground">Project</th>
                <th className="text-center p-2 text-xs font-medium text-muted-foreground">Total %</th>
                <th className="text-center p-2 text-xs font-medium text-muted-foreground">Resources</th>
                <th className="text-center p-2 text-xs font-medium text-muted-foreground">Hard %</th>
                <th className="text-center p-2 text-xs font-medium text-muted-foreground">Soft %</th>
                <th className="text-center p-2 text-xs font-medium text-muted-foreground">Vacancies</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((project) => {
                let totalAlloc = 0;
                let hardAlloc = 0;
                let softAlloc = 0;
                const assignedResources = new Set<string>();

                resources.forEach(r => {
                  r.allocations
                    .filter(a => a.projectId === project.id && a.weekNumber === currentWeek && a.year === currentYear)
                    .forEach(a => {
                      totalAlloc += a.percentage;
                      if (a.type === 'HARD') hardAlloc += a.percentage;
                      else softAlloc += a.percentage;
                      assignedResources.add(r.id);
                    });
                });

                const projectVacancies = vacancies.filter(v => v.projectId === project.id && v.status === 'OPEN').length;

                if (totalAlloc === 0 && projectVacancies === 0) return null;

                return (
                  <tr key={project.id} className="border-b border-border last:border-b-0 hover:bg-muted/10">
                    <td className="p-2">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-2 h-2 rounded-full" 
                          style={{ backgroundColor: project.color }}
                        />
                        <span className="text-sm font-medium">{project.name}</span>
                      </div>
                    </td>
                    <td className="p-2 text-center">
                      <span className="font-bold text-sm text-[#c69c6d]">{totalAlloc}%</span>
                    </td>
                    <td className="p-2 text-center text-sm">{assignedResources.size}</td>
                    <td className="p-2 text-center text-sm">{hardAlloc}%</td>
                    <td className="p-2 text-center text-sm">{softAlloc}%</td>
                    <td className="p-2 text-center">
                      {projectVacancies > 0 ? (
                        <Badge variant="destructive" className="text-[10px] h-5 px-1.5 bg-[#8b7355]/10 text-[#8b7355]">
                          {projectVacancies}
                        </Badge>
                      ) : '-'}
                    </td>
                  </tr>
                );
              }).filter(Boolean)}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
