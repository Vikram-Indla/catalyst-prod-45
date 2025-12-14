/**
 * Workspace Empty State - Parameterized component for Program/Project empty states
 * Enforces strict Catalyst hierarchy: Programs host Epics, Projects host Features
 */
import { FolderOpen, LayoutGrid, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { CreateEpicDialog } from '@/modules/program-epics/components/CreateEpicDialog';
import { CreateFeatureDialog } from '@/modules/project-work-hub/components/dialogs/CreateFeatureDialog';

type ContextType = 'program' | 'project';

// Hard guardrails: allowed create types per context
const ALLOWED_CREATE_TYPES: Record<ContextType, readonly string[]> = {
  program: ['epic'] as const,
  project: ['feature'] as const,
} as const;

const CONTEXT_CONFIG: Record<ContextType, {
  icon: typeof FolderOpen;
  title: string;
  subtitle: string;
  ctaLabel: string;
  ctaType: 'epic' | 'feature';
}> = {
  program: {
    icon: FolderOpen,
    title: 'This program is empty',
    subtitle: 'Create your first epic to start planning work in this program.',
    ctaLabel: 'Create epic',
    ctaType: 'epic',
  },
  project: {
    icon: LayoutGrid,
    title: 'This project is empty',
    subtitle: 'Create your first feature to start tracking delivery in this project.',
    ctaLabel: 'Create feature',
    ctaType: 'feature',
  },
};

interface WorkspaceEmptyStateProps {
  contextType: ContextType;
  contextId: string;
  contextName?: string;
}

export function WorkspaceEmptyState({ 
  contextType, 
  contextId,
  contextName 
}: WorkspaceEmptyStateProps) {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  
  const config = CONTEXT_CONFIG[contextType];
  const allowedTypes = ALLOWED_CREATE_TYPES[contextType];
  const Icon = config.icon;

  // Hard guardrail: validate CTA type is allowed for this context
  if (!allowedTypes.includes(config.ctaType)) {
    console.error(`[WorkspaceEmptyState] Invalid CTA type "${config.ctaType}" for context "${contextType}"`);
    return null;
  }

  const handleCreateClick = () => {
    setIsCreateDialogOpen(true);
  };

  const handleDialogClose = () => {
    setIsCreateDialogOpen(false);
  };

  return (
    <>
      <div 
        className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center"
        style={{ backgroundColor: 'var(--bg)' }}
      >
        <div 
          className="w-16 h-16 rounded-full flex items-center justify-center mb-6"
          style={{ backgroundColor: 'var(--surface-2)' }}
        >
          <Icon className="w-8 h-8" style={{ color: 'var(--text-2)' }} />
        </div>
        
        <h2 className="text-xl font-semibold mb-2" style={{ color: 'var(--text-1)' }}>
          {config.title}
        </h2>
        
        <p className="text-sm max-w-md mb-8" style={{ color: 'var(--text-2)' }}>
          {config.subtitle}
          {contextName && (
            <span className="block mt-1 font-medium" style={{ color: 'var(--text-1)' }}>
              {contextName}
            </span>
          )}
        </p>

        <Button 
          onClick={handleCreateClick}
          className="bg-brand-gold hover:bg-brand-gold-hover text-white"
        >
          <Plus className="w-4 h-4 mr-2" />
          {config.ctaLabel}
        </Button>
      </div>

      {/* Program context: Epic dialog */}
      {contextType === 'program' && (
        <CreateEpicDialog
          open={isCreateDialogOpen}
          onOpenChange={setIsCreateDialogOpen}
          programId={contextId}
        />
      )}

      {/* Project context: Feature dialog */}
      {contextType === 'project' && (
        <CreateFeatureDialog
          isOpen={isCreateDialogOpen}
          onClose={handleDialogClose}
          onSubmit={() => {
            handleDialogClose();
          }}
          projectId={contextId}
        />
      )}
    </>
  );
}

// Export allowed types for use in other components (e.g., create menus)
export { ALLOWED_CREATE_TYPES };
