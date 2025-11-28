import { useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { BacklogViewSelector, BacklogView } from '@/components/portfolio/BacklogViewSelector';
import { ThemeBacklog } from '@/components/backlog/ThemeBacklog';

// Citation: (Doc: Navigate to the backlog - PDF provided)
// Citation: (Doc: Backlog for themes - PDF provided)
// Citation: (Screenshot: c2770448-efec-46c5-a69d-09164f3860c1.png)

export default function PortfolioBacklog() {
  const { portfolioId } = useParams<{ portfolioId: string }>();
  const [searchParams] = useSearchParams();
  const piId = searchParams.get('pi');
  
  const [viewingOption, setViewingOption] = useState<BacklogView>('theme');

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="border-b bg-card px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">Backlog</h1>
          
          <BacklogViewSelector 
            value={viewingOption} 
            onChange={setViewingOption}
          />
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden">
        {viewingOption === 'theme' && (
          <ThemeBacklog portfolioId={portfolioId || ''} piId={piId || undefined} />
        )}
        
        {viewingOption === 'epic' && (
          <div className="p-6">
            <div className="bg-muted/30 border border-dashed rounded-lg p-8 text-center">
              <p className="text-sm text-muted-foreground">
                Epic Backlog view will be implemented in Phase 2
              </p>
            </div>
          </div>
        )}
        
        {viewingOption === 'capability' && (
          <div className="p-6">
            <div className="bg-muted/30 border border-dashed rounded-lg p-8 text-center">
              <p className="text-sm text-muted-foreground">
                Capability Backlog view will be implemented in Phase 2
              </p>
            </div>
          </div>
        )}
        
        {viewingOption === 'feature' && (
          <div className="p-6">
            <div className="bg-muted/30 border border-dashed rounded-lg p-8 text-center">
              <p className="text-sm text-muted-foreground">
                Feature Backlog view will be implemented in Phase 2
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
