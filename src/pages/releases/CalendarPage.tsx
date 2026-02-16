/**
 * Release Calendar Page
 * Route: /releases/calendar
 */

import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ReleaseCalendar, CalendarRelease } from '@/features/release-calendar';
import { useAllReleases } from '@/hooks/releases/useAllReleases';
import { Loader2 } from 'lucide-react';
import { subDays } from 'date-fns';

// Transform database releases to calendar format
function transformToCalendarRelease(r: any, index: number): CalendarRelease {
  const passRate = r.test_cases_total > 0 
    ? (r.test_cases_passed / r.test_cases_total) * 100 
    : 100;
  
  const healthScore = Math.round(
    (passRate * 0.4) + 
    ((r.coverage_percent || 0) * 0.3) + 
    (Math.max(0, 100 - (r.defects_open || 0) * 10) * 0.3)
  );

  const healthLevel = healthScore >= 85 ? 'healthy' 
    : healthScore >= 70 ? 'attention' 
    : healthScore >= 50 ? 'at_risk' 
    : 'critical';

  const targetDate = r.target_date ? new Date(r.target_date) : new Date();
  const startDate = r.start_date ? new Date(r.start_date) : subDays(targetDate, 30);

  // Only include milestones if release has actual dates
  const milestones = r.target_date ? [
    {
      id: `${r.id}-gl`,
      type: 'go_live' as const,
      name: 'Go Live',
      date: targetDate.toISOString(),
      status: (r.status === 'released' ? 'complete' : 'pending') as 'complete' | 'pending',
    },
  ] : [];

  return {
    id: r.id,
    version: r.version || `v${index + 1}.0`,
    name: r.name,
    status: r.status === 'active' ? 'in_progress' : r.status === 'uat' ? 'testing' : r.status,
    startDate: startDate.toISOString(),
    targetDate: targetDate.toISOString(),
    actualDate: r.release_date,
    healthScore,
    healthLevel,
    progress: r.progress ?? r.readiness_pct ?? 0,
    milestones,
    row: 0,
    extendsLeft: false,
    extendsRight: false,
  };
}

export default function CalendarPage() {
  const navigate = useNavigate();
  
  const { data, isLoading } = useAllReleases({
    filter: { status: [], health: [], search: '' },
    sort: { column: 'name', direction: 'asc' },
    page: 0,
    pageSize: 50,
  });

  const calendarReleases = useMemo(() => {
    if (!data?.releases) return [];
    return data.releases.map(transformToCalendarRelease);
  }, [data?.releases]);

  const handleReleaseClick = (release: CalendarRelease) => {
    navigate(`/releases/all?selected=${release.id}`);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center" style={{ height: 'calc(100vh - 52px)' }}>
        <Loader2 className="w-8 h-8 animate-spin text-[#2563eb]" />
      </div>
    );
  }

  return (
    <div style={{ height: 'calc(100vh - 52px)', overflow: 'hidden' }}>
      <ReleaseCalendar 
        releases={calendarReleases} 
        onReleaseClick={handleReleaseClick}
      />
    </div>
  );
}
