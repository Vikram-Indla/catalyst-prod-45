/**
 * Hook for fetching AI suggestions for an issue
 */

import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface AISuggestion {
  id: string;
  suggestion_type: string;
  suggestion_data: {
    value?: string;
    category?: string;
    confidence: number;
    reasoning: string;
  };
  confidence_score: number;
}

export function useAISuggestions(issueId: string | null) {
  const [suggestions, setSuggestions] = useState<AISuggestion[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!issueId) {
      setSuggestions([]);
      return;
    }

    const fetchSuggestions = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('injira_ai_suggestions')
          .select('*')
          .eq('issue_id', issueId)
          .is('is_accepted', null)
          .order('created_at', { ascending: false });

        if (error) throw error;
        
        // Transform the data to match our interface
        const transformed = (data || []).map((item: any) => ({
          id: item.id,
          suggestion_type: item.suggestion_type,
          suggestion_data: item.suggestion_data as AISuggestion['suggestion_data'],
          confidence_score: item.confidence_score,
        }));
        
        setSuggestions(transformed);
      } catch (err) {
        console.error('Failed to fetch AI suggestions:', err);
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    };

    fetchSuggestions();
  }, [issueId]);

  const refetch = async () => {
    if (!issueId) return;
    
    try {
      const { data, error } = await supabase
        .from('injira_ai_suggestions')
        .select('*')
        .eq('issue_id', issueId)
        .is('is_accepted', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const transformed = (data || []).map((item: any) => ({
        id: item.id,
        suggestion_type: item.suggestion_type,
        suggestion_data: item.suggestion_data as AISuggestion['suggestion_data'],
        confidence_score: item.confidence_score,
      }));
      
      setSuggestions(transformed);
    } catch (err) {
      console.error('Failed to refetch AI suggestions:', err);
    }
  };

  return { suggestions, loading, refetch };
}
