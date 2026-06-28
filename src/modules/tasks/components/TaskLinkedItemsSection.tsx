/**
 * TaskLinkedItemsSection — CAT-TASKS-20260627-001 Slice 6.
 *
 * Task-specific linked-work-items section for the Tasks-Hub task detail view.
 * The canonical `LinkedWorkItemsSection` is hard-wired to `ph_issue_links`
 * (keyed on a ph_issues issue_key), which a Tasks-Hub task — a `tasks` row with
 * no ph_issues key — does not have. So this follows the SAME visual + behavioral
 * pattern (header → linked rows with type icon / key / summary / status / unlink,
 * + an Add-link AsyncSelect) but is backed by the `task_work_item_links` junction.
 *
 * Canonical atoms only: WorkItemTypeIcon, @atlaskit/select AsyncSelect,
 * @atlaskit/button IconButton, ADS Lozenge, ADS flag. The picker EXCLUDES the
 * sub-task category (rule #1); the junction CHECK is the DB backstop.
 */
import { useState, type ReactNode } from 'react';
import { AsyncSelect } from '@atlaskit/select';
import Button, { IconButton } from '@atlaskit/button/new';
import CrossIcon from '@atlaskit/icon/glyph/cross';
import AddIcon from '@atlaskit/icon/glyph/add';
import { token } from '@atlaskit/tokens';
import { WorkItemTypeIcon } from '@/components/icons/WorkItemTypeIcon';
import { Lozenge } from '@/components/ads';
import type { LozengeAppearance } from '@/components/ads';
import { flag } from '@/components/shared/JiraTable/flags';
import {
  useTaskWorkItemLinks,
  useAddTaskWorkItemLink,
  useRemoveTaskWorkItemLink,
  searchLinkableWorkItems,
  type LinkableWorkItem,
} from '../hooks/useTaskWorkItemLinks';

interface PickerOption {
  value: string;
  label: string;
  data: LinkableWorkItem;
}

function statusAppearance(category: string | null, status: string | null): LozengeAppearance {
  const v = (category || status || '').toLowerCase();
  if (v.includes('done') || v.includes('closed') || v.includes('resolved')) return 'success';
  if (v.includes('progress') || v.includes('review')) return 'inprogress';
  return 'default';
}

const headerStyle: React.CSSProperties = {
  margin: '0 0 8px',
  padding: '0 16px',
  fontSize: 'var(--ds-font-size-400)',
  fontWeight: 500,
  lineHeight: '20px',
  color: token('color.text.subtle', 'var(--ds-text-subtle, #505258)'),
};

const formatOption = (o: PickerOption): ReactNode => (
  <span style={{ display: 'inline-flex', alignItems: 'center', gap: token('space.100') }}>
    <WorkItemTypeIcon type={o.data.issue_type} size={16} />
    <span style={{ fontWeight: 600 }}>{o.data.issue_key}</span>
    <span style={{ color: token('color.text.subtle'), overflow: 'hidden', textOverflow: 'ellipsis' }}>{o.data.summary}</span>
  </span>
);

export interface TaskLinkedItemsSectionProps {
  taskId: string | null;
}

export function TaskLinkedItemsSection({ taskId }: TaskLinkedItemsSectionProps) {
  const [adding, setAdding] = useState(false);
  const { data: links = [], isLoading, error } = useTaskWorkItemLinks(taskId);
  const addMut = useAddTaskWorkItemLink(taskId);
  const removeMut = useRemoveTaskWorkItemLink(taskId);

  const loadOptions = async (input: string): Promise<PickerOption[]> => {
    try {
      const items = await searchLinkableWorkItems(input);
      return items.map((i) => ({ value: i.issue_key, label: `${i.issue_key} ${i.summary}`, data: i }));
    } catch {
      return [];
    }
  };

  const handleAdd = (opt: PickerOption | null) => {
    if (!opt) return;
    addMut.mutate(
      { workItemKey: opt.data.issue_key, workItemType: opt.data.issue_type },
      {
        onSuccess: () => setAdding(false),
        onError: (e: Error) => {
          if (/duplicate|unique|23505|already/i.test(e.message)) flag.warning('Already linked', `${opt.data.issue_key} is already linked to this task.`);
          else flag.error('Could not add link', e.message);
        },
      },
    );
  };

  const handleRemove = (linkId: string, key: string) =>
    removeMut.mutate(linkId, { onError: (e: Error) => flag.error(`Could not unlink ${key}`, e.message) });

  return (
    <section style={{ marginTop: 8, marginBottom: 20 }}>
      <h2 style={headerStyle}>Linked items</h2>
      <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: token('space.100') }}>
        {error ? (
          <p style={{ margin: 0, fontSize: 'var(--ds-font-size-300)', color: token('color.text.subtle') }}>
            Linking is unavailable until the task link table is provisioned.
          </p>
        ) : isLoading ? (
          <p style={{ margin: 0, fontSize: 'var(--ds-font-size-300)', color: token('color.text.subtlest') }}>Loading…</p>
        ) : links.length === 0 ? (
          <p style={{ margin: 0, fontSize: 'var(--ds-font-size-300)', color: token('color.text.subtlest') }}>No linked items yet.</p>
        ) : (
          links.map((l) => (
            <div
              key={l.id}
              style={{
                display: 'flex', alignItems: 'center', gap: token('space.100'),
                padding: `${token('space.075')} ${token('space.100')}`,
                border: `1px solid ${token('color.border')}`, borderRadius: 4,
                background: token('elevation.surface'),
              }}
            >
              <WorkItemTypeIcon type={l.work_item_type} size={16} />
              <span style={{ fontWeight: 600, color: token('color.text') }}>{l.work_item_key}</span>
              <span style={{ flex: 1, minWidth: 0, color: token('color.text.subtle'), overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {l.summary ?? ''}
              </span>
              {l.status && <Lozenge appearance={statusAppearance(l.status_category, l.status)}>{l.status}</Lozenge>}
              <IconButton
                appearance="subtle"
                spacing="compact"
                label={`Unlink ${l.work_item_key}`}
                icon={(p) => <CrossIcon {...p} label="" />}
                onClick={() => handleRemove(l.id, l.work_item_key)}
                isDisabled={removeMut.isPending}
              />
            </div>
          ))
        )}

        {!error && (adding ? (
          <div style={{ maxWidth: 480 }}>
            <AsyncSelect<PickerOption>
              autoFocus
              defaultOptions
              cacheOptions
              isClearable
              placeholder="Search work items to link…"
              loadOptions={loadOptions}
              formatOptionLabel={formatOption}
              onChange={(opt) => handleAdd(opt as PickerOption | null)}
              onBlur={() => setAdding(false)}
              noOptionsMessage={() => 'No matching work items'}
            />
          </div>
        ) : (
          <div>
            <Button
              appearance="subtle"
              iconBefore={(p) => <AddIcon {...p} label="" />}
              onClick={() => setAdding(true)}
            >
              Add link
            </Button>
          </div>
        ))}
      </div>
    </section>
  );
}

export default TaskLinkedItemsSection;
