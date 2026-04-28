/**
 * CatalystSeverityField — Inline-editable Severity field for Defect view.
 *
 * jira-compare Round 4 follow-up (2026-04-28): pairs with the
 * 20260428180000_jira_compare_severity_assessment_feature.sql migration
 * that adds ph_issues.severity (TEXT, nullable). Reads / writes the
 * column directly; UI affordance mirrors EditablePriority.
 *
 * Allowed values come from Jira's customfield_10125 schema:
 *   Blocker, High, Medium, Low.
 *   Source: Lane B getJiraIssueTypeMetaWithFields(BAU, 10012), 2026-04-28.
 *
 * Atlaskit primitives:
 *   - `@atlaskit/select` with appearance="subtle" + spacing="compact"
 *     so the row reads as editable text in the rail (matches Jira).
 *   - `@atlaskit/lozenge` for the value chip with severity-coloured
 *     appearance (matches the read-only render in CatalystDefectFields).
 */
import React from 'react';
import { useMutation } from '@tanstack/react-query';
import Select from '@atlaskit/select';
import Lozenge from '@atlaskit/lozenge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { PhIssue } from '../types';

interface Props {
  issue: PhIssue | null;
  onUpdate?: () => void;
}

const SEVERITY_VALUES = ['Blocker', 'High', 'Medium', 'Low'] as const;
type SeverityValue = (typeof SEVERITY_VALUES)[number];

/** Mirror the severityAppearance() switch in CatalystDefectFields.tsx. */
function severityAppearance(value: string): React.ComponentProps<typeof Lozenge>['appearance'] {
  switch (value) {
    case 'Blocker':
      return 'removed';
    case 'High':
      return 'moved';
    case 'Medium':
      return 'inprogress';
    case 'Low':
      return 'success';
    default:
      return 'default';
  }
}

export function CatalystSeverityField({ issue, onUpdate }: Props) {
  const current = ((issue as any)?.severity
    ?? (issue as any)?.raw_json?.fields?.customfield_10125?.value
    ?? null) as SeverityValue | null;

  const updateMutation = useMutation({
    mutationFn: async (value: string | null) => {
      if (!issue?.issue_key && !issue?.id) throw new Error('No issue identifier');
      const query = issue.issue_key
        ? supabase.from('ph_issues').update({ severity: value } as any).eq('issue_key', issue.issue_key)
        : supabase.from('ph_issues').update({ severity: value } as any).eq('id', issue.id);
      const { error } = await query;
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Severity updated');
      onUpdate?.();
    },
    onError: (e: any) => {
      const msg = e?.message ?? '';
      if (msg.includes('severity') || msg.includes('column')) {
        toast.info(
          'Severity column not yet in database. Run the migration ' +
          'supabase/migrations/20260428180000_jira_compare_severity_assessment_feature.sql.',
        );
      } else {
        toast.error(`Failed to save Severity: ${msg}`);
      }
    },
  });

  const options = SEVERITY_VALUES.map(v => ({ label: v, value: v }));
  const selected = current ? options.find(o => o.value === current) ?? null : null;

  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <Select<{ label: string; value: SeverityValue }>
        inputId={`severity-${issue?.issue_key ?? issue?.id ?? 'none'}`}
        appearance="subtle"
        spacing="compact"
        isSearchable={false}
        isClearable
        classNamePrefix="cv-severity-select"
        placeholder="None"
        options={options}
        value={selected}
        onChange={v => {
          const next = v?.value ?? null;
          if (next !== current) updateMutation.mutate(next);
        }}
        formatOptionLabel={opt => (
          <Lozenge appearance={severityAppearance(opt.value)}>{opt.label}</Lozenge>
        )}
      />
    </div>
  );
}

export default CatalystSeverityField;
