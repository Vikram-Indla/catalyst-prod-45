/**
 * PlanHub Scenario Compare Page
 * Route: /planhub/compare
 */

import ScenarioCompare from '@/components/planhub/views/ScenarioCompare';
import '@/styles/planhub.css';

export default function ScenarioComparePage() {
  return (
    <div className="planhub-module h-full">
      <ScenarioCompare />
    </div>
  );
}
