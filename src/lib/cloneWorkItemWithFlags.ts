/**
 * cloneWorkItemWithFlags — Shared orchestration for the Clone-from-detail-view flow.
 *
 * Steps:
 *   1. Fire "Cloning {key}" info flag (2s) — mirrors Jira's async clone hint.
 *   2. Run `cloneIssue(sourceKey, patch)` in the background.
 *   3. On resolve → success flag titled `{WorkType} {sourceKey} cloned` with a
 *      `View cloned {WorkType}` action that opens the new item in a new tab.
 *   4. On reject → error flag with the underlying message.
 *
 * URL builder is issue-type aware so incidents/business requests route to the
 * right hub instead of the generic project-hub issue page.
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
  sourceType: string | null | undefined;
  projectKey: string | null | undefined;
  patch?: ClonePatch;
}

/**
 * Runs the clone with the info→success/error flag sequence. Returns the new
 * issue_key on success. Callers may await it if they need to refresh state,
 * but the flag UX does not require awaiting.
 */
export async function cloneWorkItemWithFlags({
  sourceKey,
  sourceType,
  projectKey,
  patch,
}: CloneWithFlagsArgs): Promise<string | null> {
  const label = workTypeLabel(sourceType);

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

  try {
    const newKey = await cloneIssue(sourceKey, repoPatch);
    const url = buildDetailUrl(sourceType, projectKey, newKey);

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
