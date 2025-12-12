/**
 * Program Empty State - Shown when a program has no content
 * Provides guidance and CTA to create first epic
 */
import { FolderOpen, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate, useParams } from 'react-router-dom';

interface ProgramEmptyStateProps {
  programName?: string;
  onCreateEpic?: () => void;
}

export function ProgramEmptyState({ programName, onCreateEpic }: ProgramEmptyStateProps) {
  const navigate = useNavigate();
  const { programId } = useParams();

  const handleCreateEpic = () => {
    if (onCreateEpic) {
      onCreateEpic();
    } else {
      // Navigate to epic creation or open modal
      navigate(`/program/${programId}/epics?create=true`);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-6">
        <FolderOpen className="w-8 h-8 text-muted-foreground" />
      </div>
      
      <h2 className="text-xl font-semibold text-foreground mb-2">
        This program is empty
      </h2>
      
      <p className="text-sm text-muted-foreground max-w-md mb-8">
        Create your first epic to start planning work in this program.
        {programName && (
          <span className="block mt-1 text-foreground font-medium">
            {programName}
          </span>
        )}
      </p>

      <Button 
        onClick={handleCreateEpic}
        className="bg-brand-gold hover:bg-brand-gold-hover text-background"
      >
        <Plus className="w-4 h-4 mr-2" />
        Create epic
      </Button>
    </div>
  );
}
