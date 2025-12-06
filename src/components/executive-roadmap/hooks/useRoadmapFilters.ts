import { useState, useMemo, useCallback } from 'react';
import { RoadmapRequest, ProcessStage, SortField, SortOrder, Language } from '../types';

export function useRoadmapFilters(requests: RoadmapRequest[] | undefined) {
  const [platform, setPlatform] = useState<string>('all');
  const [status, setStatus] = useState<string>('all');
  const [owner, setOwner] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('rank');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [language, setLanguage] = useState<Language>('en');

  // Get unique owners for dropdown
  const uniqueOwners = useMemo(() => {
    if (!requests) return [];
    const owners = new Set(requests.map(r => r.owner));
    return Array.from(owners).sort();
  }, [requests]);

  // Filter and sort data
  const filteredData = useMemo(() => {
    if (!requests) return [];
    
    let filtered = [...requests];

    // Platform filter
    if (platform !== 'all') {
      filtered = filtered.filter(r => r.platform === platform);
    }

    // Status filter
    if (status !== 'all') {
      filtered = filtered.filter(r => r.stage === parseInt(status));
    }

    // Owner filter
    if (owner !== 'all') {
      filtered = filtered.filter(r => r.owner === owner);
    }

    // Sorting
    filtered.sort((a, b) => {
      let valA: any, valB: any;

      switch (sortField) {
        case 'rank':
          valA = a.rank;
          valB = b.rank;
          break;
        case 'platform':
          valA = a.platformName;
          valB = b.platformName;
          break;
        case 'submission':
          valA = new Date(a.submission).getTime();
          valB = new Date(b.submission).getTime();
          break;
        case 'score':
          valA = a.score;
          valB = b.score;
          break;
        case 'target':
          valA = a.target ? new Date(a.target).getTime() : 0;
          valB = b.target ? new Date(b.target).getTime() : 0;
          break;
        case 'quarter':
          valA = a.quarter;
          valB = b.quarter;
          break;
        case 'owner':
          valA = a.owner;
          valB = b.owner;
          break;
        default:
          valA = a.rank;
          valB = b.rank;
      }

      const comparison = valA < valB ? -1 : valA > valB ? 1 : 0;
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [requests, platform, status, owner, sortField, sortOrder]);

  // KPI counts by stage
  const stageCounts = useMemo(() => {
    const counts: Record<ProcessStage, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    
    // Apply platform and owner filters but not status filter for KPI counts
    let filtered = requests || [];
    if (platform !== 'all') {
      filtered = filtered.filter(r => r.platform === platform);
    }
    if (owner !== 'all') {
      filtered = filtered.filter(r => r.owner === owner);
    }
    
    filtered.forEach(r => {
      if (counts[r.stage] !== undefined) {
        counts[r.stage]++;
      }
    });
    
    return counts;
  }, [requests, platform, owner]);

  const handleKPIClick = useCallback((stage: ProcessStage) => {
    // Toggle filter: if already filtering by this stage, clear it
    setStatus(prev => prev === String(stage) ? 'all' : String(stage));
  }, []);

  return {
    platform,
    setPlatform,
    status,
    setStatus,
    owner,
    setOwner,
    sortField,
    setSortField,
    sortOrder,
    setSortOrder,
    language,
    setLanguage,
    uniqueOwners,
    filteredData,
    stageCounts,
    handleKPIClick,
  };
}
