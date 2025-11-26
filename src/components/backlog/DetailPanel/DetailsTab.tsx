import { DescriptionEditor } from './DescriptionEditor';
import { FormSelect } from './FormSelect';
import { TagsInput } from './TagsInput';
import { ProgressIndicators } from './ProgressIndicators';
import { QuickActions } from './QuickActions';
import { ContainedInLink } from './ContainedInLink';
import { EpicDetail } from '@/types/backlog.types';
import { PROGRAMS } from '@/data/backlogSeedData';
import { EPIC_TYPES, MVP_OPTIONS, OWNERS } from '@/data/epicDetailData';

interface DetailsTabProps {
  epic: EpicDetail;
}

export function DetailsTab({ epic }: DetailsTabProps) {
  return (
    <div className="grid grid-cols-[1fr_280px] gap-6 p-6">
      {/* Main Column */}
      <div className="flex flex-col gap-5">
        {/* Description */}
        <div className="flex flex-col gap-2">
          <label className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
            <span className="text-[8px] text-destructive">■</span>
            Description: <span className="font-normal text-muted-foreground/70">(click to edit)</span>
          </label>
          <DescriptionEditor initialValue={epic.description} />
        </div>

        {/* Type */}
        <div className="flex flex-col gap-2">
          <label className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
            <span className="text-[8px] text-destructive">■</span>
            Type:
          </label>
          <FormSelect
            value={epic.type}
            options={EPIC_TYPES.map(t => ({ value: t, label: t }))}
            onChange={() => {}}
          />
        </div>

        {/* MVP */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold text-muted-foreground">MVP:</label>
          <FormSelect
            value={epic.mvp ? 'Yes' : 'No'}
            options={MVP_OPTIONS.map(o => ({ value: o, label: o }))}
            onChange={() => {}}
          />
        </div>

        {/* Contained In */}
        {epic.containedIn && (
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-muted-foreground">Contained In:</label>
            <ContainedInLink
              id={epic.containedIn.id}
              name={epic.containedIn.name}
              type={epic.containedIn.type}
            />
          </div>
        )}

        {/* Primary Program */}
        <div className="flex flex-col gap-2">
          <label className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
            <span className="text-[8px] text-destructive">■</span>
            Primary Program:
          </label>
          <FormSelect
            value={epic.primaryProgram?.id || ''}
            options={PROGRAMS.map(p => ({ value: p.id, label: p.name }))}
            onChange={() => {}}
          />
        </div>

        {/* Additional Programs */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold text-muted-foreground">Additional Programs:</label>
          <TagsInput
            tags={epic.additionalPrograms}
            onRemove={() => {}}
            onAdd={() => {}}
          />
        </div>

        {/* Owner */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold text-muted-foreground">Owner:</label>
          <FormSelect
            value={epic.owner?.id || ''}
            options={OWNERS.map(o => ({ value: o.id, label: o.name }))}
            onChange={() => {}}
          />
        </div>
      </div>

      {/* Side Column */}
      <div className="flex flex-col gap-5">
        <ProgressIndicators epic={epic} />
        <QuickActions discussionCount={epic.discussionCount} />
      </div>
    </div>
  );
}
