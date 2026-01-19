/**
 * Hook: useMilestones
 * Fetches upcoming release milestones
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Milestone, MilestoneUrgency } from '../types';
import { differenceInDays, format, parseISO } from 'date-fns';

function calculateUrgency(daysRemaining: number): MilestoneUrgency {
  if (daysRemaining <= 0) return 'today';
  if (daysRemaining <= 1) return 'danger';
  if (daysRemaining <= 5) return 'warning';
  return 'normal';
}

export function useMilestones(limit: number = 5) {
  return useQuery({
    queryKey: ['command-center-milestones', limit],
    queryFn: async (): Promise<Milestone[]> => {
      const today = new Date();
      
      // Fetch upcoming releases with target dates
      const { data: releases } = await supabase
        .from('releases')
        .select('id, name, version, target_date, status')
        .gte('target_date', today.toISOString())
        .order('target_date', { ascending: true })
        .limit(limit * 2); // Fetch more to generate multiple milestones per release

      const milestones: Milestone[] = [];

      releases?.forEach(release => {
        if (!release.target_date) return;

        const targetDate = parseISO(release.target_date);
        const daysRemaining = differenceInDays(targetDate, today);

        // Code Freeze (7 days before target)
        if (daysRemaining >= 7) {
          const freezeDate = new Date(targetDate);
          freezeDate.setDate(freezeDate.getDate() - 7);
          const freezeDays = differenceInDays(freezeDate, today);
          
          if (freezeDays >= 0) {
            milestones.push({
              id: `${release.id}-freeze`,
              title: `${release.name} Code Freeze`,
              dueDate: format(freezeDate, 'yyyy-MM-dd'),
              daysRemaining: freezeDays,
              urgency: calculateUrgency(freezeDays),
              related: release.name,
              releaseId: release.id,
            });
          }
        }

        // UAT Complete (3 days before target)
        if (daysRemaining >= 3) {
          const uatDate = new Date(targetDate);
          uatDate.setDate(uatDate.getDate() - 3);
          const uatDays = differenceInDays(uatDate, today);
          
          if (uatDays >= 0) {
            milestones.push({
              id: `${release.id}-uat`,
              title: `${release.name} UAT Complete`,
              dueDate: format(uatDate, 'yyyy-MM-dd'),
              daysRemaining: uatDays,
              urgency: calculateUrgency(uatDays),
              related: release.name,
              releaseId: release.id,
            });
          }
        }

        // Release Date
        milestones.push({
          id: `${release.id}-release`,
          title: `${release.name} Deployment`,
          dueDate: release.target_date,
          daysRemaining,
          urgency: calculateUrgency(daysRemaining),
          related: release.name,
          releaseId: release.id,
        });
      });

      // Sort by days remaining and limit
      return milestones
        .sort((a, b) => a.daysRemaining - b.daysRemaining)
        .slice(0, limit);
    },
    refetchInterval: 300000, // Refresh every 5 minutes
    staleTime: 120000,
  });
}
