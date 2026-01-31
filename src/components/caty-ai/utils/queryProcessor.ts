/**
 * CATY AI V7 — Query Processor
 */

import { ResourceWithUtilization, ContractExpiring, OffshoreTeam } from '../types/database';
import { CatyStats } from '../hooks/useCatyStats';
import {
  generateUtilizationResponse,
  generateContractsResponse,
  generateOffshoreResponse,
  generateOnsiteResponse,
  generateFallback,
} from './responseGenerator';

interface ProcessParams {
  query: string;
  departmentName: string;
  resources: ResourceWithUtilization[];
  contracts: ContractExpiring[];
  offshoreTeams: OffshoreTeam[];
  stats: CatyStats;
}

export const processQuery = ({
  query,
  departmentName,
  resources,
  contracts,
  offshoreTeams,
  stats,
}: ProcessParams): string => {
  const q = query.toLowerCase();
  
  // Utilization queries
  if (q.includes('utilization') || q.includes('utilized') || q.includes('capacity')) {
    if (q.includes('over') || q.includes('90') || q.includes('100')) {
      const over = resources.filter(r => r.current_utilization >= 90);
      return generateUtilizationResponse(
        over,
        { ...stats, totalResources: over.length },
        departmentName
      );
    }
    return generateUtilizationResponse(resources, stats, departmentName);
  }
  
  // Contract/expiring queries
  if (q.includes('contract') || q.includes('expir') || q.includes('ending')) {
    return generateContractsResponse(contracts, departmentName);
  }
  
  // On-site queries
  if (q.includes('on-site') || q.includes('onsite') || q.includes('on site')) {
    return generateOnsiteResponse(resources, stats, departmentName);
  }
  
  // Off-shore/remote queries
  if (q.includes('off-shore') || q.includes('offshore') || q.includes('off shore') || q.includes('remote')) {
    return generateOffshoreResponse(offshoreTeams, departmentName);
  }
  
  // Available/bench queries
  if (q.includes('available') || q.includes('unassigned') || q.includes('bench')) {
    const avail = resources.filter(r => r.current_utilization < 30);
    return generateUtilizationResponse(
      avail,
      {
        ...stats,
        totalResources: avail.length,
        avgUtilization: avail.length > 0
          ? Math.round(avail.reduce((s, r) => s + r.current_utilization, 0) / avail.length)
          : 0,
      },
      departmentName
    );
  }
  
  // Fallback
  return generateFallback();
};
