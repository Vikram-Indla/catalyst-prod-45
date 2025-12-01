import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Sparkles } from 'lucide-react';
import { AIGeneratorModal } from './AIGeneratorModal';

interface AITestGeneratorProps {
  storyId: string;
  storyTitle: string;
  storyDescription?: string;
  acceptanceCriteria?: string;
}

export const AITestGenerator: React.FC<AITestGeneratorProps> = ({
  storyId,
  storyTitle,
  storyDescription,
  acceptanceCriteria,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <Button
        onClick={() => setIsModalOpen(true)}
        variant="outline"
        className="gap-2 border-brand-gold text-brand-gold hover:bg-brand-gold/10"
      >
        <Sparkles className="h-4 w-4" />
        Generate Tests with AI
      </Button>

      {isModalOpen && (
        <AIGeneratorModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          storyId={storyId}
          storyTitle={storyTitle}
          storyDescription={storyDescription}
          acceptanceCriteria={acceptanceCriteria}
        />
      )}
    </>
  );
};
