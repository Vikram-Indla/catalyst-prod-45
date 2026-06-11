/**
 * CreateFilterPage — /project-hub/:key/filters/create
 *                    /product-hub/filters/create
 *
 * Jira-parity: JQL editor at top, live results table below. No tabs.
 * Save opens the modal with name / description / share settings.
 */
import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { token } from '@atlaskit/tokens';
import Button from '@atlaskit/button/new';
import { FilterSaveModal } from '@/components/filters/FilterSaveModal';
import { JQLEditor } from '@/components/filters/JQLEditor';
import { FilterResultsPanel } from '@/components/filters/FilterResultsPanel';
import { useFilterOptionPools } from '@/hooks/workhub/useFilterOptionPools';
import type { HubType } from './FiltersListPage';

interface CreateFilterPageProps {
  hubType?: HubType;
}

export default function CreateFilterPage({ hubType = 'project' }: CreateFilterPageProps) {
  const navigate = useNavigate();
  const { key: projectKey } = useParams<{ key: string }>();

  const [jqlValue, setJqlValue] = useState('');
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [resultCount, setResultCount] = useState<number | null>(null);

  const pools = useFilterOptionPools(projectKey);

  const listHref = projectKey
    ? `/project-hub/${projectKey}/filters`
    : `/product-hub/filters`;

  const showResults = hubType === 'project';

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      background: `var(--ds-surface, #FFFFFF)`,
      color: token('color.text'),
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '24px 24px 16px',
        borderBottom: `1px solid ${token('color.border')}`,
        flexShrink: 0,
      }}>
        <h1 style={{
          margin: 0,
          fontSize: 24,
          fontWeight: 653,
          color: token('color.text'),
          lineHeight: '28px',
        }}>
          Create filter
        </h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button appearance="subtle" onClick={() => navigate(listHref)}>
            Cancel
          </Button>
          <Button
            appearance="primary"
            onClick={() => setSaveModalOpen(true)}
            isDisabled={!jqlValue.trim()}
          >
            Save filter
          </Button>
        </div>
      </div>

      {/* JQL editor + live results */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px 32px' }}>
        <JQLEditor
          value={jqlValue}
          onChange={setJqlValue}
          autoFocus
          showFilterCount
          valuePool={{
            status:     (pools.statuses        ?? []).map(s => s.label),
            assignee:   (pools.assignees        ?? []).map(a => a.label),
            reporter:   (pools.reporters        ?? []).map(r => r.label),
            issuetype:  (pools.workTypes        ?? []).map(w => w.label),
            fixVersion: (pools.sprintReleases   ?? []).map(f => f.label),
            labels:     (pools.labels           ?? []).map(l => l.label),
            priority:   ['Highest', 'High', 'Medium', 'Low', 'Lowest'],
          }}
        />

        {showResults && (
          <div style={{ marginTop: 24 }}>
            <FilterResultsPanel
              jql={jqlValue}
              onResultsChange={setResultCount}
            />
          </div>
        )}
      </div>

      {saveModalOpen && (
        <FilterSaveModal
          initialJql={jqlValue}
          resultCount={showResults ? resultCount : null}
          hubScope={hubType === 'product' ? 'product' : 'project'}
          onClose={() => setSaveModalOpen(false)}
          onSaved={() => navigate(listHref)}
        />
      )}
    </div>
  );
}
