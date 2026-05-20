/**
 * PlanHub Plan Library Page
 * Route: /planhub
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PlanLibrary from '@/components/planhub/views/PlanLibrary';
import '@/styles/planhub.css';

export default function PlanLibraryPage() {
  const navigate = useNavigate();

  const handlePlanSelect = (planId: string) => {
    navigate(`/planhub/plan/${planId}`);
  };

  return (
    <div className="planhub-module h-full">
      <PlanLibrary onPlanSelect={handlePlanSelect} />
    </div>
  );
}
