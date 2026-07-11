/**
 * CatalystSeverityField — Inline-editable Severity field.
 *
 * Uses @atlaskit/select with transparent idle-state CSS override,
 * matching the EditableAssignee/EditableReporter pattern in EditableFields.tsx.
 *
 * Allowed values from Jira customfield_10125: Blocker, High, Medium, Low.
 */
import React, { useEffect } from 'react';
import Select from '@atlaskit/select';
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { PhIssue } from '../types';
import { useClearableOnOpen } from '@/hooks/useClearableOnOpen';

function injectCSS() {
  if (document.getElementById('cv-severity-select-idle-style')) return;
  const s = document.createElement('style');
  s.id = 'cv-severity-select-idle-style';
  s.textContent = `
    .cv-severity-select__dropdown-indicator { display: none !important; }
    .cv-severity-select__control:hover .cv-severity-select__dropdown-indicator,
    .cv-severity-select__control--is-focused .cv-severity-select__dropdown-indicator,
    .cv-severity-select__control--menu-is-open .cv-severity-select__dropdown-indicator { display: flex !important; }
    .cv-severity-select__control { border-color: transparent !important; background: transparent !important; box-shadow: none !important; }
    .cv-severity-select__control:hover { background: var(--ds-background-neutral-subtle-hovered) !important; }
  `;
  document.head.appendChild(s);
}

const SEVERITY_OPTIONS = ['Blocker', 'High', 'Medium', 'Low'].map(v => ({ label: v, value: v }));

interface Props {
  issue: PhIssue | null;
  onUpdate?: () => void;
}

export function CatalystSeverityField({ issue, onUpdate }: Props) {
  useEffect(() => { injectCSS(); }, []);

  const clearableState = useClearableOnOpen();

  const current = ((issue as any)?.severity
    ?? (issue as any)?.raw_json?.fields?.customfield_10125?.value
    ?? null) as string | null;

  const updateMutation = useMutation({
    mutationFn: async (value: string | null) => {
      if (!issue?.issue_key && !issue?.id) throw new Error('No issue identifier');
      const query = issue.issue_key
        ? supabase.from('ph_issues').update({ severity: value } as any).eq('issue_key', issue.issue_key)
        : supabase.from('ph_issues').update({ severity: value } as any).eq('id', issue.id);
      const { error } = await query;
      if (error) throw error;
    },
    onSuccess: () => { onUpdate?.(); },
  });

  return (
    <Select
      classNamePrefix="cv-severity-select"
      options={SEVERITY_OPTIONS}
      value={current ? { label: current, value: current } : null}
      isClearable={clearableState.isClearable}
      placeholder="None"
      isDisabled={updateMutation.isPending}
      onChange={(opt) => updateMutation.mutate((opt as { value: string } | null)?.value ?? null)}
      onMenuOpen={clearableState.onMenuOpen}
      onMenuClose={clearableState.onMenuClose}
      menuPortalTarget={document.body}
      menuPosition="fixed"
      styles={{
        menuPortal: (base) => ({ ...base, zIndex: 9999 }),
        menu: (base) => ({ ...base, fontSize: 'var(--ds-font-size-400)' }),
        option: (base) => ({ ...base, fontSize: 'var(--ds-font-size-400)' }),
        singleValue: (base) => ({ ...base, fontSize: 'var(--ds-font-size-400)' }),
        input: (base) => ({ ...base, fontSize: 'var(--ds-font-size-400)' }),
      }}
    />
  );
}

export default CatalystSeverityField;
