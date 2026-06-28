/**
 * Per-domain adapter configuration stubs (static config only).
 * Encodes Plan Lock §4 storage decisions. enumCompatMap authored from evidence.
 */
import type { DomainAdapterConfig, EntityKey } from '../contracts';

export const DOMAIN_ADAPTER_CONFIGS: Record<EntityKey, DomainAdapterConfig> = {
  epic: { entityKey: 'epic', table: 'ph_issues', statusColumn: 'status', workflowKeyColumn: null, storageOption: 'native' },
  feature: { entityKey: 'feature', table: 'ph_issues', statusColumn: 'status', workflowKeyColumn: null, storageOption: 'native' },
  story: { entityKey: 'story', table: 'ph_issues', statusColumn: 'status', workflowKeyColumn: null, storageOption: 'native' },
  subtask: { entityKey: 'subtask', table: 'ph_issues', statusColumn: 'status', workflowKeyColumn: null, storageOption: 'native' },
  business_request: { entityKey: 'business_request', table: 'business_requests', statusColumn: 'process_step', workflowKeyColumn: null, storageOption: 'A_lite' },
  product_milestone: { entityKey: 'product_milestone', table: 'product_milestones', statusColumn: 'status', workflowKeyColumn: null, storageOption: 'A_lite' },
  sprint: { entityKey: 'sprint', table: 'ph_jira_sprints', statusColumn: 'status', workflowKeyColumn: null, storageOption: 'A_lite' },
  task: { entityKey: 'task', table: 'tasks', statusColumn: 'status_id', workflowKeyColumn: 'workflow_status_key', storageOption: 'A_projection' },
  defect: {
    entityKey: 'defect', table: 'tm_defects', statusColumn: 'status',
    workflowKeyColumn: 'workflow_status_key', storageOption: 'A',
    // canonical key -> nearest SAFE existing tm_defect_status enum value.
    // Adapter writes workflow_status_key (canonical) + status (compat); enum
    // is never widened. Keys absent here leave the enum unchanged.
    enumCompatMap: {
      new: 'open', triage: 'open', deferred: 'open',
      accepted: 'in_progress', assigned_for_fix: 'in_progress', in_fix: 'in_progress',
      ready_for_retest: 'in_progress', retest: 'in_progress', retest_failed: 'in_progress', uat_failed: 'in_progress',
      verified: 'resolved', uat_ready: 'resolved', uat_passed: 'resolved', ready_for_release: 'resolved',
      closed: 'closed', rejected: 'closed', duplicate: 'closed',
      reopened: 'reopened',
    },
  },
  incident: {
    entityKey: 'incident', table: 'incidents', statusColumn: 'status',
    workflowKeyColumn: 'workflow_status_key', storageOption: 'A',
    // canonical key -> nearest SAFE existing incident_status enum value.
    enumCompatMap: {
      reported: 'open', acknowledged: 'triage', triage: 'triage', major_declared: 'triage',
      workaround: 'in_progress', in_resolution: 'in_progress', fix_ready: 'in_progress',
      deploying_fix: 'in_progress', monitoring: 'in_progress', resolved: 'resolved', rca_pending: 'resolved',
      closed: 'closed', duplicate: 'closed', canceled: 'closed', reopened: 'open',
    },
  },
  release: { entityKey: 'release', table: 'rh_releases', statusColumn: 'status', workflowKeyColumn: 'workflow_status_key', storageOption: 'A', enumCompatMap: {} },
  test_case: { entityKey: 'test_case', table: 'tm_test_cases', statusColumn: 'status', workflowKeyColumn: 'workflow_status_key', storageOption: 'A', enumCompatMap: {} },
  test_plan: { entityKey: 'test_plan', table: 'tm_test_plans', statusColumn: 'status', workflowKeyColumn: 'workflow_status_key', storageOption: 'A', enumCompatMap: {} },
  test_cycle: { entityKey: 'test_cycle', table: 'tm_test_cycles', statusColumn: 'status', workflowKeyColumn: 'workflow_status_key', storageOption: 'A', enumCompatMap: {} },
  test_run: { entityKey: 'test_run', table: 'tm_test_runs', statusColumn: 'status', workflowKeyColumn: 'workflow_status_key', storageOption: 'A', enumCompatMap: {} },
};

export type { DomainAdapterConfig } from '../contracts';
export * from '../contracts';
