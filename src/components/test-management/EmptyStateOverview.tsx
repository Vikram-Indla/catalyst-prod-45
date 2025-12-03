import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Upload, BookOpen } from 'lucide-react';

interface EmptyStateOverviewProps {
  onCreateClick?: () => void;
  onImportClick?: () => void;
}

export function EmptyStateOverview({ onCreateClick, onImportClick }: EmptyStateOverviewProps) {
  return (
    <Card className="border-2 border-dashed">
      <CardContent className="flex flex-col items-center justify-center py-12 text-center">
        <FileText className="h-16 w-16 text-muted-foreground/50 mb-4" />
        
        <h3 className="text-lg font-semibold mb-2">
          Get Started with Test Management
        </h3>
        
        <p className="text-muted-foreground max-w-md mb-6">
          Since no Cases, Sets and Defects have been created, their count is 0.
          You can create a case and get started quickly.
        </p>
        
        <div className="flex gap-3">
          <Button 
            onClick={onCreateClick}
            className="bg-brand-gold text-brand-dark hover:bg-brand-gold-hover"
          >
            <FileText className="h-4 w-4 mr-2" />
            Create Test Case
          </Button>
          
          <Button variant="outline" onClick={onImportClick}>
            <Upload className="h-4 w-4 mr-2" />
            Import from Excel
          </Button>
          
          <Button variant="ghost">
            <BookOpen className="h-4 w-4 mr-2" />
            Learn More
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}