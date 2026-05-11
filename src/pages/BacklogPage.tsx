/**
 * BacklogPage — Complete backlog page (F1.25)
 *
 * Production-ready backlog page with all necessary providers and context.
 */
import React, { memo } from 'react';
import { WorkListDataProvider } from '@/context/WorkListDataContext';
import { WorkListPageContainer } from '@/components/WorkListPanel/WorkListPageContainer';

const BacklogPage = memo(function BacklogPage() {
  return (
    <WorkListDataProvider>
      <WorkListPageContainer />
    </WorkListDataProvider>
  );
});

export default BacklogPage;
