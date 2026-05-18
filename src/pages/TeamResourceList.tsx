import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTeamResources } from '@/hooks/useTeamResources';
import { Spinner } from '@/components/ads/Spinner';
import { EmptyState } from '@/components/ads/EmptyState';

interface TeamResourceListProps {
  projectIds: string[];
}

const centered: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: '40vh',
  padding: 24,
  fontFamily: 'var(--cp-font-body)',
};

export default function TeamResourceList({ projectIds }: TeamResourceListProps) {
  const navigate = useNavigate();
  const { resources, isLoading, isError } = useTeamResources(projectIds);

  if (isLoading) {
    return (
      <div style={centered} aria-busy="true">
        <Spinner size="large" aria-label="Loading team members" />
      </div>
    );
  }

  if (isError) {
    return (
      <div style={centered}>
        <EmptyState
          header="Couldn't load team members"
          description="Something went wrong. Please try again later."
        />
      </div>
    );
  }

  if (resources.length === 0) {
    return (
      <div style={centered}>
        <EmptyState
          header="No team members found"
          description="No resource records are linked to members of your projects."
        />
      </div>
    );
  }

  return (
    <div style={{ padding: 24, fontFamily: 'var(--cp-font-body)' }}>
      {resources.map((r) => (
        <div
          key={r.resourceId}
          onClick={() => navigate(`/my-team/${r.resourceId}`)}
          style={{ cursor: 'pointer', padding: '8px 0', borderBottom: '1px solid var(--ds-border, var(--cp-border, var(--cp-bg-sunken, #E2E8F0)))' }}
        >
          <span style={{ fontSize: 14, color: 'var(--ds-text, var(--cp-text-primary, #172B4D))' }}>{r.displayName}</span>
        </div>
      ))}
    </div>
  );
}
