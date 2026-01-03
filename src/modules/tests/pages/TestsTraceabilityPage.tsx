/**
 * Tests Traceability Page
 * Full end-to-end traceability matrix with coverage gaps and risk highlighting
 * 
 * SCOPE ENFORCEMENT: Traceability is ONLY available at project level
 */

import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { TraceabilityMatrix } from '../components/traceability';
import { ProjectScopeRequired } from '../components/ProjectScopeRequired';

export function TestsTraceabilityPage() {
  const [searchParams] = useSearchParams();
  const scopeType = searchParams.get('scopeType') || 'project';
  const programId = searchParams.get('programId');
  const projectId = searchParams.get('projectId') || searchParams.get('scopeId');

  // SCOPE ENFORCEMENT: Traceability is ONLY available at project level
  const isProjectScope = scopeType === 'project';
  
  if (!isProjectScope) {
    return <ProjectScopeRequired featureName="Traceability Matrix" />;
  }

  return (
    <TraceabilityMatrix 
      programId={programId} 
      projectId={projectId || undefined} 
    />
  );
}

export default TestsTraceabilityPage;
