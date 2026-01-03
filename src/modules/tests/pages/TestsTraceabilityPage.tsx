/**
 * Tests Traceability Page
 * Full end-to-end traceability matrix with coverage gaps and risk highlighting
 */

import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { TraceabilityMatrix } from '../components/traceability';

export function TestsTraceabilityPage() {
  const [searchParams] = useSearchParams();
  const programId = searchParams.get('programId');
  const projectId = searchParams.get('projectId');

  return (
    <TraceabilityMatrix 
      programId={programId} 
      projectId={projectId || undefined} 
    />
  );
}

export default TestsTraceabilityPage;
