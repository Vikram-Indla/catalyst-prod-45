import React, { useCallback, useEffect, useState } from 'react';
import { token } from '@atlaskit/tokens';
import Button from '@atlaskit/button/new';
import { supabase } from '@/integrations/supabase/client';
import { CatyInsightCard } from './CatyInsightCard';
import type { WorkItem } from '@/hooks/useForYouData';

interface CatyMorningBriefProps {
  items: WorkItem[];
}

const CACHE_KEY_PREFIX = 'caty.morning-brief';

function todayKey(): string {
  return `${CACHE_KEY_PREFIX}.${new Date().toISOString().slice(0, 10)}`;
}

function getCachedBrief(): string | null {
  return localStorage.getItem(todayKey());
}

function cacheBrief(text: string) {
  localStorage.setItem(todayKey(), text);
}

export function CatyMorningBrief({ items }: CatyMorningBriefProps) {
  const [brief, setBrief] = useState<string | null>(getCachedBrief);
  const [isLoading, setIsLoading] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const generateBrief = useCallback(async () => {
    if (items.length === 0) return;
    setIsLoading(true);
    try {
      const statusGroups: Record<string, number> = {};
      let dueSoonCount = 0;
      let staleCount = 0;
      const now = Date.now();
      const weekMs = 7 * 86_400_000;

      for (const item of items) {
        const cat = item.statusCategory || 'unknown';
        statusGroups[cat] = (statusGroups[cat] || 0) + 1;
        if (item.dueDate && new Date(item.dueDate).getTime() - now < weekMs) dueSoonCount++;
        if (item.updatedAt && now - new Date(item.updatedAt).getTime() > 21 * 86_400_000) staleCount++;
      }

      const context = JSON.stringify({
        totalItems: items.length,
        statusGroups,
        dueSoonCount,
        staleCount,
        topItems: items.slice(0, 5).map(i => ({
          key: i.jiraKey || i.id,
          summary: i.summary,
          status: i.status,
          priority: i.priority,
          dueDate: i.dueDate,
        })),
      });

      const { data, error } = await supabase.functions.invoke('ai-digest', {
        body: { mode: 'morning-brief', context },
      });

      if (!error && data?.brief) {
        setBrief(data.brief);
        cacheBrief(data.brief);
      }
    } finally {
      setIsLoading(false);
    }
  }, [items]);

  useEffect(() => {
    if (!getCachedBrief() && items.length > 0) {
      generateBrief();
    }
  }, [generateBrief, items.length]);

  if (dismissed) return null;

  if (items.length === 0) {
    return (
      <CatyInsightCard title="Caty's brief">
        <span style={{ color: token('color.text.subtlest', '#6B778C') }}>
          You have no assigned items to brief on.
        </span>
      </CatyInsightCard>
    );
  }

  return (
    <CatyInsightCard
      title="Caty's brief"
      isLoading={isLoading}
      onRefresh={generateBrief}
      onDismiss={() => setDismissed(true)}
    >
      {brief ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <p style={{ margin: 0, color: token('color.text', '#172B4D') }}>{brief}</p>
        </div>
      ) : (
        <span style={{ color: token('color.text.subtlest', '#6B778C') }}>
          Generating your morning brief...
        </span>
      )}
    </CatyInsightCard>
  );
}
