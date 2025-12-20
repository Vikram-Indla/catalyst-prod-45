import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { ChevronRight, Construction } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ProjectComingSoonPageProps {
  pageTitle: string;
}

export const ProjectComingSoonPage: React.FC<ProjectComingSoonPageProps> = ({ pageTitle }) => {
  const { projectId } = useParams();

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-sm text-muted-foreground mb-2">
          <Link to="/projects" className="hover:text-foreground transition-colors">Projects</Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <Link to={`/projects/${projectId}/work`} className="hover:text-foreground transition-colors">Project Room</Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="text-foreground">{pageTitle}</span>
        </nav>

        <h1 className="text-2xl font-medium text-foreground">{pageTitle}</h1>
      </div>

      {/* Coming Soon Content */}
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center max-w-md px-6">
          <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-6">
            <Construction className="h-8 w-8 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-semibold text-foreground mb-2">Coming Soon</h2>
          <p className="text-muted-foreground mb-6">
            The {pageTitle} feature for Project module is currently under development. 
            Check back soon for updates.
          </p>
          <Button variant="outline" asChild>
            <Link to={`/projects/${projectId}/work`}>
              Return to Project Room
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ProjectComingSoonPage;
