/**
 * CATALYST TESTS - Test Case Form Hook
 * Manages form state across all 6 tabs with validation and auto-save
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth';
import type { CreateCaseFormData, TabType } from '@/types/testCaseCreation';

const AUTOSAVE_KEY = 'catalyst_test_case_draft';
const AUTOSAVE_INTERVAL = 30000; // 30 seconds

export function useTestCaseForm(initialData?: Partial<CreateCaseFormData>) {
  const { user } = useAuth();
  
  const [formData, setFormData] = useState<CreateCaseFormData>(() => {
    // Try to restore from localStorage
    const saved = localStorage.getItem(AUTOSAVE_KEY);
    if (saved && !initialData) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to restore draft:', e);
      }
    }
    
    return {
      title: '',
      status: 'draft',
      priority: 'medium',
      case_type: 'functional',
      automation_status: 'manual',
      step_format: 'classic',
      steps: [],
      parameters: [],
      datasets: [],
      work_item_links: [],
      attachments: [],
      ...initialData,
    };
  });

  const [activeTab, setActiveTab] = useState<TabType>('details');
  const [isDirty, setIsDirty] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Auto-save draft to localStorage
  useEffect(() => {
    if (!isDirty) return;
    
    const timer = setTimeout(() => {
      localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(formData));
      console.log('Draft auto-saved');
    }, AUTOSAVE_INTERVAL);

    return () => clearTimeout(timer);
  }, [formData, isDirty]);

  const updateFormData = useCallback((updates: Partial<CreateCaseFormData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
    setIsDirty(true);
  }, []);

  const clearDraft = useCallback(() => {
    localStorage.removeItem(AUTOSAVE_KEY);
    setIsDirty(false);
  }, []);

  const validateTab = useCallback((tab: TabType): boolean => {
    const newErrors: Record<string, string> = {};

    switch (tab) {
      case 'details':
        if (!formData.title.trim()) {
          newErrors.title = 'Title is required';
        }
        if (formData.title.length > 255) {
          newErrors.title = 'Title must be 255 characters or less';
        }
        if (formData.estimated_effort && formData.estimated_effort < 0) {
          newErrors.estimated_effort = 'Estimated effort must be positive';
        }
        break;
        
      case 'steps':
        if (formData.status === 'published' && formData.steps.length === 0) {
          newErrors.steps = 'At least one step is required for published cases';
        }
        formData.steps.forEach((step, index) => {
          if (!step.description.trim()) {
            newErrors[`step_${index}`] = `Step ${index + 1} description is required`;
          }
        });
        break;
        
      case 'data':
        if (formData.parameters.length > 0 && formData.datasets.length === 0) {
          newErrors.datasets = 'At least one dataset is required when parameters are defined';
        }
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  const validateAll = useCallback((): boolean => {
    const tabs: TabType[] = ['details', 'steps', 'data'];
    let allValid = true;
    
    tabs.forEach(tab => {
      if (!validateTab(tab)) {
        allValid = false;
      }
    });
    
    return allValid;
  }, [validateTab]);

  const hasTabErrors = useCallback((tab: TabType): boolean => {
    return Object.keys(errors).some(key => {
      switch (tab) {
        case 'details':
          return ['title', 'estimated_effort'].includes(key);
        case 'steps':
          return key === 'steps' || key.startsWith('step_');
        case 'data':
          return key === 'datasets' || key === 'parameters';
        default:
          return false;
      }
    });
  }, [errors]);

  return {
    formData,
    updateFormData,
    activeTab,
    setActiveTab,
    isDirty,
    errors,
    validateTab,
    validateAll,
    hasTabErrors,
    clearDraft,
  };
}
