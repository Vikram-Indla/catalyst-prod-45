/**
 * Product Dependencies — canonical DependenciesView with the product data
 * adapter. Route: /product-hub/:key/dependencies (key = product code, e.g. INV).
 *
 * Storage: `br_dependencies` (product_code) — a dedicated table, because
 * business-request keys (MDT-xxx) are NOT in ph_issues and would violate
 * ph_issue_dependencies' FK. META source: business_requests. (2026-06-25)
 */

import React, { useMemo } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import DependenciesView from '@/components/shared/dependencies/DependenciesView';
import type { Dependency, DependencyCandidate, DependencyData, DependencyType, IssueMeta, Hierarchy } from '@/components/shared/dependencies/types';

/** All Business Requests render the amber lightbulb (CLAUDE.md icon registry). */
const BR_TYPE = 'Business Request';

async function resolveProductId(code: string): Promise<string | null> {
  const { data } = await (supabase as any)
    .from('products')
    .select('id')
    .eq('code', code.toUpperCase())
    .maybeSingle();
  return (data?.id as string | undefined) ?? null;
}

export default function ProductDependenciesPage() {
  const { key = '' } = useParams<{ key: string }>();
  const [searchParams] = useSearchParams();
  const focusKey = searchParams.get('focus');

  const query = useQuery({
    queryKey: ['dependencies', 'product', key],
    enabled: !!key,
    queryFn: async () => {
      const { data: rows, error } = await (supabase as any)
        .from('br_dependencies')
        .select('*')
        .eq('product_code', key)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });
      if (error) throw error;
      const deps: Dependency[] = (rows || []).map((r: any) => ({
        id: r.id,
        project_key: key,
        source_issue_key: r.source_key,
        target_issue_key: r.target_key,
        dependency_type: r.dependency_type as DependencyType,
        created_by: r.created_by ?? null,
        created_at: r.created_at,
        updated_at: r.updated_at,
        deleted_at: r.deleted_at ?? null,
      }));

      const keys = Array.from(new Set(deps.flatMap((d) => [d.source_issue_key, d.target_issue_key])));
      const issueMeta: IssueMeta = {};
      const hierarchy: Hierarchy = {};
      if (keys.length > 0) {
        const { data: brs } = await (supabase as any)
          .from('business_requests')
          .select('request_key, title, process_step')
          .in('request_key', keys);
        for (const r of (brs || []) as any[]) {
          issueMeta[r.request_key] = {
            issue_type: BR_TYPE,
            summary: r.title ?? null,
            status: r.process_step ?? null,
            status_category: null,
            parent_key: null,
            project_key: key,
          };
          hierarchy[r.request_key] = { issue_type: BR_TYPE, parent_key: null, summary: r.title ?? null };
        }
      }
      return { deps, issueMeta, hierarchy };
    },
  });

  const data: DependencyData = {
    dependencies: query.data?.deps ?? [],
    issueMeta: query.data?.issueMeta ?? {},
    hierarchy: query.data?.hierarchy ?? {},
    projects: useMemo(() => [{ project_key: key, name: key, color: null }], [key]),
    isLoading: query.isLoading,
    error: query.error,
    refetch: () => { query.refetch(); },
  };

  const fetchCandidates = async (): Promise<DependencyCandidate[]> => {
    const productId = await resolveProductId(key);
    if (!productId) return [];
    const { data: rows } = await (supabase as any)
      .from('business_requests')
      .select('request_key, title')
      .eq('product_id', productId)
      .order('request_key');
    return (rows || []).map((r: any) => ({
      value: r.request_key,
      label: `${r.request_key} — ${r.title || '(no title)'}`,
      issueType: BR_TYPE,
      projectKey: key,
    }));
  };

  const onCreate = async (s: DependencyCandidate, t: DependencyCandidate, type: DependencyType) => {
    const userId = (await supabase.auth.getUser()).data.user?.id ?? null;
    const { error } = await (supabase as any).from('br_dependencies').insert({
      product_code: key,
      source_key: s.value,
      target_key: t.value,
      dependency_type: type,
      created_by: userId,
    });
    if (error) throw error;
  };

  const onDelete = async (id: number | string) => {
    const { error } = await (supabase as any)
      .from('br_dependencies')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw error;
  };

  return (
    <DependenciesView
      hubType="product"
      scopeKey={key}
      scopeName={key}
      data={data}
      fetchCandidates={fetchCandidates}
      onCreate={onCreate}
      onDelete={onDelete}
      getTimelineHref={(k) => `/product-hub/${key}/timeline?locate=${encodeURIComponent(k)}`}
      focusKey={focusKey}
    />
  );
}
