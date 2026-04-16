import * as React from 'react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { ArrowRight, Plus, Pencil, Trash2, Zap } from 'lucide-react';
import type { CdsActivityItem, CdsActivityAction } from '../types';
import { Lozenge } from '../status/Lozenge';
import type { CdsAppearance } from '../types';

function getInitials(name: string): string {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
}

function formatRelativeTime(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  if (diffDay < 30) return `${Math.floor(diffDay / 7)}w ago`;

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const actionConfig: Record<
  CdsActivityAction,
  { icon: React.ElementType; bg: string; darkBg: string; color: string }
> = {
  create: { icon: Plus, bg: 'bg-[#E3FCEF]', darkBg: 'dark:bg-[#1C3D2E]', color: 'text-[#006644] dark:text-[#57D9A3]' },
  update: { icon: Pencil, bg: 'bg-[#DEEBFF]', darkBg: 'dark:bg-[#1C3A5C]', color: 'text-[#0747A6] dark:text-[#4C9AFF]' },
  delete: { icon: Trash2, bg: 'bg-[#FFEBE6]', darkBg: 'dark:bg-[#4A1A1A]', color: 'text-[#BF2600] dark:text-[#FF5630]' },
  comment: { icon: Zap, bg: 'bg-[#EAE6FF]', darkBg: 'dark:bg-[#2D2359]', color: 'text-[#403294] dark:text-[#B8ACF6]' },
};

function formatFieldName(field: string): string {
  return field
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatDisplayValue(value: string | null): string {
  if (value === null || value === 'null' || value === '') return 'None';

  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(value)) {
    try {
      return new Date(value).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      // fall through
    }
  }

  return value;
}

function statusAppearance(value: string | null): CdsAppearance | undefined {
  if (!value) return undefined;
  const v = value.toLowerCase().replace(/[_\s]/g, '');
  if (['done', 'approved', 'completed', 'closed', 'resolved'].includes(v)) return 'success';
  if (['inprogress', 'inreview', 'analyse', 'implement', 'readytoimpl'].includes(v)) return 'inprogress';
  if (['rejected', 'cancelled'].includes(v)) return 'danger';
  if (['onhold'].includes(v)) return 'warning';
  return 'default';
}

export interface ActivityItemProps {
  item: CdsActivityItem;
  className?: string;
}

function ActivityItemDisplay({ item, className }: ActivityItemProps) {
  const { type, actor, timestamp, fieldChange, description } = item;
  const config = actionConfig[type];
  const Icon = config.icon;

  const isFieldChangeOnStatus =
    fieldChange &&
    ['process_step', 'status', 'health'].includes(fieldChange.field.toLowerCase().replace(/\s/g, '_'));

  return (
    <div className={cn('flex gap-3 py-3', className)}>
      <div
        className={cn(
          'h-8 w-8 rounded-full flex items-center justify-center shrink-0',
          config.bg,
          config.darkBg
        )}
      >
        <Icon className={cn('h-3.5 w-3.5', config.color)} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[13px] font-semibold text-[#172B4D] dark:text-[#EDEDED]">
            {actor.name}
          </span>

          {type === 'create' && (
            <span className="text-[13px] text-[#6B778C] dark:text-[#A1A1A1]">
              {description || 'created this item'}
            </span>
          )}

          {type === 'update' && fieldChange && (
            <span className="text-[13px] text-[#6B778C] dark:text-[#A1A1A1]">
              changed <span className="font-medium text-[#172B4D] dark:text-[#EDEDED]">{formatFieldName(fieldChange.field)}</span>
            </span>
          )}

          {type === 'delete' && (
            <span className="text-[13px] text-[#6B778C] dark:text-[#A1A1A1]">
              {description || 'deleted this item'}
            </span>
          )}

          <span className="text-[12px] text-[#6B778C] dark:text-[#878787]">
            {formatRelativeTime(timestamp)}
          </span>
        </div>

        {type === 'update' && fieldChange && (
          <div className="flex items-center gap-2 mt-1.5">
            {isFieldChangeOnStatus ? (
              <>
                <Lozenge appearance={statusAppearance(fieldChange.oldValue)}>
                  {formatDisplayValue(fieldChange.oldValue)}
                </Lozenge>
                <ArrowRight className="h-3 w-3 text-[#6B778C] dark:text-[#878787] shrink-0" />
                <Lozenge appearance={statusAppearance(fieldChange.newValue)}>
                  {formatDisplayValue(fieldChange.newValue)}
                </Lozenge>
              </>
            ) : (
              <>
                <span className="text-[13px] text-[#6B778C] dark:text-[#A1A1A1] line-through">
                  {formatDisplayValue(fieldChange.oldValue)}
                </span>
                <ArrowRight className="h-3 w-3 text-[#6B778C] dark:text-[#878787] shrink-0" />
                <span className="text-[13px] font-medium text-[#172B4D] dark:text-[#EDEDED]">
                  {formatDisplayValue(fieldChange.newValue)}
                </span>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export { ActivityItemDisplay as ActivityItem };
