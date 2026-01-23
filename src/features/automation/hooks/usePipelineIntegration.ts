/**
 * Module 5A-4: CI/CD Pipeline Integration - Hooks
 */

import { useState, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import type { AutomationConnector } from '../types/connector';
import type { WebhookEndpoint } from '../types/pipeline';

// ─────────────────────────────────────────────────────────────────────────────
// Hook: useWebhookEndpoints - Get webhook URLs for connectors
// ─────────────────────────────────────────────────────────────────────────────

export function useWebhookEndpoints(connectors: AutomationConnector[]) {
  const endpoints = useMemo<WebhookEndpoint[]>(() => {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const webhookBaseUrl = `${supabaseUrl}/functions/v1/automation-webhook`;

    return connectors
      .filter(c => c.is_active)
      .map(connector => ({
        url: webhookBaseUrl,
        secret: null, // Secret is stored server-side
        connector_id: connector.id,
        connector_name: connector.name
      }));
  }, [connectors]);

  return { endpoints };
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook: useWebhookTest - Test webhook endpoint
// ─────────────────────────────────────────────────────────────────────────────

export function useWebhookTest() {
  const [isTesting, setIsTesting] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const testWebhook = useCallback(async (connectorId: string) => {
    setIsTesting(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('automation-webhook', {
        body: {
          connector_id: connectorId,
          pipeline_name: 'Test Pipeline',
          results: [
            {
              external_test_id: 'test_webhook_check',
              external_test_name: 'Webhook Connectivity Test',
              status: 'passed',
              duration_ms: 100
            }
          ]
        }
      });

      if (error) throw error;

      const testResult = {
        success: data?.success || false,
        message: data?.success 
          ? `Webhook working! Imported ${data.imported} result(s).`
          : data?.error || 'Test failed'
      };

      setResult(testResult);
      
      if (testResult.success) {
        toast({ title: 'Webhook Test Passed', description: testResult.message });
      } else {
        toast({ title: 'Webhook Test Failed', description: testResult.message, variant: 'destructive' });
      }

      return testResult;
    } catch (err) {
      const testResult = { 
        success: false, 
        message: err instanceof Error ? err.message : 'Webhook test failed' 
      };
      setResult(testResult);
      toast({ title: 'Error', description: testResult.message, variant: 'destructive' });
      return testResult;
    } finally {
      setIsTesting(false);
    }
  }, []);

  return { testWebhook, isTesting, result };
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook: usePipelineStats - Get pipeline run statistics
// ─────────────────────────────────────────────────────────────────────────────

export interface PipelineStats {
  total_runs: number;
  last_run: string | null;
  pass_rate: number;
  avg_duration_ms: number;
}

export function usePipelineStats(connectorId: string | null) {
  const [stats, setStats] = useState<PipelineStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchStats = useCallback(async () => {
    if (!connectorId) return;
    setIsLoading(true);

    try {
      // Get aggregated stats from automation_results
      const { data, error } = await (supabase as any)
        .from('automation_results')
        .select('status, duration_ms, imported_at')
        .eq('connector_id', connectorId)
        .order('imported_at', { ascending: false })
        .limit(1000);

      if (error) throw error;

      if (data && data.length > 0) {
        const passed = (data as any[]).filter((r: any) => r.status === 'passed').length;
        const durations = (data as any[]).filter((r: any) => r.duration_ms).map((r: any) => r.duration_ms as number);
        
        setStats({
          total_runs: data.length,
          last_run: (data as any[])[0]?.imported_at || null,
          pass_rate: Math.round((passed / data.length) * 100),
          avg_duration_ms: durations.length > 0 
            ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
            : 0
        });
      } else {
        setStats({
          total_runs: 0,
          last_run: null,
          pass_rate: 0,
          avg_duration_ms: 0
        });
      }
    } catch (err) {
      console.error('Failed to fetch pipeline stats:', err);
    } finally {
      setIsLoading(false);
    }
  }, [connectorId]);

  return { stats, isLoading, fetchStats };
}