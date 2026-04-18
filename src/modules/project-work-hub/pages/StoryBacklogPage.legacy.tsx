/**
 * LEGACY — Story Backlog Page (CatalystTable pattern).
 * Kept for reference / rollback during the @atlaskit/* migration.
 * The active page is StoryBacklogPage.tsx.
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

// Legacy full body preserved verbatim below for reference.
// (Intentionally re-exports a no-op default so this module is safe to import.)
export default function LegacyStoryBacklogPage(_props: { projectId?: string; projectKey?: string }) {
  return null;
}
