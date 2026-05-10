import React from 'react';
import { useMyLeadProjects } from '@/hooks/useMyLeadProjects';
import TeamResourceList from '@/pages/TeamResourceList';
import { Spinner } from '@/components/ads/Spinner';
import { EmptyState } from '@/components/ads/EmptyState';

const centered: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: '60vh',
  padding: 24,
  fontFamily: 'var(--cp-font-body)',
};

export default function MyTeamPage() {
  const { projects, isLoading, isError } = useMyLeadProjects();

  if (isLoading) {
    return (
      <div data-testid="my-team-loading" style={centered} aria-busy="true">
        <Spinner size="large" aria-label="Loading your team" />
      </div>
    );
  }

  if (isError) {
    return (
      <div data-testid="my-team-error" style={centered}>
        <EmptyState
          header="Couldn't load your team"
          description="Something went wrong fetching your projects. Please try again later."
        />
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div data-testid="my-team-empty" style={centered}>
        <EmptyState
          header="No team to display"
          description="You're not listed as a lead on any projects. Contact your admin if this looks wrong."
        />
      </div>
    );
  }

  return <TeamResourceList projectIds={projects.map((p) => p.id)} />;
}
