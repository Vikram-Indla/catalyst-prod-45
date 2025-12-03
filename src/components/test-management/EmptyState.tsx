import React from 'react';
import { TestTube } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EmptyStateProps {
  onCreateClick?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ onCreateClick }) => {
  return (
    <div className="flex flex-col items-center justify-center h-[500px] text-center px-4">
      <div className="rounded-full bg-muted p-6 mb-6">
        <TestTube className="h-16 w-16 text-muted-foreground" />
      </div>
      <h3 className="text-2xl font-semibold text-foreground mb-2">
        No test cases yet
      </h3>
      <p className="text-muted-foreground mb-6 max-w-md">
        Create your first test case to get started with test management
      </p>
      <Button 
        className="bg-brand-gold text-brand-dark hover:bg-brand-gold-hover"
        onClick={onCreateClick}
      >
        Create Test Case
      </Button>
    </div>
  );
};