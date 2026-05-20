/**
 * PlanHub Master Plan Page
 * Route: /planhub/master
 */

import MasterPlan from '@/components/planhub/views/MasterPlan';
import '@/styles/planhub.css';

export default function MasterPlanPage() {
  return (
    <div className="planhub-module h-full">
      <MasterPlan />
    </div>
  );
}
