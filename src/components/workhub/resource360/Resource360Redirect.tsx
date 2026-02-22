import { useParams, Navigate } from 'react-router-dom';

export function Resource360Redirect() {
  const { id } = useParams();
  return <Navigate to={`/project-hub/resource-360/${id || '009'}`} replace />;
}
