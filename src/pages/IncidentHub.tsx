import React, { useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

type IncidentHubView = 'list' | 'kanban' | 'analytics' | 'insights' | 'reports' | 'committee-queue';

const VIEW_TITLES: Record<IncidentHubView, { title: string; subtitle: string }> = {
  list: { title: 'Incident List', subtitle: 'All production and QA incidents — filterable and sortable' },
  kanban: { title: 'Kanban Board', subtitle: 'Drag-and-drop incident workflow visualization' },
  analytics: { title: 'Analytics', subtitle: 'SLA metrics, resolution trends, and team performance' },
  insights: { title: 'Insights', subtitle: 'AI-powered incident pattern detection and recommendations' },
  reports: { title: 'Incident Reports', subtitle: 'Exportable reports and post-incident reviews' },
  'committee-queue': { title: 'Committee Queue', subtitle: 'L3 incidents pending CAP governance review' },
};

function SkeletonTable() {
  return (
    <div className="bg-white rounded-lg border border-[#E2E8F0] overflow-hidden">
      {/* Header row */}
      <div className="flex items-center gap-3 px-4 h-10 bg-[#F4F7FA] border-b border-[#E2E8F0]">
        {[120, 200, 80, 80, 100, 120].map((w, i) => (
          <Skeleton key={i} className="h-3 rounded" style={{ width: w }} />
        ))}
      </div>
      {/* Data rows */}
      {Array.from({ length: 8 }).map((_, row) => (
        <div key={row} className="flex items-center gap-3 px-4 h-11 border-b border-[#F1F5F9]">
          {[120, 200, 80, 80, 100, 120].map((w, i) => (
            <Skeleton key={i} className="h-3 rounded" style={{ width: w, opacity: 0.6 - row * 0.05 }} />
          ))}
        </div>
      ))}
    </div>
  );
}

function SkeletonKanban() {
  return (
    <div className="flex gap-3">
      {['TRIAGE', 'IN PROGRESS', 'IN REVIEW', 'ON HOLD', 'RESOLVED'].map(col => (
        <div key={col} className="flex-1 min-w-[220px]">
          <div className="flex items-center gap-2 mb-3 px-2">
            <Skeleton className="h-3 w-20 rounded" />
            <Skeleton className="h-5 w-5 rounded-full" />
          </div>
          <div className="space-y-2">
            {Array.from({ length: Math.floor(Math.random() * 3) + 1 }).map((_, i) => (
              <div key={i} className="bg-white rounded-lg border border-[#E2E8F0] p-3 space-y-2">
                <Skeleton className="h-3 w-3/4 rounded" />
                <Skeleton className="h-3 w-1/2 rounded" />
                <div className="flex gap-2 mt-2">
                  <Skeleton className="h-5 w-12 rounded" />
                  <Skeleton className="h-5 w-16 rounded" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function SkeletonCards({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-4 gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white rounded-lg border border-[#E2E8F0] p-4 space-y-3">
          <Skeleton className="h-3 w-24 rounded" />
          <Skeleton className="h-8 w-16 rounded" />
          <Skeleton className="h-3 w-32 rounded" />
        </div>
      ))}
    </div>
  );
}

function ViewShell({ view }: { view: IncidentHubView }) {
  const { title, subtitle } = VIEW_TITLES[view];

  return (
    <div style={{ minHeight: 'calc(100vh - 48px)', backgroundColor: '#EEF2F7', padding: 24 }}>
      <div className="mb-6">
        <h1 className="text-[22px] font-extrabold" style={{ fontFamily: '"Sora", sans-serif', color: '#080E1D' }}>{title}</h1>
        <p className="text-[13px] text-[#64748B]" style={{ fontFamily: '"Inter", sans-serif' }}>{subtitle}</p>
      </div>

      {/* View-specific skeleton states */}
      {view === 'list' && (
        <div className="space-y-4">
          <SkeletonCards count={4} />
          <SkeletonTable />
        </div>
      )}

      {view === 'kanban' && <SkeletonKanban />}

      {view === 'analytics' && (
        <div className="space-y-4">
          <SkeletonCards count={4} />
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white rounded-lg border border-[#E2E8F0] p-4 h-[300px] flex items-center justify-center">
              <Skeleton className="h-48 w-48 rounded-full" />
            </div>
            <div className="bg-white rounded-lg border border-[#E2E8F0] p-4 h-[300px]">
              <Skeleton className="h-4 w-32 rounded mb-4" />
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center gap-2 mb-3">
                  <Skeleton className="h-6 rounded" style={{ width: `${60 + Math.random() * 40}%` }} />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {view === 'insights' && (
        <div className="space-y-4">
          <div className="bg-white rounded-lg border border-[#E2E8F0] p-6">
            <div className="flex items-center gap-2 mb-4">
              <Skeleton className="h-5 w-5 rounded" />
              <Skeleton className="h-4 w-48 rounded" />
            </div>
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="bg-[#F4F7FA] rounded-lg p-4 space-y-2">
                  <Skeleton className="h-3 w-3/4 rounded" />
                  <Skeleton className="h-3 w-1/2 rounded" />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {view === 'reports' && <SkeletonTable />}

      {view === 'committee-queue' && (
        <div className="space-y-4">
          <div className="bg-[#FFFBEB] border border-[#FCD34D] rounded-lg px-4 py-3 flex items-center gap-2">
            <Skeleton className="h-4 w-4 rounded" />
            <Skeleton className="h-3 w-64 rounded" />
          </div>
          <SkeletonTable />
        </div>
      )}
    </div>
  );
}

export default function IncidentHubPage() {
  return <ViewShell view="list" />;
}

// Named exports for individual views
export function IncidentHubKanbanPage() {
  return <ViewShell view="kanban" />;
}

export function IncidentHubAnalyticsPage() {
  return <ViewShell view="analytics" />;
}

export function IncidentHubInsightsPage() {
  return <ViewShell view="insights" />;
}

export function IncidentHubReportsPage() {
  return <ViewShell view="reports" />;
}

export function IncidentHubCommitteeQueuePage() {
  return <ViewShell view="committee-queue" />;
}
