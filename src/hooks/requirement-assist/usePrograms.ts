// ============================================================
// USE PROGRAMS HOOK
// Load programs and projects from database
// ============================================================

import { useEffect, useRef } from 'react';
import { useRequirementAssistStore } from '@/stores/requirementAssistStore';
import { supabase } from '@/integrations/supabase/client';

export function usePrograms() {
  const programId = useRequirementAssistStore((state) => state.programId);
  const setPrograms = useRequirementAssistStore((state) => state.setPrograms);
  const setProjects = useRequirementAssistStore((state) => state.setProjects);
  
  // Use ref to track if we've loaded programs
  const programsLoadedRef = useRef(false);

  // Load programs on mount (only once)
  useEffect(() => {
    if (programsLoadedRef.current) return;
    programsLoadedRef.current = true;

    async function loadPrograms() {
      const { data, error } = await supabase
        .from('programs')
        .select('id, name, description, key')
        .eq('status', 'active')
        .order('name');

      if (!error && data) {
        setPrograms(data.map(p => ({
          id: p.id,
          name: p.name,
          description: p.description,
          code: p.key,
          color: '#3B82F6', // Default blue color
        })));
      }
    }

    loadPrograms();
  }, [setPrograms]);

  // Load projects when program changes
  useEffect(() => {
    async function loadProjects() {
      if (!programId) {
        setProjects([]);
        return;
      }

      const { data, error } = await supabase
        .from('projects')
        .select('id, program_id, name, description, key')
        .eq('program_id', programId)
        .order('name');

      if (!error && data) {
        setProjects(data.map(p => ({
          id: p.id,
          programId: p.program_id,
          name: p.name,
          description: p.description,
          code: p.key,
        })));
      }
    }

    loadProjects();
  }, [programId, setProjects]);
}
