/**
 * IssueCenterPanel — Center panel with issue content
 * ════════════════════════════════════════════════════════════════════════════
 * Header: breadcrumb, title, status transition, actions
 * Body: description, attachments, activity stream
 */
import { useState } from 'react';
import { cn } from '@/lib/utils';
import {
  ChevronRight, MoreHorizontal, Pencil, Link2, ArrowRightLeft,
  Trash2, Paperclip, Download, MessageSquare, History, Clock,
  FileText, Image, Loader2,
} from 'lucide-react';
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';
import { StatusLozenge } from '@/components/ui/StatusLozenge';
import type { AllWorkItem } from '@/types/allwork.types';
import { formatDistanceToNow } from 'date-fns';

interface IssueCenterPanelProps {
  issueKey: string | null;
  isDark: boolean;
  item?: AllWorkItem | null;
  parentItem?: AllWorkItem | null;
  loading?: boolean;
}

type ActivityTab = 'all' | 'comments' | 'history' | 'worklog';

function formatRelative(date: string | null): string {
  if (!date) return '';
  try {
    return formatDistanceToNow(new Date(date), { addSuffix: true });
  } catch {
    return '';
  }
}

function SectionHeader({
  title,
  isDark,
  count,
  children,
}: {
  title: string;
  isDark: boolean;
  count?: number;
  children?: React.ReactNode;
}) {
  return (
    <div className={cn(
      'flex items-center justify-between px-6 py-3 border-b',
      isDark ? 'border-[#2E2E2E]' : 'border-[#DFE1E6]',
    )}>
      <div className="flex items-center gap-2">
        <h3 className={cn(
          'font-heading text-sm font-medium',
          isDark ? 'text-[#EDEDED]' : 'text-[#292A2E]',
        )}>
          {title}
        </h3>
        {count !== undefined && (
          <span className={cn(
            'inline-flex items-center justify-center px-1.5 min-w-[20px] h-5 rounded-full text-xs font-body font-medium',
            isDark ? 'bg-[#292929] text-[#A1A1A1]' : 'bg-[#F4F5F7] text-[#505258]',
          )}>
            {count}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

export function IssueCenterPanel({
  issueKey,
  isDark,
  item,
  parentItem,
  loading = false,
}: IssueCenterPanelProps) {
  const [activityTab, setActivityTab] = useState<ActivityTab>('all');
  const [isEditingDescription, setIsEditingDescription] = useState(false);

  if (!issueKey) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className={cn('font-body text-sm', isDark ? 'text-[#878787]' : 'text-[#6B6E76]')}>
          Select an issue to view details
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex-1 overflow-y-auto">
        {/* Skeleton header */}
        <div className={cn('px-6 py-5 border-b', isDark ? 'border-[#2E2E2E]' : 'border-[#DFE1E6]')}>
          <div className={cn('h-3 w-32 rounded mb-3 animate-pulse', isDark ? 'bg-[#292929]' : 'bg-[#E2E8F0]')} />
          <div className={cn('h-7 w-3/4 rounded mb-4 animate-pulse', isDark ? 'bg-[#292929]' : 'bg-[#E2E8F0]')} />
          <div className="flex gap-2">
            <div className={cn('h-8 w-20 rounded animate-pulse', isDark ? 'bg-[#292929]' : 'bg-[#E2E8F0]')} />
            <div className={cn('h-8 w-8 rounded animate-pulse', isDark ? 'bg-[#292929]' : 'bg-[#E2E8F0]')} />
          </div>
        </div>
        {/* Skeleton body */}
        <div className="px-6 py-6 space-y-3 animate-pulse">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className={cn('h-4 rounded', isDark ? 'bg-[#292929]' : 'bg-[#E2E8F0]')} style={{ width: `${80 - i * 15}%` }} />
          ))}
        </div>
      </div>
    );
  }

  const ACTIVITY_TABS: { key: ActivityTab; label: string; icon: React.ReactNode }[] = [
    { key: 'all', label: 'All', icon: <FileText className="w-3.5 h-3.5" /> },
    { key: 'comments', label: 'Comments', icon: <MessageSquare className="w-3.5 h-3.5" /> },
    { key: 'history', label: 'History', icon: <History className="w-3.5 h-3.5" /> },
    { key: 'worklog', label: 'Work log', icon: <Clock className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="flex-1 overflow-y-auto">
      {/* ─── Header block ─── */}
      <div className={cn('px-6 py-5 border-b', isDark ? 'border-[#2E2E2E]' : 'border-[#DFE1E6]')}>
        {/* Breadcrumb */}
        {parentItem && (
          <div className="flex items-center gap-1.5 mb-2">
            <JiraIssueTypeIcon issueType={parentItem.issue_type} size={14} />
            <span className={cn('font-mono text-xs', isDark ? 'text-[#878787]' : 'text-[#505258]')}>
              {parentItem.issue_key}
            </span>
            <ChevronRight className="w-3 h-3 text-[#878787]" />
            <span className={cn('font-mono text-xs font-medium', isDark ? 'text-[#A1A1A1]' : 'text-[#292A2E]')}>
              {issueKey}
            </span>
          </div>
        )}

        {/* Title row */}
        <div className="flex items-start gap-3 mb-4">
          {item && <JiraIssueTypeIcon issueType={item.issue_type} size={20} />}
          <div className="flex-1 min-w-0">
            <span className={cn(
              'font-mono text-xs block mb-1',
              isDark ? 'text-[#878787]' : 'text-[#505258]',
            )}>
              {issueKey}
            </span>
            <h1 className={cn(
              'font-heading text-issue-title leading-tight',
              isDark ? 'text-[#EDEDED]' : 'text-[#292A2E]',
            )}>
              {item?.summary ?? 'Untitled Issue'}
            </h1>
          </div>
        </div>

        {/* Primary actions */}
        <div className="flex items-center gap-2">
          {item && <StatusLozenge status={item.status} />}
          <button className={cn(
            'inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-sm font-body font-medium transition-colors',
            isDark
              ? 'text-[#A1A1A1] hover:bg-[#1F1F1F]'
              : 'text-[#505258] hover:bg-[#F4F5F7]',
          )}>
            <Link2 className="w-3.5 h-3.5" />
            Link
          </button>
          <button className={cn(
            'inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-sm font-body font-medium transition-colors',
            isDark
              ? 'text-[#A1A1A1] hover:bg-[#1F1F1F]'
              : 'text-[#505258] hover:bg-[#F4F5F7]',
          )}>
            <ArrowRightLeft className="w-3.5 h-3.5" />
            Move
          </button>
          <button className={cn(
            'p-1.5 rounded-md transition-colors ml-auto',
            isDark ? 'text-[#A1A1A1] hover:bg-[#1F1F1F]' : 'text-[#505258] hover:bg-[#F4F5F7]',
          )}>
            <MoreHorizontal className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ─── Description section ─── */}
      <div className={cn('border-b', isDark ? 'border-[#2E2E2E]' : 'border-[#DFE1E6]')}>
        <SectionHeader title="Description" isDark={isDark}>
          <button
            onClick={() => setIsEditingDescription(!isEditingDescription)}
            className={cn(
              'p-1 rounded transition-colors',
              isDark ? 'text-[#A1A1A1] hover:bg-[#1F1F1F]' : 'text-[#505258] hover:bg-[#F4F5F7]',
            )}
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
        </SectionHeader>
        <div className="px-6 py-4">
          {item?.description_text ? (
            <div className={cn(
              'font-body text-sm leading-relaxed whitespace-pre-wrap',
              isDark ? 'text-[#EDEDED]' : 'text-[#292A2E]',
            )}>
              {item.description_text}
            </div>
          ) : (
            <p className={cn('font-body text-sm italic', isDark ? 'text-[#878787]' : 'text-[#6B6E76]')}>
              No description provided.
            </p>
          )}
        </div>
      </div>

      {/* ─── Attachments section ─── */}
      {(item?.attachment_count ?? 0) > 0 && (
        <div className={cn('border-b', isDark ? 'border-[#2E2E2E]' : 'border-[#DFE1E6]')}>
          <SectionHeader title="Attachments" isDark={isDark} count={item?.attachment_count} />
          <div className="px-6 py-4">
            <div className="grid grid-cols-2 gap-3">
              {/* Placeholder attachment cards */}
              {Array.from({ length: Math.min(item?.attachment_count ?? 0, 4) }).map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    'flex items-center gap-3 p-3 rounded-lg border transition-colors cursor-pointer',
                    isDark
                      ? 'border-[#2E2E2E] hover:bg-[#1F1F1F]'
                      : 'border-[#DFE1E6] hover:bg-[#F4F5F7]',
                  )}
                >
                  <div className={cn(
                    'w-10 h-10 rounded-md flex items-center justify-center shrink-0',
                    isDark ? 'bg-[#292929]' : 'bg-[#F4F5F7]',
                  )}>
                    <Image className={cn('w-5 h-5', isDark ? 'text-[#878787]' : 'text-[#505258]')} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn('font-body text-sm truncate', isDark ? 'text-[#EDEDED]' : 'text-[#292A2E]')}>
                      attachment-{i + 1}.png
                    </p>
                    <p className={cn('font-body text-xs', isDark ? 'text-[#878787]' : 'text-[#6B6E76]')}>
                      Image
                    </p>
                  </div>
                  <button className={cn(
                    'p-1 rounded shrink-0 transition-colors',
                    isDark ? 'text-[#878787] hover:bg-[#292929]' : 'text-[#505258] hover:bg-[#E2E8F0]',
                  )}>
                    <Download className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ─── Activity stream ─── */}
      <div>
        <SectionHeader title="Activity" isDark={isDark}>
          <div className="flex items-center gap-1">
            {ACTIVITY_TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActivityTab(tab.key)}
                className={cn(
                  'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-body font-medium transition-colors',
                  activityTab === tab.key
                    ? isDark
                      ? 'bg-[#1F1F1F] text-[#EDEDED]'
                      : 'bg-[#E9F2FF] text-[#0C66E4]'
                    : isDark
                      ? 'text-[#878787] hover:bg-[#1F1F1F]'
                      : 'text-[#505258] hover:bg-[#F4F5F7]',
                )}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </SectionHeader>

        <div className="px-6 py-4">
          {/* Comment composer */}
          <div className={cn(
            'flex items-start gap-3 p-3 rounded-lg border mb-4',
            isDark ? 'border-[#2E2E2E]' : 'border-[#DFE1E6]',
          )}>
            <div className={cn(
              'w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-body font-semibold',
              isDark ? 'bg-[#292929] text-[#A1A1A1]' : 'bg-[#DFE1E6] text-[#505258]',
            )}>
              Y
            </div>
            <div className="flex-1">
              <textarea
                placeholder="Add a comment..."
                rows={2}
                className={cn(
                  'w-full bg-transparent border-none outline-none resize-none font-body text-sm',
                  isDark ? 'text-[#EDEDED] placeholder:text-[#878787]' : 'text-[#292A2E] placeholder:text-[#878787]',
                )}
              />
            </div>
          </div>

          {/* Empty activity state */}
          <div className="text-center py-8">
            <p className={cn('font-body text-sm', isDark ? 'text-[#878787]' : 'text-[#6B6E76]')}>
              No activity yet
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
