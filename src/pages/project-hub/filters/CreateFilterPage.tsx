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
  JiraFilterAtlaskit,
  emptyFilterValue,
  type JiraFilterValue,
} from '@/components/shared/JiraFilterAtlaskit';
import { AskCatyInlineBar } from '@/components/caty/AskCatyInlineBar';
import { useCatySearch, type CatyFilter } from '@/components/caty/catySearchStore';
import { FilterTemplateGallery } from '@/components/filters/FilterTemplateGallery';
import { translate } from '@/lib/jql';
import type { HubType } from './FiltersListPage';
import type { HubTemplateScope } from '@/lib/filters/filterTemplates';

/** Convert a CATY structured filter into a JQL string */
function catyFilterToJql(f: CatyFilter, projectKey?: string): string {
  const clauses: string[] = [];

  if (projectKey) clauses.push(`project = "${projectKey}"`);

  if (f.status_names?.length === 1)   clauses.push(`status = "${f.status_names[0]}"`);
  else if (f.status_names?.length)    clauses.push(`status in (${f.status_names.map(s => `"${s}"`).join(', ')})`);

  if (f.priorities?.length === 1)     clauses.push(`priority = "${f.priorities[0]}"`);
  else if (f.priorities?.length)      clauses.push(`priority in (${f.priorities.map(p => `"${p}"`).join(', ')})`);

  if (f.types?.length === 1)          clauses.push(`issuetype = "${f.types[0]}"`);
  else if (f.types?.length)           clauses.push(`issuetype in (${f.types.map(t => `"${t}"`).join(', ')})`);

  if (f.is_unassigned)                clauses.push('assignee is EMPTY');
  else if (f.assignee_names?.length === 1) clauses.push(`assignee = "${f.assignee_names[0]}"`);
  else if (f.assignee_names?.length)  clauses.push(`assignee in (${f.assignee_names.map(a => `"${a}"`).join(', ')})`);

  if (f.reporter_names?.length === 1) clauses.push(`reporter = "${f.reporter_names[0]}"`);
  else if (f.reporter_names?.length)  clauses.push(`reporter in (${f.reporter_names.map(r => `"${r}"`).join(', ')})`);

  if (f.labels?.length === 1)         clauses.push(`labels = "${f.labels[0]}"`);
  else if (f.labels?.length)          clauses.push(`labels in (${f.labels.map(l => `"${l}"`).join(', ')})`);

  if (f.fix_versions?.length === 1)   clauses.push(`fixVersion = "${f.fix_versions[0]}"`);
  else if (f.fix_versions?.length)    clauses.push(`fixVersion in (${f.fix_versions.map(v => `"${v}"`).join(', ')})`);

  if (f.sprint_names?.length === 1)   clauses.push(`sprint = "${f.sprint_names[0]}"`);
  else if (f.sprint_names?.length)    clauses.push(`sprint in (${f.sprint_names.map(s => `"${s}"`).join(', ')})`);

  if (f.parent_keys?.length)          clauses.push(`parent in (${f.parent_keys.join(', ')})`);

  if (f.created_within_days)          clauses.push(`created >= -${f.created_within_days}d`);
  if (f.updated_within_days)          clauses.push(`updated >= -${f.updated_within_days}d`);
  if (f.stale_for_days)               clauses.push(`updated <= -${f.stale_for_days}d`);

  if (f.text_contains)                clauses.push(`summary ~ "${f.text_contains}"`);
  if (f.resolution_set === false)     clauses.push('resolution is EMPTY');
  if (f.resolution_set === true)      clauses.push('resolution is not EMPTY');

  return clauses.join(' AND ') + (clauses.length ? ' ORDER BY updated DESC' : '');
}

interface CreateFilterPageProps {
  hubType?: HubType;
}

