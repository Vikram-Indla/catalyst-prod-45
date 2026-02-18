import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface AgentProgressEvent {
  event: 'agent-start' | 'agent-complete' | 'pipeline-complete' | 'pipeline-error';
  agent_name: string;
  agent_order: number;
  elapsed_seconds?: number;
  description?: string;
  error?: string;
}

export function useRaRealtimeProgress(documentId: string | undefined) {
  const [events, setEvents] = useState<AgentProgressEvent[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!documentId) return;

    const channel = supabase
      .channel(`rec-${documentId}`)
      .on('broadcast', { event: 'agent-progress' }, ({ payload }) => {
        const evt = payload as AgentProgressEvent;
        setEvents(prev => [...prev, evt]);

        if (evt.event === 'agent-start') {
          setCurrentStep(evt.agent_order);
        }
        if (evt.event === 'agent-complete') {
          setCurrentStep(evt.agent_order + 1);
        }
        if (evt.event === 'pipeline-complete') {
          setIsComplete(true);
        }
        if (evt.event === 'pipeline-error') {
          setError(evt.error ?? 'Pipeline failed');
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [documentId]);

  return { events, currentStep, isComplete, error };
}
