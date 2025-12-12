/**
 * Project Empty State - Shown when a project has no content
 * Provides guidance and CTA to create first work item
 */
import { LayoutGrid, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate, useParams } from 'react-router-dom';

interface ProjectEmptyStateProps {
  projectName?: string;
  onCreateWorkItem?: () => void;
}

export function ProjectEmptyState({ projectName, onCreateWorkItem }: ProjectEmptyStateProps) {
  const navigate = useNavigate();
  const { projectId } = useParams();

  const handleCreateWorkItem = () => {
    if (onCreateWorkItem) {
      onCreateWorkItem();
    } else {
      // Navigate to work item creation or open modal
      navigate(`/programs/${projectId}/backlog?create=true`);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-6">
        <LayoutGrid className="w-8 h-8 text-muted-foreground" />
      </div>
      
      <h2 className="text-xl font-semibold text-foreground mb-2">
        Start tracking work in this project
      </h2>
      
      <p className="text-sm text-muted-foreground max-w-md mb-8">
        Create your first item to populate boards and lists.
        {projectName && (
          <span className="block mt-1 text-foreground font-medium">
            {projectName}
          </span>
        )}
      </p>

      <Button 
        onClick={handleCreateWorkItem}
        className="bg-brand-gold hover:bg-brand-gold-hover text-background"
      >
        <Plus className="w-4 h-4 mr-2" />
        Create work item
      </Button>
    </div>
  );
}