// Build a JQL string from the basic filter form value
function basicToJql(v: JiraFilterValue): string {
  const clauses: string[] = [];

  if (v.status.length === 1)      clauses.push(`status = "${v.status[0]}"`);
  else if (v.status.length > 1)   clauses.push(`status in (${v.status.map(s => `"${s}"`).join(', ')})`);

  if (v.assignees.length === 1)   clauses.push(`assignee = "${v.assignees[0]}"`);
  else if (v.assignees.length > 1) clauses.push(`assignee in (${v.assignees.map(a => `"${a}"`).join(', ')})`);

  if (v.priority.length === 1)    clauses.push(`priority = "${v.priority[0]}"`);
  else if (v.priority.length > 1) clauses.push(`priority in (${v.priority.map(p => `"${p}"`).join(', ')})`);

  if (v.workType.length === 1)    clauses.push(`issuetype = "${v.workType[0]}"`);
  else if (v.workType.length > 1) clauses.push(`issuetype in (${v.workType.map(t => `"${t}"`).join(', ')})`);

  if (v.labels.length === 1)      clauses.push(`labels = "${v.labels[0]}"`);
  else if (v.labels.length > 1)   clauses.push(`labels in (${v.labels.map(l => `"${l}"`).join(', ')})`);

  if (v.fixVersions.length === 1)   clauses.push(`fixVersion = "${v.fixVersions[0]}"`);
  else if (v.fixVersions.length > 1) clauses.push(`fixVersion in (${v.fixVersions.map(f => `"${f}"`).join(', ')})`);

  if (v.created.from)   clauses.push(`created >= "${v.created.from}"`);
  if (v.created.to)     clauses.push(`created <= "${v.created.to}"`);
  if (v.updated.from)   clauses.push(`updated >= "${v.updated.from}"`);
  if (v.updated.to)     clauses.push(`updated <= "${v.updated.to}"`);

  return clauses.join(' AND ');
}

export default function CreateFilterPage({ hubType = 'project' }: CreateFilterPageProps) {
  const navigate = useNavigate();
  const { key: projectKey } = useParams<{ key: string }>();

  const [basicValue, setBasicValue]   = useState<JiraFilterValue>(emptyFilterValue);
  const [jqlValue,   setJqlValue]     = useState('');
  const [activeTabIdx, setActiveTabIdx] = useState(0);
  const [saveModalOpen, setSaveModalOpen] = useState(false);

  // Wire CATY output → JQL tab: when CATY returns a ready filter, convert it
  // to JQL, populate the JQL editor, and switch to the JQL tab automatically.
  const catyStatus = useCatySearch(s => s.status);
  const catyFilter = useCatySearch(s => s.filter);
  React.useEffect(() => {
    if (catyStatus === 'ready' && catyFilter) {
      const jql = catyFilterToJql(catyFilter, projectKey);
      if (jql.trim()) {
        setJqlValue(jql);
        setActiveTabIdx(1); // switch to JQL tab so user can review and save
      }
    }
  }, [catyStatus, catyFilter, projectKey]);

  // Derive the effective JQL from whichever tab is active
  // 0=Basic 1=JQL 2=Templates 3=Ask CATY
  const effectiveJql: string = (() => {
    if (activeTabIdx === 0) return basicToJql(basicValue);
    if (activeTabIdx === 1) return jqlValue;
    return ''; // Templates / Ask CATY — JQL comes from selection or CATY store
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
                fontSize: 12,
                background: `var(--ds-background-neutral, #F1F2F4)`,
                color: token('color.text.subtle'),
                borderRadius: 8,
                padding: '4px 8px',
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
            <div style={{ paddingTop: 16 }}>
              <p style={{ margin: '0 0 16px', fontSize: 13, color: token('color.text.subtle') }}>
                Select field values to build your filter. Switch to JQL to see the generated query.
              </p>
              <JiraFilterAtlaskit
                value={basicValue}
                onChange={setBasicValue}
              />
              {effectiveJql.trim() && (
                <div style={{
                  marginTop: 16,
                  padding: 12,
                  background: `var(--ds-surface-sunken, #F7F8F9)`,
                  borderRadius: 3,
                  fontFamily: 'monospace',
                  fontSize: 12,
                  color: token('color.text.subtle'),
                }}>
                  <span style={{ fontWeight: token('font.weight.semibold'), color: token('color.text.subtlest') }}>
                    JQL preview:{' '}
                  </span>
                  {effectiveJql}
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
              />
              <p style={{
                marginTop: 16,
                fontSize: 12,
                color: token('color.text.subtlest'),
              }}>
                After CATY generates your filter, switch to the JQL tab to review and save it.
              </p>
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
