/**
 * Hook for managing mock data runs
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface MockRun {
  id: string;
  created_by: string;
  source_type: 'pdf' | 'csv' | 'excel' | 'markdown' | 'text' | 'synthetic';
  source_name?: string;
  seed?: string;
  config_json: Record<string, any>;
  status: string;
  progress: number;
  current_step?: string;
  error_message?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  creator?: { full_name: string; email: string };
}

export interface CreateRunData {
  sourceType: string;
  sourceName?: string;
  seed?: string;
  notes?: string;
  file?: File;
}

export interface RunConfig {
  strategy?: {
    themes?: number;
    objectives?: number;
    keyResults?: number;
  };
  delivery?: {
    epics?: number;
    features?: number;
    stories?: number;
    tasks?: number;
  };
  release?: {
    releases?: number;
    releaseWindows?: number;
  };
  quality?: {
    incidents?: number;
    defects?: number;
  };
  structure?: {
    program?: string;
    project?: string;
  };
}

export function useMockDataRuns() {
  const [runs, setRuns] = useState<MockRun[]>([]);
  const [currentRun, setCurrentRun] = useState<MockRun | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);

  const getAuthHeaders = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return {
      'Authorization': `Bearer ${session?.access_token}`,
      'Content-Type': 'application/json',
    };
  };

  const fetchRuns = useCallback(async () => {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/mock-data/runs`,
        { headers }
      );
      if (!response.ok) throw new Error('Failed to fetch runs');
      const data = await response.json();
      setRuns(data);
    } catch (error) {
      console.error('Error fetching runs:', error);
      toast.error('Failed to load runs');
    }
  }, []);

  const pollStatus = useCallback(async (runId: string) => {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/mock-data/runs/${runId}/status`,
        { headers }
      );
      if (!response.ok) return;
      const status = await response.json();
      
      setCurrentRun(prev => prev ? { ...prev, ...status } : null);
      
      // Stop polling if done
      if (!['generating', 'loading', 'cleaning', 'parsing'].includes(status.status)) {
        if (pollingInterval) {
          clearInterval(pollingInterval);
          setPollingInterval(null);
        }
      }
    } catch (error) {
      console.error('Error polling status:', error);
    }
  }, [pollingInterval]);

  const startPolling = useCallback((runId: string) => {
    if (pollingInterval) clearInterval(pollingInterval);
    const interval = setInterval(() => pollStatus(runId), 1500);
    setPollingInterval(interval);
  }, [pollStatus, pollingInterval]);

  const createRun = useCallback(async (data: CreateRunData) => {
    setIsLoading(true);
    try {
      const headers = await getAuthHeaders();
      
      // If there's a file, upload it first to storage
      let filePath: string | undefined;
      if (data.file) {
        const { data: { session } } = await supabase.auth.getSession();
        const fileName = `${Date.now()}-${data.file.name}`;
        const { error: uploadError } = await supabase.storage
          .from('mock-data-uploads')
          .upload(fileName, data.file);
        
        if (uploadError) {
          console.error('File upload error:', uploadError);
          toast.error('Failed to upload file');
          throw uploadError;
        }
        filePath = fileName;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/mock-data/runs`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({
            sourceType: data.sourceType,
            sourceName: data.sourceName || data.file?.name,
            seed: data.seed,
            notes: data.notes,
            filePath,
          }),
        }
      );
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to create run');
      }
      const run = await response.json();
      setCurrentRun(run);
      await fetchRuns();
      toast.success('Run created successfully');
      return run;
    } catch (error) {
      console.error('Error creating run:', error);
      toast.error('Failed to create run');
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [fetchRuns]);

  const updateConfig = useCallback(async (config: RunConfig) => {
    if (!currentRun) return;
    setIsLoading(true);
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/mock-data/runs/${currentRun.id}/config`,
        {
          method: 'PATCH',
          headers,
          body: JSON.stringify(config),
        }
      );
      if (!response.ok) throw new Error('Failed to update config');
      const updated = await response.json();
      setCurrentRun(updated);
      toast.success('Configuration saved');
    } catch (error) {
      console.error('Error updating config:', error);
      toast.error('Failed to save configuration');
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [currentRun]);

  const generatePreview = useCallback(async () => {
    if (!currentRun) return;
    setIsLoading(true);
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/mock-data/runs/${currentRun.id}/generate`,
        {
          method: 'POST',
          headers,
        }
      );
      if (!response.ok) throw new Error('Failed to generate preview');
      startPolling(currentRun.id);
      toast.success('Generation started');
    } catch (error) {
      console.error('Error generating preview:', error);
      toast.error('Failed to generate preview');
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [currentRun, startPolling]);

  const loadData = useCallback(async () => {
    if (!currentRun) return;
    setIsLoading(true);
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/mock-data/runs/${currentRun.id}/load`,
        {
          method: 'POST',
          headers,
        }
      );
      if (!response.ok) throw new Error('Failed to load data');
      startPolling(currentRun.id);
      toast.success('Loading data to Catalyst');
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load data');
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [currentRun, startPolling]);

  const cleanup = useCallback(async (includeRelated: boolean) => {
    if (!currentRun) return;
    setIsLoading(true);
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/mock-data/runs/${currentRun.id}/cleanup`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({ includeRelated }),
        }
      );
      if (!response.ok) throw new Error('Failed to cleanup');
      startPolling(currentRun.id);
      toast.success('Cleanup started');
    } catch (error) {
      console.error('Error during cleanup:', error);
      toast.error('Failed to cleanup');
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [currentRun, startPolling]);

  const selectRun = useCallback((run: MockRun) => {
    setCurrentRun(run);
  }, []);

  useEffect(() => {
    fetchRuns();
  }, [fetchRuns]);

  useEffect(() => {
    return () => {
      if (pollingInterval) clearInterval(pollingInterval);
    };
  }, [pollingInterval]);

  return {
    runs,
    currentRun,
    isLoading,
    createRun,
    updateConfig,
    generatePreview,
    loadData,
    cleanup,
    selectRun,
    refreshRuns: fetchRuns,
  };
}
