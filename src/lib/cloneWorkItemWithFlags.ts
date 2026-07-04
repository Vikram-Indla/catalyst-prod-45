/**
 * cloneWorkItemWithFlags — Shared orchestration for the Clone-from-detail-view flow.
 *
 * Steps:
 *   1. Fire "Cloning {key}" info flag (2s) — mirrors Jira's async clone hint.
 *   2. Run the clone in the background.
 *   3. On resolve → success flag titled `{Label} {sourceKey} cloned` with a
 *      `View cloned {Label}` action that opens the new item in a new tab.
 *   4. On reject → error flag with the underlying message.
 *
 * Defaults (ph_issues path): uses `cloneIssue` from workItemRepo + a
 * type-aware URL builder. For non-ph_issues entities (test cases, test
 * cycles, tasks hub, business requests) callers pass `cloneFn` +
 * `detailUrl` + `entityLabel` to plug in table-specific logic.
 */
import { catalystFlag } from './catalystFlag';
import { cloneIssue, type CloneIssuePatch } from '@/modules/project-work-hub/lib/workItemRepo';
import type { ClonePatch } from '@/components/catalyst-detail-views/shared/ConfirmCloneDialog';

const INFO_FLAG_MS = 2000;
const SUCCESS_FLAG_MS = 6000;

/** Friendly display label for the "View cloned X" link and success title. */
export function workTypeLabel(issueType: string | null | undefined): string {
  const raw = (issueType ?? '').trim();
  if (!raw) return 'work item';
  const lower = raw.toLowerCase();
  if (lower === 'story') return 'Story';
  if (lower === 'epic') return 'Epic';
  if (lower === 'feature' || lower === 'new feature') return 'Feature';
  if (lower === 'bug' || lower === 'defect' || lower === 'qa bug') return 'Bug';
  if (lower === 'task') return 'Task';
  if (lower === 'sub-task' || lower === 'subtask') return 'Subtask';
  if (lower === 'backend' || lower === 'frontend' || lower === 'integration') return 'Subtask';
  if (lower === 'business request' || lower === 'business_request') return 'Business Request';
  if (lower === 'production incident' || lower === 'incident' || lower === 'business gap') return 'Incident';
  if (lower === 'idea') return 'Idea';
  if (lower === 'change request') return 'Change Request';
  if (lower === 'test case') return 'Test case';
  if (lower === 'test cycle') return 'Test cycle';
  return raw;
}

/** Route builder for the detail page opened by the success flag's action link. */
export function buildDetailUrl(
  issueType: string | null | undefined,
  projectKey: string | null | undefined,
  issueKey: string,
): string {
  const t = (issueType ?? '').toLowerCase().trim();
  const pk = projectKey ?? '';
  if (t === 'production incident' || t === 'incident' || t === 'business gap') {
    return `/incident-hub/view/${issueKey}`;
  }
  if (t === 'business request' || t === 'business_request') {
    return `/product-hub/requests/${issueKey}`;
  }
  return `/project-hub/${pk}/issue/${issueKey}`;
}

export interface CloneWithFlagsArgs {
  sourceKey: string;
  sourceType?: string | null;
  projectKey?: string | null;
  patch?: ClonePatch;
  /** Override the auto-derived work-type label used in the flag copy + action link. */
  entityLabel?: string;
  /**
   * Custom clone function. Must return the new item's user-visible key
   * (issue_key / case_key / cycle_key / request_key). When omitted, the
   * default `cloneIssue` (ph_issues) is used and `sourceType` + `projectKey`
   * drive URL routing.
   */
  cloneFn?: (patch?: ClonePatch) => Promise<string>;
  /** Custom detail-URL builder. Falls back to the type-aware `buildDetailUrl`. */
  detailUrl?: (newKey: string) => string;
}

/**
 * Runs the clone with the info→success/error flag sequence. Returns the new
 * key on success. Callers may await it if they need to refresh state, but
 * the flag UX does not require awaiting.
 */
export async function cloneWorkItemWithFlags({
  sourceKey,
  sourceType,
  projectKey,
  patch,
  entityLabel,
  cloneFn,
  detailUrl,
}: CloneWithFlagsArgs): Promise<string | null> {
  const label = entityLabel ?? workTypeLabel(sourceType);

  const infoId = catalystFlag.info(
    {
      title: `Cloning ${sourceKey}`,
      description: `When cloning is complete, the cloned work item will be linked to ${sourceKey} and you'll receive another pop-up here just like this one.`,
    },
    INFO_FLAG_MS,
  );

  const repoPatch: CloneIssuePatch | undefined = patch
    ? {
        summary: patch.summary,
        assigneeId: patch.assigneeId,
        assigneeName: patch.assigneeName,
        reporterId: patch.reporterId,
        reporterName: patch.reporterName,
        include: patch.include,
      }
    : undefined;

  const runClone = cloneFn
    ? () => cloneFn(patch)
    : () => cloneIssue(sourceKey, repoPatch);

  try {
    const newKey = await runClone();
    const url = detailUrl
      ? detailUrl(newKey)
      : buildDetailUrl(sourceType, projectKey, newKey);

    catalystFlag.dismiss(infoId);
    catalystFlag.success(
      {
        title: `${label} ${sourceKey} cloned`,
        description: `This ${label} is linked to ${newKey}.`,
        action: {
          label: `View cloned ${label}`,
          onClick: () => { window.open(url, '_blank', 'noopener,noreferrer'); },
        },
      },
      SUCCESS_FLAG_MS,
    );

    return newKey;
  } catch (e) {
    const msg = e instanceof Error ? e.message : (e as any)?.message ?? 'Unknown error';
    catalystFlag.dismiss(infoId);
    catalystFlag.error(
      {
        title: 'Clone failed',
        description: msg,
      },
      SUCCESS_FLAG_MS,
    );
    return null;
  }
}
