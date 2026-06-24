/**
 * Dependency list — canonical Jira "linked issues" rows for the Dependencies tab.
 *
 * Each row: [type icon] SOURCE-KEY summary · relationship · [type icon] TARGET-KEY summary · ✕ remove
 * Remove = soft-delete (deleted_at) via supabase update.
 *
 * Type icons come from the locked JiraIssueTypeIcon registry. When an issue's
 * type is unknown (not in ph_issues), render NO icon (zero-assumption rule) —
 * never a placeholder type.
 */

import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';
import { catalystToast } from '@/lib/catalystToast';
import { IconButton } from '@atlaskit/button/new';
import { Trash2 } from '@/lib/atlaskit-icons';

export type IssueMeta = Record<string, { issue_type: string | null; summary: string | null }>;

type Dependency = {
  id: number;
  source_issue_key: string;
  target_issue_key: string;
  dependency_type: 'blocks' | 'is_blocked_by';
};

interface DependencyListProps {
  dependencies: Dependency[];
  issueMeta: IssueMeta;
  onChanged: () => void;
}

const REL_LABEL: Record<Dependency['dependency_type'], string> = {
  blocks: 'blocks',
  is_blocked_by: 'is blocked by',
};

function IssueRef({ issueKey, meta }: { issueKey: string; meta: IssueMeta }) {
  const m = meta[issueKey];
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
      {m?.issue_type ? <JiraIssueTypeIcon type={m.issue_type} size={16} /> : null}
      <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--ds-text, #292A2E)', whiteSpace: 'nowrap' }}>
        {issueKey}
      </span>
      {m?.summary ? (
        <span
          style={{
            fontSize: 14,
            color: 'var(--ds-text-subtle, #505258)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            maxWidth: 280,
          }}
        >
          {m.summary}
        </span>
      ) : null}
    </span>
  );
}

export default function DependencyList({ dependencies, issueMeta, onChanged }: DependencyListProps) {
  const [removingId, setRemovingId] = useState<number | null>(null);

  const handleRemove = async (id: number) => {
    setRemovingId(id);
    try {
      const { error } = await (supabase as any)
        .from('ph_issue_dependencies')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
      catalystToast.success('Dependency removed');
      onChanged();
    } catch (err) {
      console.error('[Dependencies] remove failed', err);
      catalystToast.error(`Could not remove dependency: ${(err as any)?.message ?? String(err)}`);
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        border: '1px solid var(--ds-border, #DFE1E6)',
        borderRadius: 4,
        overflow: 'hidden',
      }}
    >
      {dependencies.map((dep, idx) => (
        <div
          key={dep.id}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '8px 12px',
            borderTop: idx === 0 ? 'none' : '1px solid var(--ds-border, #DFE1E6)',
            minWidth: 0,
          }}
        >
          <IssueRef issueKey={dep.source_issue_key} meta={issueMeta} />
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ds-text-subtlest, #6B778C)', whiteSpace: 'nowrap' }}>
            {REL_LABEL[dep.dependency_type]}
          </span>
          <IssueRef issueKey={dep.target_issue_key} meta={issueMeta} />
          <span style={{ flex: 1 }} />
          <IconButton
            icon={Trash2}
            label="Remove dependency"
            appearance="subtle"
            isDisabled={removingId === dep.id}
            onClick={() => handleRemove(dep.id)}
          />
        </div>
      ))}
    </div>
  );
}
