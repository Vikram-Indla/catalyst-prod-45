/**
 * Module 5A-1: Automation Framework Connectors - Hooks
 */

import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import type { AutomationConnector, ConnectorType, ConnectorConfig } from '../types/connector';
import type { Json } from '@/integrations/supabase/types';

// ─────────────────────────────────────────────────────────────────────────────
// Hook: useConnectors - Connector list with real-time updates
// ─────────────────────────────────────────────────────────────────────────────

export function useConnectors(includeInactive = false) {
  const [connectors, setConnectors] = useState<AutomationConnector[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchConnectors = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_connectors', {
        p_include_inactive: includeInactive
      });
      
      if (error) throw error;
      const result = data as unknown as { success: boolean; connectors: AutomationConnector[] } | null;
      if (result?.success) {
        setConnectors(result.connectors || []);
      }
    } catch (err) {
      console.error('Failed to fetch connectors:', err);
    } finally {
      setIsLoading(false);
    }
  }, [includeInactive]);

  useEffect(() => {
    fetchConnectors();
  }, [fetchConnectors]);

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel('connectors-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'automation_connectors'
      }, fetchConnectors)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchConnectors]);

  return { connectors, isLoading, refetch: fetchConnectors };
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook: useConnectorMutations - CRUD operations
// ─────────────────────────────────────────────────────────────────────────────

export function useConnectorMutations() {
  const [isLoading, setIsLoading] = useState(false);

  const createConnector = useCallback(async (
    name: string,
    connectorType: ConnectorType,
    config?: ConnectorConfig,
    webhookUrl?: string
  ) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.rpc('create_automation_connector', {
        p_name: name,
        p_connector_type: connectorType,
        p_config: (config || {}) as Json,
        p_webhook_url: webhookUrl || null
      });

      if (error) throw error;
      
      const result = data as unknown as { success: boolean; connector_id: string; webhook_secret: string } | null;
      if (result?.success) {
        toast({ title: 'Connector Created', description: `${name} has been configured.` });
        return result;
      }
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to create connector', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateConnector = useCallback(async (
    connectorId: string,
    updates: {
      name?: string;
      config?: ConnectorConfig;
      webhookUrl?: string;
      isActive?: boolean;
    }
  ) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.rpc('update_connector', {
        p_connector_id: connectorId,
        p_name: updates.name,
        p_config: updates.config as Json,
        p_webhook_url: updates.webhookUrl,
        p_is_active: updates.isActive
      });

      if (error) throw error;
      
      const result = data as unknown as { success: boolean } | null;
      if (result?.success) {
        toast({ title: 'Connector Updated' });
        return result;
      }
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to update connector', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  }, []);

  const deleteConnector = useCallback(async (connectorId: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.rpc('delete_connector', {
        p_connector_id: connectorId
      });

      if (error) throw error;
      
      const result = data as unknown as { success: boolean } | null;
      if (result?.success) {
        toast({ title: 'Connector Deleted' });
        return true;
      }
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to delete connector', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
    return false;
  }, []);

  return { createConnector, updateConnector, deleteConnector, isLoading };
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook: useConnectorTest - Test connection
// ─────────────────────────────────────────────────────────────────────────────

export function useConnectorTest() {
  const [isTesting, setIsTesting] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const testConnection = useCallback(async (connectorId: string) => {
    setIsTesting(true);
    setResult(null);
    
    try {
      const { data, error } = await supabase.rpc('test_connector', {
        p_connector_id: connectorId
      });

      if (error) throw error;
      
      const rpcResult = data as unknown as { success: boolean; message: string } | null;
      const testResult = {
        success: rpcResult?.success || false,
        message: rpcResult?.message || 'Connection test completed'
      };
      
      setResult(testResult);
      
      if (testResult.success) {
        toast({ title: 'Connection Successful', description: testResult.message });
      } else {
        toast({ title: 'Connection Failed', description: testResult.message, variant: 'destructive' });
      }
      
      return testResult;
    } catch (err) {
      const testResult = { success: false, message: 'Connection test failed' };
      setResult(testResult);
      toast({ title: 'Error', description: testResult.message, variant: 'destructive' });
      return testResult;
    } finally {
      setIsTesting(false);
    }
  }, []);

  return { testConnection, isTesting, result };
}
