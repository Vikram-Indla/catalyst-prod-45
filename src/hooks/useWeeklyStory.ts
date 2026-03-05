/**
 * useWeeklyStory — Assembles day-by-day events for the Weekly Story timeline
 * Data source: ph_issues changelog JSON + status fields
 * Week: Sunday → Thursday (Saudi work week)
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { getWeekStart, getWeekEnd, R360_WEEK_CONFIG } from '@/constants/r360WeekConfig';
import { useState, useCallback } from 'react';
import type { WeeklyStoryData, WeekDay, WeekDayEvent } from '@/components/resources/ai-intelligence/WeeklyStory';

function groupByWorkDay(items: any[], weekStart: Date): Map<number, any[]> {
  const groups = new Map<number, any[]>();
  R360_WEEK_CONFIG.workDays.forEach(d => groups.set(d, []));

  for (const item of items) {
    const date = new Date(item.jira_updated_at || item.jira_created_at);
    const dayOfWeek = date.getDay();
    if (R360_WEEK_CONFIG.workDays.includes(dayOfWeek as any)) {
      groups.get(dayOfWeek)!.push(item);
    }
  }
  return groups;
}

function getDayTag(dayIndex: number, dayCounts: Map<number, number>): 'first' | 'peak' | 'close' | 'quiet' | 'last' | undefined {
  if (dayIndex === 0) return 'first';
  if (dayIndex === 4) return 'last';

  const count = dayCounts.get(dayIndex) || 0;
  if (count === 0) return 'quiet';

  // Find peak day
  let maxCount = 0;
  let maxDay = 0;
  dayCounts.forEach((c, d) => { if (c > maxCount) { maxCount = c; maxDay = d; } });
  if (dayIndex === maxDay && maxCount > 0) return 'peak';

  return undefined;
}

export function useWeeklyStory(resourceId: string | undefined, jiraAccountId: string | null | undefined) {
  const [selectedDate, setSelectedDate] = useState(() => new Date());

  const weekStart = getWeekStart(selectedDate);
  const weekEnd = getWeekEnd(selectedDate);

  const { data, isLoading } = useQuery({
    queryKey: ['r360-weekly-story', resourceId, jiraAccountId, weekStart.toISOString()],
    queryFn: async (): Promise<WeeklyStoryData | null> => {
      if (!jiraAccountId) return null;

      // Get items updated this week
      const { data: weekItems, error } = await (supabase
        .from('ph_issues')
        .select('issue_key, summary, status, status_category, issue_type, jira_created_at, jira_updated_at')
        .eq('assignee_account_id', jiraAccountId)
        .gte('jira_updated_at', weekStart.toISOString())
        .lte('jira_updated_at', weekEnd.toISOString())
        .order('jira_updated_at', { ascending: true }) as any);

      if (error || !weekItems || weekItems.length === 0) return null;

      // Get backlog count as of Sunday 00:00
      const { count: backlogCount } = await (supabase
        .from('ph_issues')
        .select('id', { count: 'exact', head: true })
        .eq('assignee_account_id', jiraAccountId)
        .not('status_category', 'eq', 'Done')
        .not('status', 'in', '("Cancelled","Canceled")')
        .lt('jira_created_at', weekStart.toISOString()) as any);

      // Group items by work day
      const dayGroups = groupByWorkDay(weekItems, weekStart);

      // Count events per day for tag detection
      const dayCounts = new Map<number, number>();
      dayGroups.forEach((items, day) => dayCounts.set(day, items.length));

      // Build day structures
      const days: WeekDay[] = R360_WEEK_CONFIG.workDays.map(dayIndex => {
        const items = dayGroups.get(dayIndex) || [];
        const events: WeekDayEvent[] = items.map((item: any) => {
          const time = new Date(item.jira_updated_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Riyadh' });
          const statusBadge: 'progress' | 'done' | 'review' | undefined =
            item.status_category === 'Done' ? 'done' :
            item.status === 'In Review' || item.status === 'Review' ? 'review' :
            item.status_category === 'In Progress' ? 'progress' : undefined;

          return {
            time,
            text: `${item.summary}`,
            refs: [item.issue_key],
            statusBadge,
          };
        });

        return {
          dayIndex,
          events,
          tag: getDayTag(dayIndex, dayCounts),
        };
      });

      // Compute KPIs
      const closed = weekItems.filter((i: any) => i.status_category === 'Done').length;
      const inReview = weekItems.filter((i: any) => i.status === 'In Review' || i.status === 'Review').length;
      const pickedUp = weekItems.filter((i: any) => i.status_category === 'In Progress').length;
      const remaining = (backlogCount || 0) - closed;

      // Generate hook text
      const hook = backlogCount && backlogCount > 0
        ? `${backlogCount} items carried into the week — ${closed} found closure, ${remaining >= 0 ? remaining : 0} still waiting.`
        : `${weekItems.length} items touched this week — ${closed} closed, ${inReview} in review.`;

      return {
        contextTitle: hook,
        contextTitleAr: `${backlogCount || 0} عنصرًا دخلوا الأسبوع — ${closed} وجدوا الإغلاق، ${Math.max(remaining, 0)} لا يزالون في الانتظار.`,
        contextSubtitle: `${weekItems.length} status changes across ${days.filter(d => d.events.length > 0).length} work days`,
        contextSubtitleAr: `${weekItems.length} تغييرات حالة عبر ${days.filter(d => d.events.length > 0).length} أيام عمل`,
        backlogCount: backlogCount || 0,
        days,
        kpis: { pickedUp, closed, inReview, remaining: Math.max(remaining, 0) },
        hookEn: hook,
        hookAr: `${backlogCount || 0} عنصرًا — ${closed} أُغلِقَت`,
      };
    },
    enabled: !!resourceId && !!jiraAccountId,
    staleTime: 5 * 60 * 1000,
  });

  // Auto-skip empty weeks (up to 12)
  const navigateWeek = useCallback(async (direction: 'prev' | 'next') => {
    const step = direction === 'prev' ? -7 : 7;
    let candidate = new Date(selectedDate);

    for (let i = 0; i < 12; i++) {
      candidate = new Date(candidate.getTime() + step * 24 * 60 * 60 * 1000);
      const ws = getWeekStart(candidate);
      const we = getWeekEnd(candidate);

      if (!jiraAccountId) {
        setSelectedDate(candidate);
        return;
      }

      const { count } = await (supabase
        .from('ph_issues')
        .select('id', { count: 'exact', head: true })
        .eq('assignee_account_id', jiraAccountId)
        .gte('jira_updated_at', ws.toISOString())
        .lte('jira_updated_at', we.toISOString()) as any);

      if ((count || 0) > 0) {
        setSelectedDate(candidate);
        return;
      }
    }

    // If no week with data found within 12 weeks, just move one week
    setSelectedDate(new Date(selectedDate.getTime() + step * 24 * 60 * 60 * 1000));
  }, [selectedDate, jiraAccountId]);

  return {
    storyData: data,
    isLoading,
    selectedDate,
    onPrevWeek: () => navigateWeek('prev'),
    onNextWeek: () => navigateWeek('next'),
  };
}
