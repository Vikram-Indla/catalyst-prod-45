import { useParams } from 'react-router-dom';
import { useResource, useResourceSummary, useWorkItems } from '@/hooks/useResource360';

const Resource360Page = () => {
  const { resourceId } = useParams<{ resourceId: string }>();
  const rid = resourceId ?? '009';
  const { data: resource, isLoading, error } = useResource(rid);
  const { data: summary } = useResourceSummary(resource?.id ?? '');
  const { data: items } = useWorkItems(resource?.id ?? '');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full" style={{ fontFamily: "'Inter', sans-serif" }}>
        <p style={{ fontSize: 14, color: '#64748B' }}>Loading resource...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full" style={{ fontFamily: "'Inter', sans-serif" }}>
        <p style={{ fontSize: 14, color: '#DC2626' }}>Error: {error.message}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full p-5" style={{ fontFamily: "'Inter', sans-serif" }}>
      <h1 style={{ fontSize: 20, fontWeight: 700, color: '#0F172A', marginBottom: 8 }}>
        {resource?.full_name} — {resource?.job_role}
      </h1>
      <p style={{ fontSize: 14, color: '#334155', marginBottom: 4 }}>
        Total: {summary?.total_items ?? '–'} | Todo: {summary?.todo_count ?? '–'} | Progress: {summary?.progress_count ?? '–'} | Done: {summary?.done_count ?? '–'}
      </p>
      <p style={{ fontSize: 13, color: '#64748B' }}>
        Work items loaded: {items?.length ?? 0}
      </p>
    </div>
  );
};

export default Resource360Page;
