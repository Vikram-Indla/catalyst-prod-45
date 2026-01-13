/**
 * Hook: Create Defect from AI Finding
 * TC-331 to TC-355: Handle defect creation from AI analysis
 */

import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { DetectedDefect } from './useEvidenceAI';
import type { AIDefectSubmitData } from './CreateDefectFromAIModal';

interface UseCreateDefectFromAIOptions {
  projectId?: string;
  executionId?: string;
  stepId?: string;
  onSuccess?: (defectId: string) => void;
}

export function useCreateDefectFromAI(options: UseCreateDefectFromAIOptions = {}) {
  const [isCreating, setIsCreating] = useState(false);
  const [selectedDefect, setSelectedDefect] = useState<DetectedDefect | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Open modal with selected defect
  const openCreateDefect = useCallback((defect: DetectedDefect) => {
    setSelectedDefect(defect);
    setIsModalOpen(true);
  }, []);

  // Close modal
  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    setSelectedDefect(null);
  }, []);

  // Submit defect to database
  const createDefect = useCallback(async (data: AIDefectSubmitData): Promise<string | null> => {
    setIsCreating(true);
    
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Not authenticated');
      }

      // Get project ID from context or default
      const projectId = options.projectId;
      if (!projectId) {
        throw new Error('Project ID is required');
      }

      // Generate defect key using counter approach
      const { data: existingDefects } = await supabase
        .from('tm_defects')
        .select('defect_key')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(1);
      
      let nextNum = 1;
      if (existingDefects && existingDefects.length > 0) {
        const lastKey = existingDefects[0].defect_key;
        const match = lastKey.match(/DEF-(\d+)/);
        if (match) {
          nextNum = parseInt(match[1], 10) + 1;
        }
      }
      
      const defectKey = `DEF-${nextNum}`;

      // Create defect record - using actual schema columns
      const { data: defect, error: defectError } = await supabase
        .from('tm_defects')
        .insert({
          project_id: projectId,
          defect_key: defectKey,
          title: data.title,
          description: data.description,
          severity: data.severity as 'critical' | 'major' | 'minor' | 'trivial',
          status: 'open',
          reporter_id: user.id,
          defect_type: data.type,
          found_during: 'ai_analysis',
          // Store AI metadata in expected_result as JSON string (workaround)
          expected_result: JSON.stringify({
            aiDetected: true,
            location: data.location,
            suggestion: data.suggestion,
            detectedAt: new Date().toISOString(),
          }),
        })
        .select('id')
        .single();

      if (defectError) {
        throw defectError;
      }

      // Link to execution step if provided
      if (options.executionId && options.stepId) {
        await supabase
          .from('tm_defect_links')
          .insert({
            defect_id: defect.id,
            step_result_id: options.stepId,
            created_by: user.id,
          });
      }

      // Link evidence to defect using defect_links with test_run_id as workaround
      // (since there's no dedicated evidence attachment table)
      if (data.attachEvidenceId && options.executionId) {
        // Evidence is already linked to execution step, no additional link needed
        // The defect_link to step_result_id provides the connection
      }

      options.onSuccess?.(defect.id);
      closeModal();
      
      return defect.id;
    } catch (error) {
      console.error('Failed to create defect:', error);
      throw error;
    } finally {
      setIsCreating(false);
    }
  }, [options, closeModal]);

  return {
    isCreating,
    selectedDefect,
    isModalOpen,
    openCreateDefect,
    closeModal,
    createDefect,
    setIsModalOpen,
  };
}
