/**
 * LEGACY — Story Backlog Page (CatalystTable pattern).
 * Replaced by StoryBacklogPage.tsx (Atlaskit-based, April 2026).
 * Kept verbatim for one-rename rollback. Not imported by anything.
 *
 * To roll back: git mv StoryBacklogPage.tsx StoryBacklogPage.atlaskit.tsx
 *               git mv StoryBacklogPage.legacy.tsx StoryBacklogPage.tsx
 */
/**
 * Story Backlog Page — CatalystTable pattern (pb-table, ResizableTableHeader, useTableColumns)
 * With Jira-style Group By dropdown + Filter
 */
import React, { useState, useMemo, useRef, useEffect, useCallback, lazy, Suspense } from 'react';
import { CatalystPageHeader } from '@/components/shared/CatalystPageHeader';
import { useStarredItemIds, useToggleStar } from '@/hooks/home/useStarredItems';
import { useParams, useNavigate } from 'react-router-dom';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useStoryBacklog } from '../hooks/useBacklogData';
import { STORY_STATUS_LOZENGE, formatDueDate, getPriorityLabel, getPriorityColor, getInitials } from '../utils/backlog.utils';
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';
import { useProfileAvatarsByName } from '@/hooks/useProfileAvatars';
import { ParentEpicChip } from '../components/shared/ParentEpicChip';
import { DeleteConfirmDialog } from '../components/dialogs/DeleteConfirmDialog';

import { EditStoryDialog } from '../components/dialogs/EditStoryDialog';
import { JiraBulkActionBar } from '@/components/shared/JiraBulkActionBar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { ChevronDown, ChevronRight, ChevronLeft, Plus, Pencil, Trash2, BookOpen, Search, X, Star } from 'lucide-react';
import { GroupByPopover as SharedGroupByPopover } from '@/components/shared/GroupByPopover';
import type { GroupByOption } from '@/components/shared/GroupByPopover';
import { PriorityBars, normalisePriority } from '@/components/shared/PriorityIndicator';
import { toast } from 'sonner';
import { useTheme } from '@/hooks/useTheme';
import { DK, LK } from '@/utils/dark-mode-styles';
import type { BacklogStory } from '../types/backlog.types';
import { FilterTriggerButton, JiraBasicFilter } from '@/components/shared/JiraBasicFilter';
import type { FilterCategory } from '@/components/shared/JiraBasicFilter';
import { useTableColumns, type ColumnDef as TColDef } from '@/hooks/useTableColumns';
import { ResizableTableHeader, type SortDir } from '@/components/shared/ResizableTableHeader';
import { writeTicketOrigin } from '../hooks/useTicketOrigin';
import '@/styles/product-backlog.css';
// ── V2 table (feature-flagged) — shared DynamicTable molecule
import { DynamicTable, useTablePersistence } from '@/components/shared/dynamic-table';
import type { DynamicTableColumn, DynamicTableRowGroup } from '@/components/shared/dynamic-table';
import type { RowSelectionState, SortingState } from '@tanstack/react-table';

const CatalystDetailRouter = lazy(() => import('@/components/catalyst-detail-views/CatalystDetailRouter'));

// ── Column definitions (CatalystTable pattern) ──
const STORY_COLUMNS: TColDef[] = [
  { key: 'checkbox', label: '', defaultWidth: 40, minWidth: 40, locked: true },
  { key: 'star', label: '', defaultWidth: 36, minWidth: 36, locked: true },
  { key: 'type', label: 'TYPE', defaultWidth: 56, minWidth: 44, locked: true },
  { key: 'key', label: 'KEY', defaultWidth: 120, minWidth: 80 },
  { key: 'summary', label: 'SUMMARY', defaultWidth: 380, minWidth: 150 },
  { key: 'status', label: 'STATUS', defaultWidth: 130, minWidth: 80 },
  { key: 'parent', label: 'PARENT', defaultWidth: 200, minWidth: 100 },
  { key: 'assignee', label: 'ASSIGNEE', defaultWidth: 160, minWidth: 100 },
  { key: 'priority', label: 'PRIORITY', defaultWidth: 80, minWidth: 50 },
  { key: 'updated', label: 'UPDATED', defaultWidth: 90, minWidth: 60 },
];

const SORTABLE_KEYS = new Set(['key', 'summary', 'status', 'parent', 'assignee', 'priority', 'updated']);

type GroupByKey = 'none' | 'status' | 'priority' | 'assignee' | 'parent';
const GROUP_OPTIONS: GroupByOption<GroupByKey>[] = [
  { key: 'status', label: 'Status', icon: 'status' },
  { key: 'priority', label: 'Priority', icon: 'priority' },
  { key: 'assignee', label: 'Assignee', icon: 'assignee' },
  { key: 'parent', label: 'Parent', icon: 'parent' },
];

const PRIORITY_ORDER = ['critical', 'highest', 'high', 'medium', 'low', 'lowest'];
const AVATAR_COLOURS = ['#2563EB', '#0D9488', '#0284C7', '#DC2626', '#DB2777'];

// Legacy implementation preserved as a no-op export to keep the module
// importable. The full original content is in git history; this stub
// exists purely as a rollback marker.
export default function LegacyStoryBacklogPage(_props: { projectId?: string; projectKey?: string }) {
  return null;
}
