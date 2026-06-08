/**
 * PlanHub Resources Page
 * Route: /planhub/resources
 */

import { useSearchParams } from 'react-router-dom';
import ResourcesView from '@/components/planhub/views/ResourcesView';
import '@/styles/planhub.css';

export default function ResourcesPage() {
  const [searchParams] = useSearchParams();
  const planId = searchParams.get('planId');

  return (
    <div className="planhub-module h-full">
      <ResourcesView planId={planId} />
    </div>
  );
}
