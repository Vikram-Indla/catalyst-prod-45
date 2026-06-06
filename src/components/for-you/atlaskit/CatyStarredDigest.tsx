import React, { useCallback, useEffect, useState } from 'react';
import { token } from '@atlaskit/tokens';
import Lozenge from '@atlaskit/lozenge';
import { supabase } from '@/integrations/supabase/client';
import { CatyInsightCard } from './CatyInsightCard';

interface ChangedItem {
  issue_key: string;
  summary: string;
  status: string;
  status_category: string;
  updated_at: string;
}

interface CatyStarredDigestProps {
  starredKeys: string[];
  lastVisit?: string;
}

const CACHE_KEY = 'caty.starred-digest.lastVisit';

function getLastVisit(): string {
  const stored = localStorage.getItem(CACHE_KEY);
  if (stored) return stored;
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return yesterday.toISOString();
}

function setLastVisit() {
  localStorage.setItem(CACHE_KEY, new Date().toISOString());
}

export function CatyStarredDigest({ starredKeys, lastVisit }: CatyStarredDigestProps) {
  const [changes, setChanges] = useState<ChangedItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const fetchChanges = useCallback(async () => {
    if (starredKeys.length === 0) return;
    setIsLoading(true);
    try {
      const since = lastVisit ?? getLastVisit();
      const { data, error } = await supabase
        .from('ph_issues')
        .select('issue_key, summary, status, status_category, updated_at')
        .in('issue_key', starredKeys)
        .gte('updated_at', since)
        .order('updated_at', { ascending: false });

      if (!error && data) {
        setChanges(data as ChangedItem[]);
      }
    } finally {
      setIsLoading(false);
      setLastVisit();
    }
  }, [starredKeys, lastVisit]);

  useEffect(() => { fetchChanges(); }, [fetchChanges]);
  if (starredKeys.length === 0) {
    return (
      <div style={{
        padding: '8px 0',
        font: `400 13px/18px var(--ds-font-family-body, "Atlassian Sans"), ui-sans-serif, sans-serif`,
        color: token('color.text.subtlest', '#6B778C'),
      }}>
        Star some items to see what changed since your last visit.
      </div>
    );
  }

  if (!isLoading && changes.length === 0) return null;

  return (
    <CatyInsightCard
      title="What's changed"
      isLoading={isLoading}
      onRefresh={fetchChanges}
      onDismiss={() => { setChanges([]); }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <span style={{ color: token('color.text.subtle', '#44546F') }}>
          {changes.length} of your {starredKeys.length} starred items changed since your last visit.
        </span>
        {changes.map((item) => (
          <div key={item.issue_key} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '4px 0',
            borderBottom: `1px solid ${token('color.border', '#DFE1E6')}`,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
              <span style={{ font: `500 12px/16px var(--ds-font-family-code, monospace)`, color: token('color.link', '#0052CC'), flexShrink: 0 }}>
                {item.issue_key}
              </span>
              <span style={{
                font: `400 13px/18px var(--ds-font-family-body, "Atlassian Sans"), ui-sans-serif, sans-serif`,
                color: token('color.text', '#172B4D'),
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {item.summary}
              </span>
            </div>
            <Lozenge appearance="new">changed</Lozenge>
          </div>
        ))}
      </div>
    </CatyInsightCard>
  );
}
