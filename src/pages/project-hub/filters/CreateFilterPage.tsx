/**
 * CreateFilterPage — /project-hub/:key/filters/create
 *                    /product-hub/filters/create
 *
 * Three-tab filter builder:
 *   Basic   — JiraFilterAtlaskit picker UI (field-by-field)
 *   JQL     — JQLEditor (freeform query string)
 *   Ask CATY — AskCatyInlineBar (natural-language → structured filter)
 */
import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { token } from '@atlaskit/tokens';
import Tabs, { Tab, TabList, TabPanel } from '@atlaskit/tabs';
import Button from '@atlaskit/button/new';
import { FilterSaveModal } from '@/components/filters/FilterSaveModal';
import { JQLEditor } from '@/components/filters/JQLEditor';
import {
  emptyFilterValue,
  type JiraFilterValue,
} from '@/components/shared/JiraFilterAtlaskit';
import { BasicFilterBar } from '@/components/filters/BasicFilterBar';
import { AskCatyInlineBar } from '@/components/caty/AskCatyInlineBar';
import { FilterTemplateGallery } from '@/components/filters/FilterTemplateGallery';
import { translate } from '@/lib/jql';
import type { HubType } from './FiltersListPage';
import type { HubTemplateScope } from '@/lib/filters/filterTemplates';
import { useFilterOptionPools } from '@/hooks/workhub/useFilterOptionPools';
import { basicToJql } from '@/lib/filters/basicToJql';

interface CreateFilterPageProps {
  hubType?: HubType;
}

