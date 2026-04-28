/**
 * CatalystAssessmentFeatureField — Inline-editable Assessment Feature field.
 *
 * jira-compare Round 4 follow-up (2026-04-28): pairs with the
 * 20260428180000_jira_compare_severity_assessment_feature.sql migration
 * that adds ph_issues.assessment_feature (TEXT, nullable).
 *
 * Universal across CatalystView* — Lane B confirmed Assessment Feature
 * (customfield_10288) on QA Bug, with cross-project usage on Incident /
 * Task per the digital-transformation tenant. Mounting universally next
 * to MDT Ref in CatalystSidebarDetails. If a row's Jira side has no
 * Assessment Feature value, the column is null and the rail shows the
 * "None" placeholder — no harm.
 *
 * Allowed values come from customfield_10288's project schema (30+ entries
 * including RCJY, MODON, NCEC, SIDF, Industrial License Issuance,
 * Upgrade to Establish, etc.). Source: Lane B
 * getJiraIssueTypeMetaWithFields(BAU, 10012), 2026-04-28.
 *
 * Atlaskit primitives:
 *   - `@atlaskit/select` with appearance="subtle", spacing="compact",
 *     and isSearchable=true (30+ options needs type-to-filter).
 */
import React from 'react';
import { useMutation } from '@tanstack/react-query';
import Select from '@atlaskit/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { PhIssue } from '../types';

interface Props {
  issue: PhIssue | null;
  onUpdate?: () => void;
}

/** Authoritative list from Lane B getJiraIssueTypeMetaWithFields(BAU, 10012). */
const ASSESSMENT_FEATURE_VALUES: ReadonlyArray<string> = [
  'RCJY',
  'MODON',
  'NCEC',
  'SIDF',
  'Other Forms',
  'Restricted Path',
  'Industrial License Issuance',
  'Industrial Consulting License',
  'Industrial Scan',
  'Upgrade to Establish',
  'Upgrade to Production',
  'Renew License',
  'Edit License',
  'Cancel License',
  'Transfer Ownership',
  'Customs Exemption',
  'Standard Incentive',
  'Service Provider',
  '4th Revolution - Factory',
  '4th Revolution - Grant',
  'Support Ticket',
  'Search',
  'Industrial Audit',
  'ICP',
  'Petrochemical availability',
  'Chemical',
  'Industrial Capabilities',
  'Translations',
  'OTHER',
  'Mobile',
  'User Management',
  'MIM Website',
];

export function CatalystAssessmentFeatureField({ issue, onUpdate }: Props) {
  const current = ((issue as any)?.assessment_feature
    ?? (issue as any)?.raw_json?.fields?.customfield_10288?.value
    ?? null) as string | null;

  const updateMutation = useMutation({
    mutationFn: async (value: string | null) => {
      if (!issue?.issue_key && !issue?.id) throw new Error('No issue identifier');
      const query = issue.issue_key
        ? supabase.from('ph_issues').update({ assessment_feature: value } as any).eq('issue_key', issue.issue_key)
        : supabase.from('ph_issues').update({ assessment_feature: value } as any).eq('id', issue.id);
      const { error } = await query;
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Assessment Feature updated');
      onUpdate?.();
    },
    onError: (e: any) => {
      const msg = e?.message ?? '';
      if (msg.includes('assessment_feature') || msg.includes('column')) {
        toast.info(
          'Assessment Feature column not yet in database. Run migration ' +
          'supabase/migrations/20260428180000_jira_compare_severity_assessment_feature.sql.',
        );
      } else {
        toast.error(`Failed to save Assessment Feature: ${msg}`);
      }
    },
  });

  const options = ASSESSMENT_FEATURE_VALUES.map(v => ({ label: v, value: v }));
  const selected = current ? options.find(o => o.value === current) ?? { label: current, value: current } : null;

  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <Select<{ label: string; value: string }>
        inputId={`assessment-feature-${issue?.issue_key ?? issue?.id ?? 'none'}`}
        appearance="subtle"
        spacing="compact"
        isSearchable
        isClearable
        classNamePrefix="cv-assessment-feature-select"
        placeholder="None"
        options={options}
        value={selected}
        onChange={v => {
          const next = v?.value ?? null;
          if (next !== current) updateMutation.mutate(next);
        }}
      />
    </div>
  );
}

export default CatalystAssessmentFeatureField;
