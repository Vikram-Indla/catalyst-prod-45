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
  const setProgramId = useRequirementAssistStore((state) => state.setProgramId);
  const setProjectId = useRequirementAssistStore((state) => state.setProjectId);
  
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
        const programs = data.map(p => ({
          id: p.id,
          name: p.name,
          description: p.description,
          code: p.key,
          color: '#3B82F6', // Default blue color
        }));
        setPrograms(programs);
        
        // Set default program if none selected (prefer Catalyst Epics or first program)
        const catalystProgram = programs.find(p => p.code === 'CAT' || p.name.toLowerCase().includes('catalyst'));
        const defaultProgram = catalystProgram || programs[0];
        if (defaultProgram && !programId) {
          setProgramId(defaultProgram.id);
        }
      }
    }

    loadPrograms();
  }, [setPrograms, setProgramId, programId]);

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
        const projects = data.map(p => ({
          id: p.id,
          programId: p.program_id,
          name: p.name,
          description: p.description,
          code: p.key,
        }));
        setProjects(projects);
        
        // Set default project if none selected (prefer DIP or first project)
        const dipProject = projects.find(p => p.code === 'DIP' || p.name.toLowerCase().includes('digital investor'));
        const defaultProject = dipProject || projects[0];
        const currentProjectId = useRequirementAssistStore.getState().projectId;
        if (defaultProject && !currentProjectId) {
          setProjectId(defaultProject.id);
        }
      }
    }

    loadProjects();
  }, [programId, setProjects, setProjectId]);
}
