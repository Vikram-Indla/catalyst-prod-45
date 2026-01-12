/**
 * Test Case Detail Page Wrapper
 * Wraps the TestCaseDetailPage component with route parameters
 */

import React from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { TestCaseDetailPage } from '../components/cases/detail';

export function TestCaseDetailPageWrapper() {
  const { caseId } = useParams<{ caseId: string }>();
  const [searchParams] = useSearchParams();
  
  const projectId = searchParams.get('projectId') || '00000000-0000-0000-0000-000000000001';
  
  if (!caseId) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">No test case ID provided</p>
      </div>
    );
  }
  
  // The TestCaseDetailPage uses useParams internally for caseId
  return <TestCaseDetailPage projectId={projectId} />;
}
