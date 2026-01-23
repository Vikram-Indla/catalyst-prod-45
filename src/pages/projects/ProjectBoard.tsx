import { useOutletContext } from 'react-router-dom';
import { Columns3 } from 'lucide-react';
import type { Project } from '@/types/project';

export default function ProjectBoard() {
  const { project } = useOutletContext<{ project: Project }>();

  return (
    <div className="h-full flex items-center justify-center bg-muted/30">
      <div className="text-center">
        <Columns3 className="w-16 h-16 text-muted-foreground/50 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-foreground mb-2">
          {project.name} Board
        </h2>
        <p className="text-muted-foreground">
          Board view will be implemented in Sprint 5
        </p>
      </div>
    </div>
  );
}
