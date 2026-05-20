/**
 * PlanHub AI Assistant Page
 * Route: /planhub/ai
 */

import { useSearchParams } from 'react-router-dom';
import AIAssistant from '@/components/planhub/views/AIAssistant';
import '@/styles/planhub.css';

export default function AIAssistantPage() {
  const [searchParams] = useSearchParams();
  const planId = searchParams.get('planId');

  return (
    <div className="planhub-module h-full">
      <AIAssistant planId={planId} />
    </div>
  );
}
