/**
 * InitiativeLinkedItemsTab — thin wrapper around the canonical
 * LinkedWorkItemsSection, scoped to the initiative's display key
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

interface InitiativeLinkedItemsTabProps {
  initiative: {
    id: string;
    initiative_key: string;
  };
}

export const InitiativeLinkedItemsTab: React.FC<InitiativeLinkedItemsTabProps> = ({ initiative }) => {
  const loadOptions = useCallback(async (input: string): Promise<PickerOption[]> => {
    const q = input.trim();
    const like = q ? `%${q}%` : '%';
    const keyLike = q ? `${q}%` : '%';

    const [epicsCatRes, epicsPhRes, projectsRes] = await Promise.all([
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
      supabase
        .from('projects')
        .select('id, name, key')
        .or(`key.ilike.${keyLike},name.ilike.${like}`)
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
    const projects: PickerOption[] = (projectsRes.data ?? []).map((r: any) => ({
      value: r.key || r.id,
      label: `${r.key} ${r.name}`,
      summary: r.name,
      issue_type: 'Project',
    }));

    return [...epicsCat, ...epicsPh, ...projects];
  }, []);

  if (!initiative?.initiative_key) {
    return (
      <div style={{ padding: 24, color: '#64748B', fontSize: 13 }}>
        Linked items are unavailable for this initiative.
      </div>
    );
  }

  return (
    <div style={{ padding: '8px 4px' }}>
      <LinkedWorkItemsSection
        issueId={initiative.id}
        issueKey={initiative.initiative_key}
        loadOptionsOverride={loadOptions}
      />
    </div>
  );
};

export default InitiativeLinkedItemsTab;
