/**
 * Test Case Editor Page
 * Full-page editor for creating/editing test cases
 */

import React from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  useTestCase,
  useTestCaseSteps,
  useFoldersWithCounts,
  useCasePriorities,
  useCaseTypes,
  useLabels,
  useCreateTestCase,
  useUpdateTestCase,
  type CaseStatus,
} from '@/hooks/test-management';
import { TestCaseEditor } from '../components/cases/TestCaseEditor';
import { Skeleton } from '@/components/ui/skeleton';

export function TestCaseEditorPage() {
  const { caseId } = useParams<{ caseId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const isNewCase = caseId === 'new';
  
  // Get project ID from URL or use default TM project
  const urlProjectId = searchParams.get('projectId');
  const DEFAULT_TM_PROJECT_ID = '00000000-0000-0000-0000-000000000001';
  const projectId = urlProjectId || DEFAULT_TM_PROJECT_ID;
  const defaultFolderId = searchParams.get('folderId');

  // Fetch test case data if editing
  const { data: testCase, isLoading: caseLoading } = useTestCase(isNewCase ? null : caseId);
  const { data: steps } = useTestCaseSteps(isNewCase ? null : caseId);

  // Fetch configuration data
  const { data: foldersData, isLoading: foldersLoading } = useFoldersWithCounts(projectId);
  const folders = foldersData || [];
  const { data: priorities } = useCasePriorities(projectId);
  const { data: types } = useCaseTypes(projectId);
  const { data: labels } = useLabels(projectId);

  // Mutations
  const createCase = useCreateTestCase();
  const updateCase = useUpdateTestCase();

  const handleSave = (data: any, stepsData: any[]) => {
    if (isNewCase) {
      createCase.mutate(
        {
          title: data.title,
          objective: data.description,
          preconditions: data.preconditions,
          folder_id: data.folder_id || defaultFolderId,
          priority_id: data.priority_id,
          type_id: data.type_id,
          steps: stepsData.map((s, i) => ({
            step_number: i + 1,
            action: s.action,
            test_data: s.test_data,
            expected_result: s.expected_result,
          })),
          project_id: projectId,
        },
        {
          onSuccess: (newCase) => {
            navigate(`/tests/cases?projectId=${projectId}`);
          },
        }
      );
    } else if (testCase) {
      updateCase.mutate(
        {
          id: testCase.id,
          title: data.title,
          objective: data.description,
          preconditions: data.preconditions,
          status: data.status?.toUpperCase() as CaseStatus,
          priority_id: data.priority_id,
          type_id: data.type_id,
          folder_id: data.folder_id,
          project_id: projectId,
        },
        {
          onSuccess: () => {
            navigate(`/tests/cases?projectId=${projectId}`);
          },
        }
      );
    }
  };

  const handleClose = () => {
    navigate(`/tests/cases?projectId=${projectId}`);
  };

  // Map to component format
  const prioritiesForUI = (priorities || []).map(p => ({ id: p.id, name: p.name, color: p.color }));
  const typesForUI = (types || []).map(t => ({ id: t.id, name: t.name }));
  const labelsForUI = (labels || []).map(l => ({ id: l.id, name: l.name, color: l.color }));

  // Map test case to expected format
  const mappedTestCase = testCase ? {
    ...testCase,
    case_key: testCase.key,
  } as any : null;

  if (!isNewCase && caseLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-surface-1">
        <div className="space-y-4 w-96">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  return (
    <TestCaseEditor
      testCase={mappedTestCase}
      steps={steps || []}
      folders={folders}
      priorities={prioritiesForUI}
      caseTypes={typesForUI}
      labels={labelsForUI}
      onSave={handleSave}
      onClose={handleClose}
      isSubmitting={createCase.isPending || updateCase.isPending}
      projectId={projectId}
      defaultFolderId={defaultFolderId}
    />
  );
}

export default TestCaseEditorPage;
