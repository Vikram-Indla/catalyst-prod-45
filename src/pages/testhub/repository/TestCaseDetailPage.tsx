/**
 * TestCaseDetailPage — /testhub/repository/case/:caseKey
 *
 * CAT-TESTHUB-V2 slice D1: full-page test case authoring surface. Mounts the
 * canonical CatalystDetailRouter (entityKind='test_case') in fullPageMode —
 * same pattern as DefectDetailPage. caseKey (e.g. "TC-0012") is per-project
 * unique, so it resolves to the row id through the active TestHub project.
 */
import { lazy, Suspense, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Routes } from '@/lib/routes';
import { useTestHubProject } from '@/hooks/test-management/useTestHubProject';

const CatalystDetailRouter = lazy(
  () => import('@/components/catalyst-detail-views/CatalystDetailRouter'),
);

function useTestCaseIdByKey(projectId: string | undefined, caseKey: string | undefined) {
  return useQuery({
    queryKey: ['tm-case-id-by-key', projectId, caseKey],
    queryFn: async (): Promise<string | null> => {
      if (!projectId || !caseKey) return null;
      const { data, error } = await supabase
        .from('tm_test_cases')
        .select('id')
        .eq('project_id', projectId)
        .eq('case_key', caseKey)
        .maybeSingle();
      if (error) throw error;
      return data?.id ?? null;
    },
    enabled: !!projectId && !!caseKey,
  });
}

export default function TestCaseDetailPage() {
  const { caseKey } = useParams<{ caseKey: string }>();
  const navigate = useNavigate();
  const { projectId, project } = useTestHubProject();
  const { data: caseId, isError, isSuccess } = useTestCaseIdByKey(projectId, caseKey);

  const unknownKey = isError || (isSuccess && !caseId);

  useEffect(() => {
    // Unknown key: land back on the repository instead of a dead page.
    if (unknownKey) navigate(Routes.testHub.repository(), { replace: true });
  }, [unknownKey, navigate]);

  if (!caseId) {
    return null;
  }

  return (
    <div style={{ width: '100%', height: '100%', flex: 1, minHeight: 0, overflow: 'hidden' }}>
      <Suspense fallback={null}>
        <CatalystDetailRouter
          isOpen={true}
          onClose={() => navigate(Routes.testHub.repository())}
          itemId={caseId}
          entityKind="test_case"
          projectKey={project?.key}
          fullPageMode={true}
        />
      </Suspense>
    </div>
  );
}
