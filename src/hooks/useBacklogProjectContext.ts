/**
 * useBacklogProjectContext — Project context awareness for backlog (F1.30)
 *
 * Provides optional project scoping from URL params (/project/:key/workitems).
 */
import { useParams } from 'react-router-dom';
import { useCallback } from 'react';

export function useBacklogProjectContext() {
  const params = useParams<{ key?: string; id?: string }>();

  const projectId = params.id || null;
  const projectKey = params.key || null;
  const isScoped = !!projectId || !!projectKey;

  const getProjectId = useCallback(() => {
    return projectId || null;
  }, [projectId]);

  const getProjectKey = useCallback(() => {
    return projectKey || null;
  }, [projectKey]);

  const getQueryFilter = useCallback(() => {
    if (!projectKey && !projectId) {
      return null;
    }
    if (projectKey) {
      return { project_key: projectKey };
    }
    return { project_id: projectId };
  }, [projectId, projectKey]);

  const getScopedUrl = useCallback((baseUrl: string = '/workitems') => {
    if (!projectKey) {
      return baseUrl;
    }
    return `/project/${projectKey}/workitems`;
  }, [projectKey]);

  return {
    getProjectId,
    getProjectKey,
    isScoped,
    getQueryFilter,
    getScopedUrl,
  };
}
