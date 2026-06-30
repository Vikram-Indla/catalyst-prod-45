/**
 * MilestoneDetailPage — /product-hub/:key/milestones/:milestoneId
 *
 * Mirrors SprintDetailPage layout for product-hub milestones.
 * Queries product_milestones directly (not via service) so it degrades
 * gracefully when business_request_milestone_links is absent on staging.
 */
import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Button from '@atlaskit/button/new';
import ChevronRightIcon from '@atlaskit/icon/glyph/chevron-right';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ProjectPageHeader } from '@/components/layout/ProjectPageHeader';

interface MilestoneRow {
  id: string;
  key: string;
  title: string;
  status: string;
  description: string | null;
  start_date: string | null;
  target_date: string | null;
  quarter: string | null;
  product_id: string;
}

interface LinkedBR {
  id: string;
  key: string;
  title: string;
}

function useProduct(productCode: string) {
  return useQuery({
    queryKey: ['product-by-code', productCode],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, code')
        .eq('code', productCode)
        .maybeSingle();
      if (error) throw error;
      return data as { id: string; name: string; code: string } | null;
    },
    staleTime: 5 * 60 * 1000,
  });
}

function useMilestone(milestoneId: string | undefined) {
  return useQuery({
    queryKey: ['product-milestone-detail', milestoneId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('product_milestones')
        .select('*')
        .eq('id', milestoneId!)
        .single();
      if (error) throw error;
      return data as MilestoneRow;
    },
    enabled: !!milestoneId,
  });
}

function useLinkedBRs(milestoneId: string | undefined) {
  return useQuery({
    queryKey: ['product-milestone-brs', milestoneId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('business_request_milestone_links')
        .select('business_requests(id, request_key, title)')
        .eq('milestone_id', milestoneId!);
      if (error) return [] as LinkedBR[];
      return ((data as any[]) || []).map((link: any) => ({
        id: link.business_requests?.id ?? '',
        key: link.business_requests?.request_key ?? '',
        title: link.business_requests?.title ?? '',
      })) as LinkedBR[];
    },
    enabled: !!milestoneId,
  });
}

const STATUS_LABELS: Record<string, string> = {
  planned: 'Planned',
  in_progress: 'In Progress',
  at_risk: 'At Risk',
  completed: 'Completed',
  delivered: 'Delivered',
  archived: 'Archived',
};

