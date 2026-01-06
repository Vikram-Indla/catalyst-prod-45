/**
 * Reports Service - Handles report generation and persistence
 */

import { supabase } from '@/integrations/supabase/client';

export interface SavedReport {
  id: string;
  name: string;
  report_type: string;
  parameters: Record<string, any>;
  tags: string[];
  is_shared: boolean;
  owner_id: string;
  project_id?: string;
  created_at: string;
  updated_at: string;
}

export interface GeneratedReportData {
  reportType: string;
  generatedAt: string;
  parameters: Record<string, any>;
  data: any;
}

export const reportsService = {
  /**
   * Generate report data based on type and parameters
   */
  async generateReport(reportType: string, params: Record<string, any>): Promise<GeneratedReportData> {
    const generatedAt = new Date().toISOString();
    let data: any = {};

    switch (reportType) {
      case 'execution-summary': {
        const { data: cycle } = await supabase
          .from('tm_test_cycles')
          .select('*')
          .eq('id', params.cycle)
          .single();
        
        const { data: scopeItems } = await supabase
          .from('tm_cycle_scope')
          .select('*, tm_test_runs(*)')
          .eq('cycle_id', params.cycle);
        
        if (cycle && scopeItems) {
          const statusCounts: Record<string, number> = {};
          let totalRuns = 0;
          
          scopeItems.forEach((item: any) => {
            const status = item.current_status || 'not_run';
            statusCounts[status] = (statusCounts[status] || 0) + 1;
            totalRuns++;
          });
          
          const passedCount = statusCounts['passed'] || 0;
          const passRate = totalRuns > 0 ? (passedCount / totalRuns) * 100 : 0;
          const executedCount = totalRuns - (statusCounts['not_run'] || 0);
          const progress = totalRuns > 0 ? (executedCount / totalRuns) * 100 : 0;
          
          data = {
            cycle,
            totalRuns,
            statusCounts,
            passRate,
            progress
          };
        }
        break;
      }

      case 'execution-history': {
        const { data: runs } = await supabase
          .from('tm_test_runs')
          .select('*, tm_cycle_scope(*, tm_test_cases(*))')
          .eq('tm_cycle_scope.cycle_id', params.cycle)
          .order('executed_at', { ascending: false });
        
        data = { runs: runs || [] };
        
        if (params.includeDefects) {
          const { data: defects } = await supabase
            .from('defects')
            .select('*');
          data.defects = defects || [];
        }
        break;
      }

      case 'multi-cycle-summary': {
        const { data: cycles } = await supabase
          .from('tm_test_cycles')
          .select('*')
          .in('id', params.cycles);
        
        const cyclesWithStats = await Promise.all(
          (cycles || []).map(async (cycle: any) => {
            const { data: scopeItems } = await supabase
              .from('tm_cycle_scope')
              .select('current_status')
              .eq('cycle_id', cycle.id);
            
            const statusCounts: Record<string, number> = {};
            (scopeItems || []).forEach((item: any) => {
              const status = item.current_status || 'not_run';
              statusCounts[status] = (statusCounts[status] || 0) + 1;
            });
            
            const totalRuns = scopeItems?.length || 0;
            const passedCount = statusCounts['passed'] || 0;
            
            return {
              ...cycle,
              totalRuns,
              statusCounts,
              passRate: totalRuns > 0 ? (passedCount / totalRuns) * 100 : 0
            };
          })
        );
        
        data = { cycles: cyclesWithStats };
        break;
      }

      case 'case-distribution': {
        let query = supabase.from('tm_test_cases').select('*');
        
        if (params.folders && params.folders !== 'all') {
          query = query.eq('folder_id', params.folders);
        }
        if (params.priority && params.priority !== 'all') {
          query = query.eq('priority_id', params.priority);
        }
        if (params.status && params.status !== 'all') {
          query = query.eq('status', params.status);
        }
        if (params.dateRange_from) {
          query = query.gte('created_at', params.dateRange_from);
        }
        if (params.dateRange_to) {
          query = query.lte('created_at', params.dateRange_to);
        }
        
        const { data: cases } = await query;
        
        const byPriority = (cases || []).reduce((acc: any, c: any) => {
          const priority = c.priority_id || 'unset';
          acc[priority] = (acc[priority] || 0) + 1;
          return acc;
        }, {});
        
        const byStatus = (cases || []).reduce((acc: any, c: any) => {
          acc[c.status || 'draft'] = (acc[c.status || 'draft'] || 0) + 1;
          return acc;
        }, {});
        
        const byType = (cases || []).reduce((acc: any, c: any) => {
          acc[c.case_type || 'functional'] = (acc[c.case_type || 'functional'] || 0) + 1;
          return acc;
        }, {});
        
        data = {
          totalCases: (cases || []).length,
          byPriority,
          byStatus,
          byType,
          cases: cases || []
        };
        break;
      }

      case 'defect-impact': {
        let defectsQuery = supabase.from('defects').select('*');
        
        if (params.defects?.length > 0) {
          defectsQuery = defectsQuery.in('id', params.defects);
        }
        
        const { data: defects } = await defectsQuery;
        
        data = {
          defects: defects || [],
          totalDefects: (defects || []).length,
          bySeverity: (defects || []).reduce((acc: any, d: any) => {
            acc[d.severity || 'medium'] = (acc[d.severity || 'medium'] || 0) + 1;
            return acc;
          }, {}),
          byStatus: (defects || []).reduce((acc: any, d: any) => {
            acc[d.status || 'open'] = (acc[d.status || 'open'] || 0) + 1;
            return acc;
          }, {}),
          affectedCases: [...new Set((defects || []).map((d: any) => d.test_case_id).filter(Boolean))].length
        };
        break;
      }

      case 'defect-trend': {
        const { data: defects } = await supabase
          .from('defects')
          .select('*')
          .order('created_at', { ascending: true });
        
        const byDate = (defects || []).reduce((acc: any, d: any) => {
          const date = d.created_at?.split('T')[0] || 'unknown';
          if (!acc[date]) acc[date] = { new: 0, resolved: 0, open: 0 };
          acc[date].new++;
          if (d.status === 'closed' || d.status === 'resolved') {
            acc[date].resolved++;
          } else {
            acc[date].open++;
          }
          return acc;
        }, {});
        
        data = {
          defects: defects || [],
          trend: Object.entries(byDate).map(([date, counts]) => ({ date, ...(counts as any) }))
        };
        break;
      }

      case 'project-metrics': {
        const { data: cases } = await supabase.from('tm_test_cases').select('id, status, priority_id');
        const { data: cycles } = await supabase.from('tm_test_cycles').select('id, status');
        const { data: runs } = await supabase.from('tm_test_runs').select('id, status');
        const { data: defects } = await supabase.from('defects').select('id, status, severity');
        
        const passedRuns = (runs || []).filter((r: any) => r.status === 'passed').length;
        const totalRuns = (runs || []).length;
        
        data = {
          totalCases: (cases || []).length,
          totalCycles: (cycles || []).length,
          totalExecutions: totalRuns,
          totalDefects: (defects || []).length,
          passRate: totalRuns > 0 ? (passedRuns / totalRuns) * 100 : 0,
          openDefects: (defects || []).filter((d: any) => d.status === 'open').length,
          casesByStatus: (cases || []).reduce((acc: any, c: any) => {
            acc[c.status || 'draft'] = (acc[c.status || 'draft'] || 0) + 1;
            return acc;
          }, {}),
          defectsBySeverity: (defects || []).reduce((acc: any, d: any) => {
            acc[d.severity || 'medium'] = (acc[d.severity || 'medium'] || 0) + 1;
            return acc;
          }, {})
        };
        break;
      }

      case 'traceability-summary':
      case 'traceability-detail': {
        const { data: requirements } = await supabase
          .from('requirements')
          .select('*')
          .limit(100);
        
        const { data: links } = await supabase
          .from('tm_test_case_requirements')
          .select('*, tm_test_cases(*)')
          .limit(500);
        
        const reqCoverage = (requirements || []).map((req: any) => {
          const linkedCases = (links || []).filter((l: any) => l.requirement_id === req.id);
          return {
            ...req,
            linkedCasesCount: linkedCases.length,
            coverage: linkedCases.length > 0 ? 'covered' : 'uncovered'
          };
        });
        
        data = {
          requirements: reqCoverage,
          totalRequirements: (requirements || []).length,
          coveredCount: reqCoverage.filter((r: any) => r.coverage === 'covered').length,
          uncoveredCount: reqCoverage.filter((r: any) => r.coverage === 'uncovered').length,
          coveragePercentage: (requirements || []).length > 0 
            ? (reqCoverage.filter((r: any) => r.coverage === 'covered').length / (requirements || []).length) * 100 
            : 0
        };
        break;
      }

      default:
        // Generic fallback - fetch basic stats
        const { count: casesCount } = await supabase.from('tm_test_cases').select('*', { count: 'exact', head: true });
        const { count: cyclesCount } = await supabase.from('tm_test_cycles').select('*', { count: 'exact', head: true });
        const { count: runsCount } = await supabase.from('tm_test_runs').select('*', { count: 'exact', head: true });
        
        data = {
          totalCases: casesCount || 0,
          totalCycles: cyclesCount || 0,
          totalRuns: runsCount || 0
        };
    }

    return {
      reportType,
      generatedAt,
      parameters: params,
      data
    };
  },

  /**
   * Save a report
   */
  async saveReport(name: string, reportType: string, parameters: Record<string, any>, tags: string[] = []): Promise<SavedReport> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('tm_saved_reports')
      .insert({
        name,
        report_type: reportType,
        parameters,
        tags,
        is_shared: false,
        owner_id: user.id
      })
      .select()
      .single();
    
    if (error) throw error;
    return data as SavedReport;
  },

  /**
   * Get saved reports
   */
  async getSavedReports(): Promise<SavedReport[]> {
    const { data, error } = await supabase
      .from('tm_saved_reports')
      .select('*')
      .order('updated_at', { ascending: false });
    
    if (error) throw error;
    return (data || []) as SavedReport[];
  },

  /**
   * Delete a saved report
   */
  async deleteReport(id: string): Promise<void> {
    const { error } = await supabase
      .from('tm_saved_reports')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },

  /**
   * Share a report
   */
  async shareReport(id: string, isShared: boolean): Promise<void> {
    const { error } = await supabase
      .from('tm_saved_reports')
      .update({ is_shared: isShared })
      .eq('id', id);
    
    if (error) throw error;
  }
};
