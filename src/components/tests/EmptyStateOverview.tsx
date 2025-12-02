import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { FlaskConical, Info } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface EmptyStateOverviewProps {
  programId: string;
}

export function EmptyStateOverview({ programId }: EmptyStateOverviewProps) {
  const navigate = useNavigate();

  return (
    <Card className="p-12 text-center">
      <div className="flex justify-center mb-6">
        <div className="w-24 h-24 rounded-full bg-brand-gold/10 flex items-center justify-center">
          <FlaskConical className="w-12 h-12 text-brand-gold" />
        </div>
      </div>
      
      <h3 className="text-2xl font-semibold mb-3">Get Started with Testing</h3>
      
      <p className="text-muted-foreground mb-2 max-w-md mx-auto">
        Since no Cases, Sets and Defects have been created, their count is 0.
      </p>

      <div className="flex items-center justify-center gap-2 mb-6 text-sm text-muted-foreground">
        <Info className="w-4 h-4 text-brand-gold" />
        <span>An Adhoc cycle has been created automatically for unplanned testing</span>
      </div>
      
      <div className="flex gap-3 justify-center">
        <Button
          onClick={() => navigate(`/programs/${programId}/tests/cases`)}
          className="bg-brand-gold hover:bg-brand-gold/90 text-white"
        >
          Create a case and get started quickly
        </Button>
        <Button variant="outline">
          Import from Excel
        </Button>
      </div>
      
      <Button variant="link" className="mt-4 text-brand-gold">
        Learn More
      </Button>
    </Card>
  );
}
