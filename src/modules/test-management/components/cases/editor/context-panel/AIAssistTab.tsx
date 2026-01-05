/**
 * AI Assist Tab Component
 * AI-powered suggestions and step generation
 */

import React, { useState } from 'react';
import {
  Sparkles,
  Wand2,
  FileText,
  ListChecks,
  Lightbulb,
  ArrowRight,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

interface AIAssistTabProps {
  onGenerateSteps?: (prompt: string) => Promise<void>;
  onImproveDescription?: () => Promise<void>;
  onSuggestCases?: () => Promise<void>;
  isLoading?: boolean;
}

interface QuickActionProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
  isLoading?: boolean;
}

function QuickAction({ icon, title, description, onClick, isLoading }: QuickActionProps) {
  return (
    <button
      onClick={onClick}
      disabled={isLoading}
      className={cn(
        'flex items-start gap-3 w-full p-3 rounded-lg border border-border',
        'bg-muted/30 hover:bg-muted/50 hover:border-primary/20',
        'text-left transition-all duration-150',
        'disabled:opacity-50 disabled:cursor-not-allowed'
      )}
    >
      <div className="flex items-center justify-center w-8 h-8 rounded-md bg-primary/10 text-primary shrink-0">
        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[12px] font-semibold text-foreground mb-0.5">{title}</div>
        <div className="text-[11px] text-muted-foreground">{description}</div>
      </div>
      <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0 mt-2" />
    </button>
  );
}

export function AIAssistTab({
  onGenerateSteps,
  onImproveDescription,
  onSuggestCases,
  isLoading,
}: AIAssistTabProps) {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    if (!prompt.trim() || !onGenerateSteps) return;
    
    setIsGenerating(true);
    try {
      await onGenerateSteps(prompt);
      setPrompt('');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* AI Generate Section */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <div className="flex items-center justify-center w-6 h-6 rounded bg-gradient-to-br from-primary to-purple-500 text-white">
            <Sparkles className="h-3.5 w-3.5" />
          </div>
          <h3 className="text-[11px] font-bold text-foreground uppercase tracking-wider">
            AI Step Generator
          </h3>
        </div>
        
        <div className="space-y-2.5">
          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe what you want to test...&#10;&#10;Example: Test user login with valid credentials and verify dashboard access"
            className="min-h-[100px] text-sm resize-y"
          />
          <Button
            onClick={handleGenerate}
            disabled={!prompt.trim() || isGenerating}
            className="w-full gap-2 bg-gradient-to-r from-primary to-purple-500 hover:from-primary/90 hover:to-purple-500/90"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Wand2 className="h-4 w-4" />
                Generate Steps
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2.5">
          Quick Actions
        </h3>
        
        <div className="space-y-2">
          <QuickAction
            icon={<FileText className="h-4 w-4" />}
            title="Improve Description"
            description="Enhance objective and preconditions with AI"
            onClick={onImproveDescription || (() => {})}
            isLoading={isLoading}
          />
          
          <QuickAction
            icon={<ListChecks className="h-4 w-4" />}
            title="Add Edge Cases"
            description="Generate additional test scenarios"
            onClick={() => {}}
            isLoading={isLoading}
          />
          
          <QuickAction
            icon={<Lightbulb className="h-4 w-4" />}
            title="Suggest Similar Cases"
            description="Find related test cases to link"
            onClick={onSuggestCases || (() => {})}
            isLoading={isLoading}
          />
        </div>
      </div>

      {/* Tips */}
      <div className="p-3 rounded-lg bg-primary/5 border border-primary/10">
        <div className="flex items-start gap-2">
          <Lightbulb className="h-4 w-4 text-primary shrink-0 mt-0.5" />
          <div>
            <div className="text-[11px] font-semibold text-foreground mb-1">Pro Tip</div>
            <div className="text-[11px] text-muted-foreground leading-relaxed">
              Be specific about the feature and expected behavior. Include edge cases 
              and error conditions for more comprehensive test coverage.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
