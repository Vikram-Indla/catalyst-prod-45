/**
 * Budget Data Quality Tab - V8 Design
 * Dedicated tab for data quality issues by department
 * Shows resources missing compensation data with "Fix Data" actions
 */

import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, ChevronRight, AlertTriangle, CheckCircle2, Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { type BudgetResource } from '@/hooks/budget/useBudgetData';

interface BudgetDataQualityTabProps {
  data: {
    resources: BudgetResource[];
    dataQualityIssues: { name: string; department: string; issue: string }[];
  } | null;
}

interface DepartmentQualityCard {
  department: string;
  missingCount: number;
  totalCount: number;
  resources: BudgetResource[];
}

export function BudgetDataQualityTab({ data }: BudgetDataQualityTabProps) {
  const navigate = useNavigate();

  if (!data) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        Loading data quality information...
      </div>
    );
  }

  // Calculate missing CTC by department
  const departmentQuality = useMemo<DepartmentQualityCard[]>(() => {
    const byDept: Record<string, { missing: BudgetResource[]; total: number }> = {};
    
    data.resources.forEach(r => {
      if (!byDept[r.department]) {
        byDept[r.department] = { missing: [], total: 0 };
      }
      byDept[r.department].total++;
      if (!r.ctc || r.ctc === 0) {
        byDept[r.department].missing.push(r);
      }
    });

    return Object.entries(byDept)
      .map(([dept, info]) => ({
        department: dept,
        missingCount: info.missing.length,
        totalCount: info.total,
        resources: info.missing,
      }))
      .filter(d => d.missingCount > 0)
      .sort((a, b) => b.missingCount - a.missingCount);
  }, [data.resources]);

  const totalMissing = departmentQuality.reduce((sum, d) => sum + d.missingCount, 0);
  const totalResources = data.resources.length;

  const handleFixData = (department: string) => {
    // Navigate to admin users page with department filter
    navigate(`/admin/users?department=${encodeURIComponent(department)}&filter=missing-ctc`);
  };

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="flex items-center gap-6 p-5 bg-card border rounded-xl">
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-12 h-12 rounded-xl flex items-center justify-center",
            totalMissing > 0 ? "bg-amber-100" : "bg-emerald-100"
          )}>
            {totalMissing > 0 ? (
              <AlertTriangle className="w-6 h-6 text-amber-600" />
            ) : (
              <CheckCircle2 className="w-6 h-6 text-emerald-600" />
            )}
          </div>
          <div>
            <h2 className="text-2xl font-bold text-foreground">
              {totalMissing > 0 ? totalMissing : 'All Clear'}
            </h2>
            <p className="text-sm text-muted-foreground">
              {totalMissing > 0 
                ? 'Resources Missing Compensation Data'
                : 'All resources have compensation data'
              }
            </p>
          </div>
        </div>
        
        <div className="flex-1" />
        
        <div className="text-right">
          <div className="text-sm text-muted-foreground">Total Resources</div>
          <div className="text-xl font-semibold text-foreground">{totalResources}</div>
        </div>
      </div>

      {/* Department Cards */}
      {totalMissing > 0 ? (
        <div className="space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Issues by Department
          </h3>
          
          <div className="space-y-3">
            {departmentQuality.map((dept) => (
              <div 
                key={dept.department}
                className="bg-card border rounded-xl p-5 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="p-2.5 bg-slate-100 dark:bg-slate-800 rounded-xl">
                      <Building2 className="w-5 h-5 text-slate-500" />
                    </div>
                    <div>
                      <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
                        {dept.department.toUpperCase()} DEPARTMENT
                      </div>
                      <h4 className="text-lg font-bold text-foreground mb-1">
                        {dept.missingCount} Resources Missing Compensation Data
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        Cannot calculate budget. All CTC data needs entry.
                      </p>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => handleFixData(dept.department)}
                    className="flex items-center gap-1.5 text-sm font-semibold text-primary hover:text-primary/80 transition-colors"
                  >
                    Fix Data
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <CheckCircle2 className="w-16 h-16 text-emerald-500 mb-4" />
          <h3 className="text-xl font-semibold text-foreground mb-2">
            All Data is Complete
          </h3>
          <p className="text-muted-foreground max-w-md">
            All resources have their compensation data entered. Budget calculations are accurate.
          </p>
        </div>
      )}

      {/* Additional Quality Checks */}
      {data.dataQualityIssues && data.dataQualityIssues.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Other Data Quality Issues
          </h3>
          
          <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-xl p-5">
            <div className="grid grid-cols-2 gap-4">
              {data.dataQualityIssues.slice(0, 10).map((issue, idx) => (
                <div key={idx} className="flex items-start gap-2 text-sm">
                  <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                  <span className="text-slate-700 dark:text-slate-300">
                    <strong className="text-amber-700 dark:text-amber-400">{issue.name}</strong>
                    <span className="text-slate-500"> ({issue.department})</span>
                    <span className="text-slate-600 dark:text-slate-400"> — {issue.issue}</span>
                  </span>
                </div>
              ))}
            </div>
            
            {data.dataQualityIssues.length > 10 && (
              <div className="mt-4 pt-3 border-t border-amber-200 dark:border-amber-800">
                <span className="text-sm font-medium text-amber-700 dark:text-amber-400">
                  +{data.dataQualityIssues.length - 10} more issues
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
