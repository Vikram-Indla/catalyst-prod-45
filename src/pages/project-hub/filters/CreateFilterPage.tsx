/**
 * CreateFilterPage — /project-hub/:key/filters/create
 *                    /product-hub/filters/create
 *
 * Jira-parity filter builder: the builder tabs sit on top and a LIVE results
 * table (canonical JiraTable, same as the project backlog) fills the rest of
 * the page, re-querying as the JQL changes. Cross-project: results come from
 * every synced project unless the JQL narrows the scope.
 *
 * Tabs:
 *   Basic    — JiraFilterAtlaskit picker UI (field-by-field)
 *   JQL      — JQLEditor (freeform query string)
 *   Templates — pre-built filters; "Use this filter" loads the JQL, shows live
 *              results, and opens the save modal pre-filled with the template
 *   Ask CATY — natural-language → JQL via the canonical AskCatyInlineBar
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
import { FilterResultsPanel } from '@/components/filters/FilterResultsPanel';
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
  // Pre-fills carried from a selected template into the save modal
  const [templateMeta, setTemplateMeta] = useState<{ name: string } | null>(null);
  // Live match count reported by the results panel — shown in the save modal
  const [resultCount, setResultCount] = useState<number | null>(null);

  const pools = useFilterOptionPools(projectKey);

  // Derive the effective JQL from whichever tab is active
  // 0=Basic 1=JQL 2=Templates 3=Ask CATY
  const effectiveJql: string = (() => {
    if (activeTabIdx === 0) return basicToJql(basicValue);
    if (activeTabIdx === 1) return jqlValue;
    if (activeTabIdx === 3) return catyJql || jqlValue;
    return jqlValue; // Templates — JQL set on selection
  })();

  const filtersCount = effectiveJql.trim()
    ? translate(effectiveJql).length
    : 0;

  const listHref = projectKey
    ? `/project-hub/${projectKey}/filters`
    : `/product-hub/filters`;

  // Product hub filters scope to business_requests, not ph_issues — the live
  // ph_issues preview only renders for project-hub filters (2026-05-21 lesson).
  const showResults = hubType === 'project';

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      background: `var(--ds-surface, #FFFFFF)`,
      color: token('color.text'),
    }}>
      {/* Header — 24px horizontal padding matches the project backlog */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '24px 24px 16px',
        borderBottom: `1px solid ${token('color.border')}`,
        flexShrink: 0,
      }}>
        <div>
          <h1 style={{
            margin: 0,
            fontSize: 24,
            fontWeight: 653,
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
            Define your filter using the builder, JQL, a template, or Ask CATY — results preview live below
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

      {/* Builder + live results */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px 32px' }}>
        <Tabs
          id="create-filter-tabs"
          selected={activeTabIdx}
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
            <div style={{ paddingTop: 16, width: '100%' }}>
              <BasicFilterBar
                value={basicValue}
                onChange={setBasicValue}
                assignees={pools.assignees}
                reporters={pools.reporters}
                statuses={pools.statuses}
                workTypes={pools.workTypes}
                sprintReleases={pools.sprintReleases}
                labels={pools.labels}
                isLoading={pools.isLoading}
              />

              {effectiveJql.trim() && (
                <div style={{
                  marginTop: 16,
                  padding: 12,
                  background: `var(--ds-surface-sunken, #F7F8F9)`,
                  borderRadius: 3,
                  fontFamily: 'var(--ds-font-family-code, monospace)',
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
            <div style={{ paddingTop: 16, width: '100%' }}>
              <p style={{ margin: '0 0 16px', fontSize: 13, color: token('color.text.subtle') }}>
                Write a JQL query — results update live below. Add{' '}
                <code style={{
                  background: `var(--ds-background-neutral, #F1F2F4)`,
                  borderRadius: 3,
                  padding: '0 4px',
                  fontSize: 11,
                  fontFamily: 'var(--ds-font-family-code, monospace)',
                }}>
                  project = {projectKey ?? 'KEY'}
                </code>{' '}
                to scope to one project, or omit it to search across all projects.
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
                  fixVersion:(pools.sprintReleases?? []).map(f => f.label),
                  labels:    (pools.labels     ?? []).map(l => l.label),
                  priority:  ['Highest', 'High', 'Medium', 'Low', 'Lowest'],
                }}
              />
            </div>
          </TabPanel>

          {/* ── Templates ── */}
          <TabPanel>
            <div style={{ paddingTop: 16, width: '100%' }}>
              <p style={{ margin: '0 0 16px', fontSize: 13, color: token('color.text.subtle') }}>
                Choose a pre-built filter — its results load below and you can save it straight away.
              </p>
              <FilterTemplateGallery
                hubScope={(hubType === 'product' ? 'product' : 'project') as HubTemplateScope}
                projectKey={projectKey}
                onSelect={(jql, templateName) => {
                  setJqlValue(jql);
                  setTemplateMeta({ name: templateName });
                  setSaveModalOpen(true);
                }}
              />
            </div>
          </TabPanel>

          {/* ── Ask CATY ── */}
          <TabPanel>
            <div style={{ paddingTop: 16, width: '100%' }}>
              <p style={{ margin: '0 0 16px', fontSize: 13, color: token('color.text.subtle') }}>
                Describe what you want to find in plain language. CATY builds the JQL and the results
                preview live below.
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
                  fontFamily: 'var(--ds-font-family-code, monospace)',
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

        {/* Live results — canonical backlog table, updates as the JQL changes */}
        {showResults && (
          <FilterResultsPanel
            jql={effectiveJql}
            onResultsChange={setResultCount}
          />
        )}
      </div>

      {/* Save modal */}
      {saveModalOpen && (
        <FilterSaveModal
          initialJql={effectiveJql}
          initialName={templateMeta?.name}
          resultCount={showResults ? resultCount : null}
          hubScope={hubType === 'product' ? 'product' : 'project'}
          onClose={() => { setSaveModalOpen(false); setTemplateMeta(null); }}
          onSaved={() => navigate(listHref)}
        />
      )}
    </div>
  );
}
