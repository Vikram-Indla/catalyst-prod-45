/**
 * FilterBuilder — hub-agnostic JQL authoring component.
 *
 * Composes BasicFilterBar (chip UI) + JQLEditor (raw JQL textarea).
 * The two stay in sync: chip changes compile to JQL; raw JQL edits
 * parse back into chip state where possible.
 *
 * The canonical value is always the JQL string — chips are a derived view.
 *
 * Props:
 *   value    — the current JQL string (controlled)
 *   onChange — called with new JQL whenever chips or raw editor change
 *   config   — FilterBuilderConfig (projectKey, valuePool)
 *   pools    — option pools from useFilterOptionPools (assignees, statuses, etc.)
 */

import React, { useCallback } from 'react';
import { BasicFilterBar } from '@/components/filters/BasicFilterBar';
import { JQLEditor } from '@/components/filters/JQLEditor';
import { token } from '@atlaskit/tokens';
import type { JiraFilterValue } from '@/components/shared/JiraFilterAtlaskit';
import type {
  AssigneeOption,
  ReporterOption,
  StatusFilterOption,
  WorkTypeOption,
  SprintReleaseOption,
  LabelOption,
} from '@/components/shared/JiraFilterAtlaskit';
import type { FilterBuilderConfig } from '../types';
import { filterValueToJql } from '../lib/filterValueToJql';
import { jqlToFilterValue } from '../lib/jqlToFilterValue';

export interface FilterBuilderPools {
  assignees?: AssigneeOption[];
  reporters?: ReporterOption[];
  statuses?: StatusFilterOption[];
  workTypes?: WorkTypeOption[];
  sprintReleases?: SprintReleaseOption[];
  labels?: LabelOption[];
  isLoading?: boolean;
}

interface Props {
  value: string;
  onChange: (jql: string) => void;
  config?: FilterBuilderConfig;
  pools?: FilterBuilderPools;
}

export function FilterBuilder({ value, onChange, config = {}, pools = {} }: Props) {
  const chipValue: JiraFilterValue = jqlToFilterValue(value);

  const onChipChange = useCallback(
    (next: JiraFilterValue) => {
      onChange(filterValueToJql(next, config.projectKey));
    },
    [onChange, config.projectKey],
  );

  const onRawChange = useCallback(
    (jql: string) => {
      onChange(jql);
    },
    [onChange],
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <BasicFilterBar
        value={chipValue}
        onChange={onChipChange}
        assignees={pools.assignees}
        reporters={pools.reporters}
        statuses={pools.statuses}
        workTypes={pools.workTypes}
        sprintReleases={pools.sprintReleases}
        labels={pools.labels}
        isLoading={pools.isLoading}
      />
      <div
        style={{
          borderTop: `1px solid var(--ds-border)`,
          paddingTop: 8,
        }}
      >
        <p
          style={{
            margin: '0 0 4px',
            fontSize: 11,
            fontWeight: 600,
            color: `var(--ds-text-subtlest)`,
            fontFamily: 'var(--ds-font-family-body)',
          }}
        >
          JQL
        </p>
        <JQLEditor
          value={value}
          onChange={onRawChange}
          valuePool={config.valuePool}
          placeholder='e.g. project = "BAU" AND status = "In Progress"'
        />
      </div>
    </div>
  );
}