export default function CreateFilterPage({ hubType = 'project' }: CreateFilterPageProps) {
  const navigate = useNavigate();
  const { key: projectKey } = useParams<{ key: string }>();

  const [basicValue, setBasicValue]   = useState<JiraFilterValue>(emptyFilterValue);
  const [jqlValue,   setJqlValue]     = useState('');
  const [catyJql,    setCatyJql]      = useState('');
  const [activeTabIdx, setActiveTabIdx] = useState(0);
  const [saveModalOpen, setSaveModalOpen] = useState(false);

  const pools = useFilterOptionPools(projectKey);

  // Derive the effective JQL from whichever tab is active
  // 0=Basic 1=JQL 2=Templates 3=Ask CATY
  const effectiveJql: string = (() => {
    if (activeTabIdx === 0) return basicToJql(basicValue);
    if (activeTabIdx === 1) return jqlValue;
    if (activeTabIdx === 3) return catyJql;
    return ''; // Templates — JQL set on selection, switches to tab 1
  })();

  const filtersCount = effectiveJql.trim()
    ? translate(effectiveJql).length
    : 0;

  const listHref = projectKey
    ? `/project-hub/${projectKey}/filters`
    : `/product-hub/filters`;

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
        padding: '24px 32px 16px',
        borderBottom: `1px solid ${token('color.border')}`,
        flexShrink: 0,
      }}>
        <div>
          <h1 style={{
            margin: 0,
            fontSize: 24,
            fontWeight: token('font.weight.bold'),
            color: token('color.text'),
            lineHeight: '28px',
          }}>
            Create filter
          </h1>
          <p style={{
            margin: '4px 0 0',
            fontSize: 14,
            color: token('color.text.subtle'),
          }}>
            Define your filter using the builder, JQL, or Ask CATY
          </p>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <Button appearance="subtle" onClick={() => navigate(listHref)}>
            Cancel
          </Button>
          <Button
            appearance="primary"
            onClick={() => setSaveModalOpen(true)}
            isDisabled={!effectiveJql.trim()}
          >
            Save filter
            {filtersCount > 0 && (
              <span style={{
                marginLeft: 8,
                fontSize: 11,
                fontWeight: token('font.weight.semibold'),
                background: `var(--ds-background-inverse-subtle, rgba(255,255,255,0.24))`,
                color: token('color.text.inverse', '#FFFFFF'),
                borderRadius: 8,
                padding: '0 8px',
                lineHeight: '20px',
              }}>
                {filtersCount}
              </span>
            )}
          </Button>
        </div>
      </div>

      {/* Tab body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px 32px' }}>
        <Tabs
          id="create-filter-tabs"
          onChange={setActiveTabIdx}
        >
          <TabList>
            <Tab>Basic</Tab>
            <Tab>JQL</Tab>
            <Tab>Templates</Tab>
            <Tab>Ask CATY</Tab>
          </TabList>

          {/* ── Basic ── */}
          <TabPanel>
            <div style={{ paddingTop: 16 }}>
              <BasicFilterBar
                value={basicValue}
                onChange={setBasicValue}
                assignees={pools.assignees}
                reporters={pools.reporters}
                statuses={pools.statuses}
                workTypes={pools.workTypes}
                fixVersions={pools.fixVersions}
                labels={pools.labels}
                isLoading={pools.isLoading}
              />

              {/* Empty state — shown when no criteria selected yet */}
              {activeTabIdx === 0 && !effectiveJql.trim() && (
                <div style={{
                  marginTop: 32,
                  padding: '32px 24px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 8,
                  background: `var(--ds-surface-sunken, #F7F8F9)`,
                  borderRadius: 4,
                  border: `1px dashed ${token('color.border')}`,
                  textAlign: 'center',
                }}>
                  <span style={{ fontSize: 24, lineHeight: 1 }}>⚙</span>
                  <p style={{
                    margin: 0,
                    fontSize: 14,
                    fontWeight: token('font.weight.semibold'),
                    color: token('color.text'),
                  }}>
                    No criteria selected
                  </p>
                  <p style={{
                    margin: 0,
                    fontSize: 13,
                    color: token('color.text.subtle'),
                    maxWidth: 360,
                    lineHeight: 1.5,
                  }}>
                    Use the chips above to filter by Assignee, Type, Status, Priority or more.
                    Your JQL query will appear here as you build it.
                  </p>
                </div>
              )}

              {effectiveJql.trim() && (
                <div style={{
                  marginTop: 16,
                  padding: 12,
                  background: `var(--ds-surface-sunken, #F7F8F9)`,
                  borderRadius: 3,
                  fontFamily: 'var(--cp-font-mono, monospace)',
                  fontSize: 12,
                  color: token('color.text.subtle'),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 8,
                }}>
                  <span>
                    <span style={{ fontWeight: token('font.weight.semibold'), color: token('color.text.subtlest') }}>
                      JQL:{' '}
                    </span>
                    {effectiveJql}
                  </span>
                  <Button
                    appearance="subtle"
                    spacing="compact"
                    onClick={() => {
                      setJqlValue(basicToJql(basicValue));
                      setActiveTabIdx(1);
                    }}
                  >
                    Edit in JQL
                  </Button>
                </div>
              )}
            </div>
          </TabPanel>

          {/* ── JQL ── */}
          <TabPanel>
            <div style={{ paddingTop: 16 }}>
              <p style={{ margin: '0 0 16px', fontSize: 13, color: token('color.text.subtle') }}>
                Write a JQL query. Press{' '}
                <kbd style={{
                  background: `var(--ds-background-neutral, #F1F2F4)`,
                  border: `1px solid ${token('color.border')}`,
                  borderRadius: 3,
                  padding: '0 4px',
                  fontSize: 11,
                  fontFamily: 'monospace',
                }}>
                  Ctrl+Enter
                </kbd>{' '}
                to validate.
              </p>
              <JQLEditor
                value={jqlValue}
                onChange={setJqlValue}
                showFilterCount
                valuePool={{
                  status:    (pools.statuses   ?? []).map(s => s.label),
                  assignee:  (pools.assignees  ?? []).map(a => a.label),
                  reporter:  (pools.reporters  ?? []).map(r => r.label),
                  issuetype: (pools.workTypes  ?? []).map(w => w.label),
                  fixVersion:(pools.fixVersions?? []).map(f => f.label),
                  labels:    (pools.labels     ?? []).map(l => l.label),
                  priority:  ['Highest', 'High', 'Medium', 'Low', 'Lowest'],
                }}
              />
            </div>
          </TabPanel>

          {/* ── Templates ── */}
          <TabPanel>
            <div style={{ paddingTop: 16 }}>
              <p style={{ margin: '0 0 16px', fontSize: 13, color: token('color.text.subtle') }}>
                Choose a pre-built filter to start with. You can customise it in the JQL tab after selecting.
              </p>
              <FilterTemplateGallery
                hubScope={(hubType === 'product' ? 'product' : 'project') as HubTemplateScope}
                projectKey={projectKey}
                onSelect={(jql) => {
                  setJqlValue(jql);
                  setActiveTabIdx(1); // switch to JQL tab so user can preview
                }}
              />
            </div>
          </TabPanel>

          {/* ── Ask CATY ── */}
          <TabPanel>
            <div style={{ paddingTop: 16 }}>
              <p style={{ margin: '0 0 16px', fontSize: 13, color: token('color.text.subtle') }}>
                Describe what you want to find in plain language. CATY will build the filter for you.
              </p>
              <AskCatyInlineBar
                projectKey={projectKey ?? null}
                onClose={() => setActiveTabIdx(1)}
                onJqlGenerated={(jql) => {
                  setCatyJql(jql);
                  setJqlValue(jql);
                }}
              />
              {catyJql && (
                <div style={{
                  marginTop: 16,
                  padding: 12,
                  background: `var(--ds-surface-sunken, #F7F8F9)`,
                  borderRadius: 3,
                  fontFamily: 'monospace',
                  fontSize: 12,
                  color: token('color.text.subtle'),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 8,
                }}>
                  <span>
                    <span style={{ fontWeight: token('font.weight.semibold'), color: token('color.text.subtlest') }}>
                      Generated JQL:{' '}
                    </span>
                    {catyJql}
                  </span>
                  <Button
                    appearance="subtle"
                    spacing="compact"
                    onClick={() => setActiveTabIdx(1)}
                  >
                    Review in JQL
                  </Button>
                </div>
              )}
            </div>
          </TabPanel>
        </Tabs>
      </div>

      {/* Save modal */}
      {saveModalOpen && (
        <FilterSaveModal
          initialJql={effectiveJql}
          hubScope={hubType === 'product' ? 'product' : 'project'}
          onClose={() => setSaveModalOpen(false)}
          onSaved={() => navigate(listHref)}
        />
      )}
    </div>
  );
}