export function MilestoneDetailPage() {
  const { key: productCode = '', milestoneId } = useParams<{ key: string; milestoneId: string }>();
  const navigate = useNavigate();

  const { data: product } = useProduct(productCode);
  const { data: milestone, isLoading, error } = useMilestone(milestoneId);
  const { data: linkedBRs = [] } = useLinkedBRs(milestoneId);

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  if (isLoading) return <div style={{ padding: 24, color: 'var(--ds-text)' }}>Loading milestone…</div>;
  if (error || !milestone) return <div style={{ padding: 24, color: 'var(--ds-text-danger)' }}>Milestone not found.</div>;

  const listHref = `/product-hub/${productCode}/milestones`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <ProjectPageHeader
        hubType="product"
        projectKey={productCode}
        title={milestone.title}
        actions={
          <Button
            appearance="subtle"
            onClick={() => navigate(listHref)}
            iconBefore={(p) => <ChevronRightIcon {...p} label="" size="small" />}
          >
            Back to Milestones
          </Button>
        }
      />

      <div style={{ flex: 1, display: 'flex', minHeight: 0, overflow: 'hidden' }}>
        {/* Main content */}
        <div style={{ flex: 1, minWidth: 0, overflowY: 'auto', padding: '24px 32px', display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Breadcrumb */}
          <nav style={{ fontSize: 'var(--ds-font-size-100)', color: 'var(--ds-text-subtle)', display: 'flex', gap: 4, alignItems: 'center' }}>
            <button
              type="button"
              onClick={() => navigate(listHref)}
              style={{ all: 'unset', cursor: 'pointer', color: 'var(--ds-link)' }}
            >
              {product?.name ?? productCode}
            </button>
            <span>/</span>
            <button
              type="button"
              onClick={() => navigate(listHref)}
              style={{ all: 'unset', cursor: 'pointer', color: 'var(--ds-link)' }}
            >
              Milestones
            </button>
            <span>/</span>
            <span style={{ color: 'var(--ds-text)' }}>{milestone.title}</span>
          </nav>

          {/* Title */}
          <h1 style={{ margin: 0, fontSize: 'var(--ds-font-size-800)', fontWeight: 700, color: 'var(--ds-text)' }}>
            {milestone.title}
          </h1>

          {/* Description */}
          {milestone.description && (
            <p style={{ margin: 0, fontSize: 'var(--ds-font-size-200)', color: 'var(--ds-text-subtle)', whiteSpace: 'pre-wrap' }}>
              {milestone.description}
            </p>
          )}

          {/* Linked Business Requests */}
          <section>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <h2 style={{ margin: 0, fontSize: 'var(--ds-font-size-300)', fontWeight: 600, color: 'var(--ds-text)' }}>
                Business Requests ({linkedBRs.length})
              </h2>
            </div>

            {linkedBRs.length === 0 ? (
              <div style={{ padding: '32px 0', textAlign: 'center', color: 'var(--ds-text-subtlest)', fontSize: 'var(--ds-font-size-200)' }}>
                No business requests linked to this milestone yet.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 1, border: '1px solid var(--ds-border)', borderRadius: 4, overflow: 'hidden' }}>
                {linkedBRs.map((br) => (
                  <div
                    key={br.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '10px 16px',
                      background: 'var(--ds-surface)',
                      borderBottom: '1px solid var(--ds-border)',
                      fontSize: 'var(--ds-font-size-200)',
                    }}
                  >
                    <span style={{ color: 'var(--ds-link)', fontWeight: 500, flexShrink: 0 }}>{br.key}</span>
                    <span style={{ color: 'var(--ds-text)', flex: 1 }}>{br.title}</span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Sidebar divider */}
        <div style={{ position: 'relative', alignSelf: 'stretch', width: 1, background: 'var(--ds-border)', flexShrink: 0 }}>
          <button
            type="button"
            aria-label={sidebarCollapsed ? 'Expand details panel' : 'Collapse details panel'}
            onClick={() => setSidebarCollapsed((v) => !v)}
            style={{
              all: 'unset',
              cursor: 'pointer',
              position: 'absolute',
              top: 24,
              left: '50%',
              transform: 'translateX(-50%)',
              width: 24,
              height: 24,
              borderRadius: '50%',
              background: 'var(--ds-surface)',
              border: '1px solid var(--ds-border)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--ds-text-subtle)',
              boxShadow: 'var(--ds-shadow-raised)',
              zIndex: 1,
            }}
          >
            <ChevronRightIcon label="" size="small" />
          </button>
        </div>

        {/* Sidebar */}
        {!sidebarCollapsed && (
          <div style={{ width: 320, flexShrink: 0, height: '100%', overflowY: 'auto', padding: '24px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Status */}
              <div>
                <div style={{ fontSize: 'var(--ds-font-size-100)', fontWeight: 600, color: 'var(--ds-text-subtle)', marginBottom: 4 }}>Status</div>
                <span style={{
                  display: 'inline-block',
                  padding: '2px 8px',
                  border: '1px solid var(--ds-border)',
                  borderRadius: 3,
                  fontSize: 'var(--ds-font-size-100)',
                  fontWeight: 700,
                  color: 'var(--ds-text)',
                  letterSpacing: '0.04em',
                }}>
                  {STATUS_LABELS[milestone.status] ?? milestone.status.toUpperCase()}
                </span>
              </div>

              {/* Dates */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <div style={{ fontSize: 'var(--ds-font-size-100)', fontWeight: 600, color: 'var(--ds-text-subtle)', marginBottom: 4 }}>Start date</div>
                  <div style={{ fontSize: 'var(--ds-font-size-200)', color: milestone.start_date ? 'var(--ds-text)' : 'var(--ds-text-subtlest)' }}>
                    {milestone.start_date
                      ? new Date(milestone.start_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
                      : '—'}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 'var(--ds-font-size-100)', fontWeight: 600, color: 'var(--ds-text-subtle)', marginBottom: 4 }}>Target date</div>
                  <div style={{ fontSize: 'var(--ds-font-size-200)', color: milestone.target_date ? 'var(--ds-text)' : 'var(--ds-text-subtlest)' }}>
                    {milestone.target_date
                      ? new Date(milestone.target_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
                      : '—'}
                  </div>
                </div>
              </div>

              {/* Quarter */}
              {milestone.quarter && (
                <div>
                  <div style={{ fontSize: 'var(--ds-font-size-100)', fontWeight: 600, color: 'var(--ds-text-subtle)', marginBottom: 4 }}>Quarter</div>
                  <div style={{ fontSize: 'var(--ds-font-size-200)', color: 'var(--ds-text)' }}>{milestone.quarter}</div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
