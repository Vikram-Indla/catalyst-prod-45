// ============================================================
// CONFIG BAR COMPONENT
// Program/Project selection
// ============================================================

import React, { useState } from 'react';
import { useStore } from '@/stores/requirementAssistStore';
import { ChevronDown, ChevronUp, Building2, FolderKanban } from 'lucide-react';

export function ConfigBar() {
  const [isExpanded, setIsExpanded] = useState(false);
  const { 
    programId, 
    projectId, 
    programs, 
    projects,
    setProgramId,
    setProjectId,
    isGenerating,
  } = useStore();

  const selectedProgram = programs.find(p => p.id === programId);
  const selectedProject = projects.find(p => p.id === projectId);

  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden">
      {/* Collapsed View */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        disabled={isGenerating}
        className="w-full flex items-center justify-between px-3 py-2.5 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <Building2 className="w-4 h-4 text-slate-400" />
          <span className="font-medium text-slate-900">
            {selectedProgram?.name || 'Select Program'}
          </span>
          {selectedProject && (
            <>
              <span className="text-slate-400">›</span>
              <span>{selectedProject.name}</span>
            </>
          )}
        </div>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-slate-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-slate-400" />
        )}
      </button>

      {/* Expanded Form */}
      {isExpanded && (
        <div className="border-t border-slate-100 p-3 bg-slate-50 space-y-3">
          {/* Program Dropdown */}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">
              Program
            </label>
            <div className="relative">
              <Building2 className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <select
                value={programId || ''}
                onChange={(e) => setProgramId(e.target.value || null)}
                className="w-full h-9 pl-9 pr-3 text-sm bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary"
              >
                <option value="">Select a program...</option>
                {programs.map((program) => (
                  <option key={program.id} value={program.id}>
                    {program.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Project Dropdown */}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">
              Project
            </label>
            <div className="relative">
              <FolderKanban className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <select
                value={projectId || ''}
                onChange={(e) => setProjectId(e.target.value || null)}
                disabled={!programId}
                className="w-full h-9 pl-9 pr-3 text-sm bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="">
                  {programId ? 'Select a project...' : 'Select program first'}
                </option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
