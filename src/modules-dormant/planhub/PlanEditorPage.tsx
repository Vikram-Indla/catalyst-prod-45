/**
 * PlanHub Plan Editor Page
 * Route: /planhub/plan/:planId
 */

import { useNavigate, useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import PlanEditor from '@/components/planhub/views/PlanEditor';
import type { FeatureSettings } from '@/types/planhub.types';
import '@/styles/planhub.css';

export default function PlanEditorPage() {
  const { planId } = useParams<{ planId: string }>();
  const navigate = useNavigate();
  const [features, setFeatures] = useState<FeatureSettings | null>(null);

  useEffect(() => {
    loadFeatures();
  }, []);

  const loadFeatures = async () => {
    const { data } = await supabase
      .from('planhub_settings')
      .select('*')
      .eq('key', 'features')
      .single();
    
    if (data) {
      setFeatures(data.value as unknown as FeatureSettings);
    }
  };

  const handleBack = () => {
    navigate('/planhub');
  };

  if (!planId) {
    navigate('/planhub');
    return null;
  }

  return (
    <div className="planhub-module h-full">
      <PlanEditor planId={planId} onBack={handleBack} features={features} />
    </div>
  );
}
