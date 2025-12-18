import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Incident, SupportLevel, SeverityLevel, IncidentStatus } from '@/types/incident';
import { subDays, startOfDay, endOfDay, format, differenceInMinutes, differenceInHours } from 'date-fns';

export interface KPITile {
  label: string;
  value: number;
  breakdown?: string;
  delta?: number;
  deltaLabel?: string;
  filterUrl: string;
  color?: 'default' | 'critical' | 'warning' | 'success';
}

export interface MajorIncident {
  id: string;
  incident_key: string;
  title: string;
  severity: SeverityLevel;
  status: IncidentStatus;
  created_at: string;
  assignee_name?: string;
  sla_status: 'ok' | 'at_risk' | 'breached';
  hours_open: number;
}

export interface IncidentTrend {
  date: string;
  logged: number;
  closed: number;
  converted: number;
}

export interface SupportLevelDistribution {
  level: SupportLevel;
  count: number;
  percentage: number;
}

export interface CAPEffectiveness {
  averageApprovalTimeMinutes: number;
  oldestPendingDays?: number;
  oldestPendingId?: string;
  approved: number;
  rejected: number;
  vetoed: number;
}

export interface ReleaseImpact {
  releaseId: string;
  releaseVersion: string;
  releaseDate?: string;
  blocking: number;
  missingRelease: number;
  plannedDeployment: number;
  inTesting: number;
  withChangeNumber: number;
}

export interface CommandCenterData {
  kpis: KPITile[];
  majorIncidents: MajorIncident[];
  incidentTrends: IncidentTrend[];
  supportLevelDistribution: SupportLevelDistribution[];
  slaAtRisk: number;
  capEffectiveness: CAPEffectiveness;
  releaseImpacts: ReleaseImpact[];
}

