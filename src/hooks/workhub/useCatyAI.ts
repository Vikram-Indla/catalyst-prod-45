/**
 * Caty AI Hooks — Phase 10
 * useCatyInsights: Computes insights from real WorkHub data
 * useCatyChat: Manages chat state + simulated AI responses
 */

import { useState, useMemo, useCallback } from 'react';
import { useDashboardKPIs } from './useDashboardKPIs';
import { useReleaseProgress } from './useReleases';
import { useThemeProgress } from './useThemes';
import { useResourceUtilization } from './useResources';
import { useWorkItems } from './useWorkItems';
import { generateSimulatedResponse } from '@/lib/workhub/catyEngine';

export interface ActionItem {
  severity: 'high' | 'medium' | 'low';
  category: 'resources' | 'releases' | 'themes' | 'workitems';
  title: string;
  description: string;
  action: string;
  route: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

/**
 * Hook A: useCatyInsights
 * Computes insights from real WorkHub data
 */
export function useCatyInsights() {
  const { data: kpis } = useDashboardKPIs();
  const { data: releases } = useReleaseProgress();
  const { data: resources } = useResourceUtilization();
  const { data: themes } = useThemeProgress();

  const insights = useMemo(() => {
    if (!kpis || !releases || !resources || !themes) return null;

    const overUtilized = resources.filter((r: any) => r.utilization_percent > 80);
    const underUtilized = resources.filter((r: any) => r.utilization_percent < 40);
    const atRiskReleases = releases.filter((r: any) => r.status === 'At Risk');
    const overdueItems = kpis.overdue_items || 0;
    const blockedItems = kpis.blocked_items || 0;
    const lowProgressThemes = themes.filter((t: any) =>
      t.status === 'Active' && t.completion_percent < 20 && t.total_items > 0
    );

    const actionItems: ActionItem[] = [];

    // Generate action items based on data
    if (overUtilized.length > 0) {
      actionItems.push({
        severity: 'high',
        category: 'resources',
        title: `${overUtilized.length} team member${overUtilized.length > 1 ? 's' : ''} over-utilized`,
        description: `${overUtilized.map((r: any) => r.name).join(', ')} ${overUtilized.length > 1 ? 'are' : 'is'} above 80% capacity. Consider reassigning work items.`,
        action: 'View Resource 360',
        route: '/project-hub/resource360',
      });
    }

    if (atRiskReleases.length > 0) {
      atRiskReleases.forEach((r: any) => {
        actionItems.push({
          severity: 'high',
          category: 'releases',
          title: `${r.name} is at risk`,
          description: `${r.title} — ${r.completion_percent}% complete with ${r.blocked_items} blocked items.`,
          action: 'View Release',
          route: `/projecthub/releases/${r.id}`,
        });
      });
    }

    if (overdueItems > 0) {
      actionItems.push({
        severity: 'medium',
        category: 'workitems',
        title: `${overdueItems} overdue work items`,
        description: 'Items past their due date need attention or rescheduling.',
        action: 'View Work Items',
        route: '/projecthub/workitems',
      });
    }

    if (blockedItems > 0) {
      actionItems.push({
        severity: 'medium',
        category: 'workitems',
        title: `${blockedItems} blocked items`,
        description: 'Blocked items are stalling progress across releases.',
        action: 'View Blocked',
        route: '/projecthub/workitems?statuses=Blocked',
      });
    }

    if (underUtilized.length >= 3) {
      actionItems.push({
        severity: 'low',
        category: 'resources',
        title: `${underUtilized.length} members under-utilized`,
        description: `${underUtilized.slice(0, 3).map((r: any) => r.name).join(', ')} are below 40% capacity. They could take on more work.`,
        action: 'View Resource 360',
        route: '/project-hub/resource360',
      });
    }

    lowProgressThemes.forEach((t: any) => {
      actionItems.push({
        severity: 'low',
        category: 'themes',
        title: `${t.name} has low progress`,
        description: `Only ${t.completion_percent}% complete with ${t.total_items} items. May need more resources.`,
        action: 'View Theme',
        route: `/projecthub/themes/${t.id}`,
      });
    });

    return {
      summary: {
        completion: kpis.overall_completion_percent || 0,
        totalItems: kpis.total_work_items || 0,
        doneItems: kpis.done_work_items || 0,
        activeReleases: kpis.active_releases || 0,
        atRiskReleases: kpis.at_risk_releases || 0,
        activeThemes: kpis.active_themes || 0,
        teamSize: kpis.total_resources || 0,
        overUtilCount: overUtilized.length,
        underUtilCount: underUtilized.length,
        overdueItems,
        blockedItems,
        dueThisWeek: kpis.due_this_week || 0,
      },
      actionItems: actionItems.sort((a, b) => {
        const order = { high: 0, medium: 1, low: 2 };
        return order[a.severity] - order[b.severity];
      }),
    };
  }, [kpis, releases, resources, themes]);

  return { insights, isLoading: !kpis };
}

/**
 * Hook B: useCatyChat
 * Manages chat state + simulated AI responses
 */
export function useCatyChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const { insights } = useCatyInsights();
  const { data: kpis } = useDashboardKPIs();
  const { data: releases } = useReleaseProgress();
  const { data: resources } = useResourceUtilization();

  const sendMessage = useCallback(
    async (userMessage: string) => {
      // Add user message
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: 'user',
          content: userMessage,
          timestamp: new Date().toISOString(),
        },
      ]);

      setIsTyping(true);
      // Simulate AI thinking delay
      await new Promise((resolve) =>
        setTimeout(resolve, 800 + Math.random() * 1200)
      );

      // Generate response based on query + real data
      const response = generateSimulatedResponse(userMessage, {
        kpis,
        releases,
        resources,
        insights,
      });

      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: response,
          timestamp: new Date().toISOString(),
        },
      ]);
      setIsTyping(false);
    },
    [kpis, releases, resources, insights]
  );

  const clearChat = useCallback(() => setMessages([]), []);

  return { messages, isTyping, sendMessage, clearChat };
}
