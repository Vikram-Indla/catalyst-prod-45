/**
 * PlanHub Report Center Page
 * Route: /planhub/reports
 */

import { useSearchParams } from 'react-router-dom';
import ReportCenter from '@/components/planhub/views/ReportCenter';
import '@/styles/planhub.css';

export default function ReportCenterPage() {
  const [searchParams] = useSearchParams();
  const planId = searchParams.get('planId');

  return (
    <div className="planhub-module h-full">
      <ReportCenter planId={planId} />
    </div>
  );
}