export function useIncidentCommandCenter() {
  return useQuery({
    queryKey: ['incident-command-center'],
    queryFn: async (): Promise<CommandCenterData> => {
      const now = new Date();
      const weekAgo = subDays(now, 7);
      const twoWeeksAgo = subDays(now, 14);

      // Fetch all incidents for calculations
      const { data: incidents, error: incidentsError } = await supabase
        .from('incidents')
        .select(`
          *,
          release_version:release_versions(*),
          assignee:incident_user_profiles!incidents_assignee_id_fkey(*),
          sla:sla_records(*)
        `)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (incidentsError) throw incidentsError;

      // Fetch CAP committee data
      const { data: committees, error: committeesError } = await supabase
        .from('incident_committees')
        .select('*, votes:committee_votes(*)');

      if (committeesError) throw committeesError;

      // Cast incidents properly
      const allIncidents = (incidents || []).map(i => ({
        ...i,
        sla: Array.isArray(i.sla) ? i.sla[0] : i.sla,
      })) as Incident[];

      // Current week incidents
      const currentWeekIncidents = allIncidents.filter(i => 
        new Date(i.created_at) >= weekAgo
      );
      const lastWeekIncidents = allIncidents.filter(i => 
        new Date(i.created_at) >= twoWeeksAgo && new Date(i.created_at) < weekAgo
      );

      // KPI 1: Open Incidents by Support Level
      const openStatuses: IncidentStatus[] = ['open', 'triage', 'in_progress', 'to_committee'];
      const openIncidents = allIncidents.filter(i => openStatuses.includes(i.status));
      const l1Open = openIncidents.filter(i => i.support_level === 'L1').length;
      const l2Open = openIncidents.filter(i => i.support_level === 'L2').length;
      const l3Open = openIncidents.filter(i => i.support_level === 'L3').length;

      // KPI 2: Active Major Incidents
      const majorIncidentsActive = allIncidents.filter(i => 
        i.is_major_incident && openStatuses.includes(i.status)
      );

      // KPI 3: SLA Breaches
      const slaBreaches = allIncidents.filter(i => 
        i.sla && (i.sla.response_breached || i.sla.resolution_breached)
      );
      const responseBreaches = slaBreaches.filter(i => i.sla?.response_breached).length;
      const resolutionBreaches = slaBreaches.filter(i => i.sla?.resolution_breached).length;

      // KPI 4: Awaiting CAP Approval
      const awaitingCAP = allIncidents.filter(i => i.status === 'to_committee').length;

      // KPI 5: Converted to Change
      const converted = allIncidents.filter(i => i.status === 'converted');
      const convertedThisWeek = converted.filter(i => 
        i.converted_at && new Date(i.converted_at) >= weekAgo
      ).length;
      const convertedLastWeek = converted.filter(i => 
        i.converted_at && new Date(i.converted_at) >= twoWeeksAgo && new Date(i.converted_at) < weekAgo
      ).length;

      // KPI 6: Planned for Production (Next 7 Days)
      const next7Days = subDays(now, -7);
      const plannedForProd = allIncidents.filter(i => {
        if (!i.target_date) return false;
        const targetDate = new Date(i.target_date);
        return targetDate >= now && targetDate <= next7Days && i.delivery_stage !== 'prod';
      }).length;

      const kpis: KPITile[] = [
        {
          label: 'Open Incidents',
          value: openIncidents.length,
          breakdown: `L1: ${l1Open} / L2: ${l2Open} / L3: ${l3Open}`,
          delta: openIncidents.length - lastWeekIncidents.filter(i => openStatuses.includes(i.status)).length,
          deltaLabel: 'vs last week',
          filterUrl: '/release/incidents/list?status=open,triage,in_progress,to_committee',
          color: openIncidents.length > 20 ? 'warning' : 'default',
        },
        {
          label: 'Active Major Incidents',
          value: majorIncidentsActive.length,
          filterUrl: '/release/incidents/list?is_major=true&status=open,triage,in_progress',
          color: majorIncidentsActive.length > 0 ? 'critical' : 'success',
        },
        {
          label: 'SLA Breaches',
          value: slaBreaches.length,
          breakdown: `Response: ${responseBreaches} / Resolution: ${resolutionBreaches}`,
          filterUrl: '/release/incidents/list?sla_breached=true',
          color: slaBreaches.length > 0 ? 'critical' : 'success',
        },
        {
          label: 'Awaiting CAP Approval',
          value: awaitingCAP,
          filterUrl: '/release/incidents/list?status=to_committee',
          color: awaitingCAP > 5 ? 'warning' : 'default',
        },
        {
          label: 'Converted to Change',
          value: convertedThisWeek,
          delta: convertedThisWeek - convertedLastWeek,
          deltaLabel: 'vs last week',
          filterUrl: '/release/incidents/list?status=converted',
          color: 'success',
        },
        {
          label: 'Planned for Production',
          value: plannedForProd,
          breakdown: 'Next 7 days',
          filterUrl: '/release/incidents/list?deployment_planned=true',
          color: 'default',
        },
      ];

      // Major Incidents Spotlight
      const majorIncidentsData: MajorIncident[] = majorIncidentsActive.map(i => {
        const hoursOpen = differenceInHours(now, new Date(i.created_at));
        let slaStatus: 'ok' | 'at_risk' | 'breached' = 'ok';
        if (i.sla?.response_breached || i.sla?.resolution_breached) {
          slaStatus = 'breached';
        } else if (i.sla?.resolution_due_at) {
          const dueIn = differenceInMinutes(new Date(i.sla.resolution_due_at), now);
          if (dueIn < 60 && dueIn > 0) slaStatus = 'at_risk';
        }
        return {
          id: i.id,
          incident_key: i.incident_key,
          title: i.title,
          severity: i.severity,
          status: i.status,
          created_at: i.created_at,
          assignee_name: i.assignee?.full_name,
          sla_status: slaStatus,
          hours_open: hoursOpen,
        };
      });

      // Incident Trends (last 7 days)
      const incidentTrends: IncidentTrend[] = [];
      for (let i = 6; i >= 0; i--) {
        const date = subDays(now, i);
        const dayStart = startOfDay(date);
        const dayEnd = endOfDay(date);
        
        const logged = allIncidents.filter(inc => {
          const created = new Date(inc.created_at);
          return created >= dayStart && created <= dayEnd;
        }).length;
        
        const closed = allIncidents.filter(inc => {
          if (!inc.resolved_at) return false;
          const resolved = new Date(inc.resolved_at);
          return resolved >= dayStart && resolved <= dayEnd && inc.status === 'closed';
        }).length;
        
        const convertedDay = allIncidents.filter(inc => {
          if (!inc.converted_at) return false;
          const convertedDate = new Date(inc.converted_at);
          return convertedDate >= dayStart && convertedDate <= dayEnd;
        }).length;

        incidentTrends.push({
          date: format(date, 'MMM d'),
          logged,
          closed,
          converted: convertedDay,
        });
      }

      // Support Level Distribution
      const totalWithLevel = allIncidents.filter(i => i.support_level).length;
      const supportLevelDistribution: SupportLevelDistribution[] = (['L1', 'L2', 'L3'] as SupportLevel[]).map(level => {
        const count = allIncidents.filter(i => i.support_level === level).length;
        return {
          level,
          count,
          percentage: totalWithLevel > 0 ? Math.round((count / totalWithLevel) * 100) : 0,
        };
      });

      // SLA At Risk (near breach but not yet breached)
      const slaAtRisk = allIncidents.filter(i => {
        if (!i.sla || i.sla.response_breached || i.sla.resolution_breached) return false;
        if (i.sla.resolution_due_at) {
          const dueIn = differenceInMinutes(new Date(i.sla.resolution_due_at), now);
          return dueIn > 0 && dueIn < 60;
        }
        return false;
      }).length;

      // CAP Committee Effectiveness
      const completedCommittees = (committees || []).filter(c => 
        c.status === 'approved' || c.status === 'rejected'
      );
      const pendingCommittees = (committees || []).filter(c => c.status === 'pending');
      
      let avgApprovalTime = 0;
      if (completedCommittees.length > 0) {
        const totalMinutes = completedCommittees.reduce((sum, c) => {
          if (c.decided_at) {
            return sum + differenceInMinutes(new Date(c.decided_at), new Date(c.created_at));
          }
          return sum;
        }, 0);
        avgApprovalTime = Math.round(totalMinutes / completedCommittees.length);
      }

      let oldestPendingDays: number | undefined;
      let oldestPendingId: string | undefined;
      if (pendingCommittees.length > 0) {
        const sorted = pendingCommittees.sort((a, b) => 
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
        oldestPendingDays = Math.floor(differenceInHours(now, new Date(sorted[0].created_at)) / 24);
        oldestPendingId = sorted[0].incident_id;
      }

      const approved = completedCommittees.filter(c => c.status === 'approved').length;
      const rejected = completedCommittees.filter(c => c.status === 'rejected').length;
      const vetoed = (committees || []).flatMap(c => c.votes || []).filter(v => v.vote === 'vetoed').length;

      const capEffectiveness: CAPEffectiveness = {
        averageApprovalTimeMinutes: avgApprovalTime,
        oldestPendingDays,
        oldestPendingId,
        approved,
        rejected,
        vetoed,
      };

      // Release Impact
      const releaseMap = new Map<string, ReleaseImpact>();
      allIncidents.forEach(i => {
        if (i.release_version_id && i.release_version) {
          if (!releaseMap.has(i.release_version_id)) {
            releaseMap.set(i.release_version_id, {
              releaseId: i.release_version_id,
              releaseVersion: i.release_version.version,
              releaseDate: i.release_version.release_date,
              blocking: 0,
              missingRelease: 0,
              plannedDeployment: 0,
              inTesting: 0,
              withChangeNumber: 0,
            });
          }
          const impact = releaseMap.get(i.release_version_id)!;
          if (i.severity === 'SEV1' || i.severity === 'SEV2') impact.blocking++;
          if (i.delivery_stage === 'qa' || i.delivery_stage === 'stage') impact.inTesting++;
          // Placeholder for change_number field if exists
        }
      });

      // Count missing release assignment
      const missingRelease = openIncidents.filter(i => !i.release_version_id).length;

      const releaseImpacts = Array.from(releaseMap.values()).slice(0, 5);

      return {
        kpis,
        majorIncidents: majorIncidentsData,
        incidentTrends,
        supportLevelDistribution,
        slaAtRisk,
        capEffectiveness,
        releaseImpacts,
      };
    },
    refetchInterval: 60000, // Refresh every minute
  });
}
