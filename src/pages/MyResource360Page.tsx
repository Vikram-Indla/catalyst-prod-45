import React from 'react';
import { useMyResource } from '@/hooks/useMyResource';
import R360MemberDetail from '@/pages/R360MemberDetail';
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

export default function MyResource360Page() {
  const { resourceId, isLoading, isError } = useMyResource();

  if (isLoading) {
    return (
      <div data-testid="my-r360-loading" style={centered} aria-busy="true">
        <Spinner size="large" aria-label="Loading your Resource 360°" />
      </div>
    );
  }

  if (isError) {
    return (
      <div data-testid="my-r360-error" style={centered}>
        <EmptyState
          header="Couldn’t load your Resource 360°"
          description="Something went wrong fetching your profile. Please try again later."
        />
      </div>
    );
  }

  if (!resourceId) {
    return (
      <div data-testid="my-r360-empty" style={centered}>
        <EmptyState
          header="No Resource 360° profile"
          description="Your account isn’t linked to a resource record. If you should have one, contact your admin."
        />
      </div>
    );
  }

  return <R360MemberDetail resourceId={resourceId} />;
}
