/**
 * RequestLinkedItemsTab — thin wrapper around the canonical
 * LinkedWorkItemsSection, scoped to the request's display key
 * (e.g. MIM-001, MDT-746). Provides a custom loadOptions that
 * surfaces Epics (catalyst_issues + ph_issues) and Projects.
 */
import React, { useCallback } from 'react';
import { LinkedWorkItemsSection } from '@/modules/project-work-hub/components/linked-work-items/LinkedWorkItemsSection';
import { supabase } from '@/integrations/supabase/client';

interface PickerOption {
  value: string;
  label: string;
  summary: string;
  issue_type?: string;
}

interface RequestLinkedItemsTabProps {
  request: {
    id: string;
    initiative_key: string;
  };
}

export const RequestLinkedItemsTab: React.FC<RequestLinkedItemsTabProps> = ({ request }) => {
  const loadOptions = useCallback(async (input: string): Promise<PickerOption[]> => {
    const q = input.trim();
    const like = q ? `%${q}%` : '%';
    const keyLike = q ? `${q}%` : '%';

    // Picker only surfaces Epics. Projects were removed (Apr 2026) — they
    // had no rendering consumer in any detail view, so linking to a Project
    // produced an orphan row. Re-add only when a Project surface consumes
    // ph_issue_links.
    const [epicsCatRes, epicsPhRes] = await Promise.all([
      supabase
        .from('catalyst_issues')
        .select('issue_key, title, issue_type')
        .eq('issue_type', 'Epic')
        .or(`issue_key.ilike.${keyLike},title.ilike.${like}`)
        .limit(15),
      supabase
        .from('ph_issues')
        .select('issue_key, summary, issue_type')
        .eq('issue_type', 'Epic')
        .is('jira_removed_at', null)
        .or(`issue_key.ilike.${keyLike},summary.ilike.${like}`)
        .limit(10),
    ]);

    const epicsCat: PickerOption[] = (epicsCatRes.data ?? []).map((r: any) => ({
      value: r.issue_key,
      label: `${r.issue_key} ${r.title}`,
      summary: r.title,
      issue_type: 'Epic',
    }));
    const seen = new Set(epicsCat.map((o) => o.value));
    const epicsPh: PickerOption[] = (epicsPhRes.data ?? [])
      .filter((r: any) => r.issue_key && !seen.has(r.issue_key))
      .map((r: any) => ({
        value: r.issue_key,
        label: `${r.issue_key} ${r.summary}`,
        summary: r.summary,
        issue_type: 'Epic',
      }));

    return [...epicsCat, ...epicsPh];
  }, []);

  if (!request?.initiative_key) {
    return (
      <div style={{ padding: 24, color: 'var(--ds-text-subtlest, #64748B)', fontSize: 13 }}>
        Linked items are unavailable for this request.
      </div>
    );
  }

  return (
    <div style={{ padding: '8px 4px' }}>
      <LinkedWorkItemsSection
        issueId={request.id}
        issueKey={request.initiative_key}
        loadOptionsOverride={loadOptions}
      />
    </div>
  );
};

export default RequestLinkedItemsTab;
