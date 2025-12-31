/**
 * Enterprise Roadmap Page
 * Clean placeholder - ready for rewrite
 */

import React from 'react';
import GlobalPageHeader from '@/components/layout/GlobalPageHeader';

export const EnterpriseRoadmapPage: React.FC = () => {
  return (
    <div className="flex flex-col h-full">
      <GlobalPageHeader sectionLabel="ENTERPRISE" pageTitle="Enterprise Roadmap" />
      
      <div className="flex-1 flex items-center justify-center bg-surface-1">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-text-primary mb-2">
            Enterprise Roadmap
          </h2>
          <p className="text-text-secondary">
            Ready for rewrite
          </p>
        </div>
      </div>
    </div>
  );
};

export default EnterpriseRoadmapPage;
