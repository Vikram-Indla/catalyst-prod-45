/**
 * useFilterOptionPools — live data pools for the JiraFilterAtlaskit option sets.
 * Queries ph_issues for distinct values scoped to a project key.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type {
  AssigneeOption,
  ReporterOption,
  StatusFilterOption,
  WorkTypeOption,
  FixVersionOption,
  LabelOption,
} from '@/components/shared/JiraFilterAtlaskit';
import type { LozengeAppearance } from '@/components/shared/JiraTable';
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';
import React from 'react';

const STATUS_CATEGORY_APPEARANCE: Record<string, LozengeAppearance> = {
  done:       'success',
  inprogress: 'inprogress',
  todo:       'default',
  new:        'default',
};

const ISSUE_TYPE_ORDER = [
  'Epic', 'Feature', 'Story', 'Task', 'Sub-task',
  'Bug', 'QA Bug', 'Production Incident', 'Change Request',
  'Business Gap', 'API Requirement', 'Backend',
];

export interface FilterOptionPools {
  assignees:    AssigneeOption[];
  reporters:    ReporterOption[];
  statuses:     StatusFilterOption[];
  workTypes:    WorkTypeOption[];
  fixVersions:  FixVersionOption[];
  labels:       LabelOption[];
  isLoading:    boolean;
}

export function useFilterOptionPools(projectKey?: string): FilterOptionPools {
  const { data, isLoading } = useQuery({
    queryKey: ['filter-option-pools', projectKey ?? 'global'],
    queryFn: async () => {
      let q = supabase
        .from('ph_issues')
        .select(
          'assignee_account_id, assignee_display_name, reporter_account_id, reporter_display_name, status, status_category, issue_type, fix_versions, labels'
        )
        .is('deleted_at', null)
        .limit(2000);

      if (projectKey) {
        q = q.eq('project_key', projectKey.toUpperCase());
      }

      const { data, error } = await q;
      if (error) throw new Error(error.message);
      return data ?? [];
    },
    staleTime: 60_000,
    select: (rows) => {
      // ── Assignees ──────────────────────────────────────────────────────────
      const assigneeMap = new Map<string, AssigneeOption>();
      for (const r of rows) {
        if (r.assignee_account_id && !assigneeMap.has(r.assignee_account_id)) {
          assigneeMap.set(r.assignee_account_id, {
            id: r.assignee_account_id,
            name: r.assignee_display_name ?? r.assignee_account_id,
          });
        }
      }

      // ── Reporters ─────────────────────────────────────────────────────────
      const reporterMap = new Map<string, ReporterOption>();
      for (const r of rows) {
        if (r.reporter_account_id && !reporterMap.has(r.reporter_account_id)) {
          reporterMap.set(r.reporter_account_id, {
            id: r.reporter_account_id,
            name: r.reporter_display_name ?? r.reporter_account_id,
          });
        }
      }

      // ── Statuses ──────────────────────────────────────────────────────────
      const statusMap = new Map<string, StatusFilterOption>();
      for (const r of rows) {
        if (r.status && !statusMap.has(r.status)) {
          statusMap.set(r.status, {
            value: r.status,
            label: r.status,
            appearance: (STATUS_CATEGORY_APPEARANCE[r.status_category ?? ''] ?? 'default') as LozengeAppearance,
          });
        }
      }

      // ── Work types ────────────────────────────────────────────────────────
      const typeMap = new Map<string, WorkTypeOption>();
      for (const r of rows) {
        if (r.issue_type && !typeMap.has(r.issue_type)) {
          typeMap.set(r.issue_type, {
            id: r.issue_type,
            label: r.issue_type,
            icon: React.createElement(JiraIssueTypeIcon, { type: r.issue_type, size: 14 }),
          });
        }
      }
      const workTypes = [...typeMap.values()].sort((a, b) => {
        const ia = ISSUE_TYPE_ORDER.indexOf(a.label);
        const ib = ISSUE_TYPE_ORDER.indexOf(b.label);
        return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
      });

      // ── Fix versions ──────────────────────────────────────────────────────
      const fvSet = new Set<string>();
      for (const r of rows) {
        const fv = r.fix_versions;
        if (!fv) continue;
        const arr: string[] = Array.isArray(fv)
          ? (fv as any[]).map((v: any) => typeof v === 'string' ? v : v?.name ?? '').filter(Boolean)
          : typeof fv === 'string' ? [fv] : [];
        arr.forEach(v => fvSet.add(v));
      }
      const fixVersions: FixVersionOption[] = [...fvSet]
        .sort()
        .map(v => ({ id: v, label: v }));

      // ── Labels ────────────────────────────────────────────────────────────
      const labelSet = new Set<string>();
      for (const r of rows) {
        const lb = r.labels;
        if (!lb) continue;
        const arr: string[] = Array.isArray(lb)
          ? (lb as any[]).map((v: any) => typeof v === 'string' ? v : '').filter(Boolean)
          : [];
        arr.forEach(l => labelSet.add(l));
      }
      const labels: LabelOption[] = [...labelSet]
        .sort()
        .map(l => ({ id: l, label: l }));

      return {
        assignees:   [...assigneeMap.values()].sort((a, b) => a.name.localeCompare(b.name)),
        reporters:   [...reporterMap.values()].sort((a, b) => a.name.localeCompare(b.name)),
        statuses:    [...statusMap.values()].sort((a, b) => a.label.localeCompare(b.label)),
        workTypes,
        fixVersions,
        labels,
      };
    },
  });

  return {
    assignees:   data?.assignees   ?? [],
    reporters:   data?.reporters   ?? [],
    statuses:    data?.statuses    ?? [],
    workTypes:   data?.workTypes   ?? [],
    fixVersions: data?.fixVersions ?? [],
    labels:      data?.labels      ?? [],
    isLoading,
  };
}
