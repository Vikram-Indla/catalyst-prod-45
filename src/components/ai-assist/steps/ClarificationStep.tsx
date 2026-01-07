import React, { useState } from 'react';
import { HelpCircle, CheckCircle2, AlertCircle, Sparkles, ChevronDown, Link2, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface Question {
  id: string;
  titleAr: string;
  titleEn: string;
  descriptionAr: string;
  descriptionEn: string;
  isBlocking: boolean;
  evidenceRefs: string[];
  answer?: string;
  skipped?: boolean;
}

interface ClarificationStepProps {
  questions?: Question[];
  onAnswerSave?: (questionId: string, answer: string) => void;
  onSkip?: (questionId: string) => void;
}

export function ClarificationStep({
  questions = [],
  onAnswerSave,
  onSkip
}: ClarificationStepProps) {
  const [filter, setFilter] = useState<'all' | 'blocking' | 'optional' | 'answered'>('all');
  const [expandedQuestion, setExpandedQuestion] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const blockingCount = questions.filter(q => q.isBlocking && !q.answer && !q.skipped).length;
  const optionalCount = questions.filter(q => !q.isBlocking && !q.answer && !q.skipped).length;
  const answeredCount = questions.filter(q => q.answer || q.skipped).length;

  const filteredQuestions = questions.filter(q => {
    switch (filter) {
      case 'blocking': return q.isBlocking && !q.answer && !q.skipped;
      case 'optional': return !q.isBlocking && !q.answer && !q.skipped;
      case 'answered': return q.answer || q.skipped;
      default: return true;
    }
  });

  const handleSaveAnswer = (questionId: string) => {
    const answer = answers[questionId];
    if (answer && onAnswerSave) {
      onAnswerSave(questionId, answer);
    }
  };

  // Empty state - no questions needed
  if (questions.length === 0) {
    return (
      <div className="space-y-6">
        <div className="bg-card border border-border rounded-xl p-12 text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-success/10 mb-6">
            <Sparkles className="h-10 w-10 text-success" />
          </div>
          
          <h3 className="text-xl font-semibold mb-2">No Clarification Needed!</h3>
          <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">
            Your requirements document was clear enough that no additional questions were generated.
          </p>

          <div className="inline-flex items-center gap-2 px-4 py-2 bg-success/10 rounded-full text-success text-sm font-medium">
            <CheckCircle2 className="h-4 w-4" />
            Document Quality: Excellent
          </div>

          <div className="mt-8">
            <Button className="gap-2">
              Continue to BRD Generation
              <ChevronDown className="h-4 w-4 rotate-[-90deg]" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <p className="text-3xl font-bold text-primary">{questions.length}</p>
          <p className="text-sm text-muted-foreground mt-1">Total</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <p className="text-3xl font-bold text-destructive">{blockingCount}</p>
          <p className="text-sm text-muted-foreground mt-1">Blocking</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <p className="text-3xl font-bold text-muted-foreground">{optionalCount}</p>
          <p className="text-sm text-muted-foreground mt-1">Optional</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <p className="text-3xl font-bold text-success">{answeredCount}</p>
          <p className="text-sm text-muted-foreground mt-1">Answered</p>
        </div>
      </div>

      {/* Blocking Warning */}
      {blockingCount > 0 && (
        <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-sm">
              {blockingCount} blocking question{blockingCount > 1 ? 's' : ''} must be answered to continue
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Answer or skip with justification before proceeding.
            </p>
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex gap-2 flex-wrap">
        {(['all', 'blocking', 'optional', 'answered'] as const).map((f) => (
          <Button
            key={f}
            variant={filter === f ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter(f)}
            className="gap-1"
          >
            {f === 'blocking' && <AlertCircle className="h-3 w-3" />}
            {f === 'answered' && <CheckCircle2 className="h-3 w-3" />}
            {f.charAt(0).toUpperCase() + f.slice(1)}
            <Badge variant="secondary" className="ms-1 text-xs">
              {f === 'all' && questions.length}
              {f === 'blocking' && blockingCount}
              {f === 'optional' && optionalCount}
              {f === 'answered' && answeredCount}
            </Badge>
          </Button>
        ))}
      </div>

      {/* Questions List */}
      <div className="space-y-4">
        {filteredQuestions.map((question) => (
          <Collapsible
            key={question.id}
            open={expandedQuestion === question.id}
            onOpenChange={(open) => setExpandedQuestion(open ? question.id : null)}
          >
            <div className={cn(
              "bg-card border rounded-xl overflow-hidden",
              question.isBlocking && !question.answer && !question.skipped
                ? "border-destructive/30"
                : "border-border"
            )}>
              <CollapsibleTrigger asChild>
                <button className="w-full p-4 flex items-start gap-4 hover:bg-muted/50 transition-colors text-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline" className="font-mono text-xs">
                        {question.id}
                      </Badge>
                      {question.isBlocking ? (
                        <Badge className="bg-destructive/10 text-destructive border-destructive/30 text-xs">
                          🔴 BLOCKING
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs">
                          ⚪ OPTIONAL
                        </Badge>
                      )}
                      {question.answer && (
                        <Badge className="bg-success/10 text-success border-success/30 text-xs">
                          <CheckCircle2 className="h-3 w-3 me-1" />
                          Answered
                        </Badge>
                      )}
                      {question.skipped && (
                        <Badge variant="secondary" className="text-xs">
                          Skipped
                        </Badge>
                      )}
                    </div>
                    <h4 className="font-medium">{question.titleEn}</h4>
                  </div>
                  <ChevronDown className={cn(
                    "h-4 w-4 text-muted-foreground flex-shrink-0 mt-1 transition-transform",
                    expandedQuestion === question.id && "rotate-180"
                  )} />
                </button>
              </CollapsibleTrigger>
              
              <CollapsibleContent>
                <div className="px-4 pb-4 pt-0 border-t border-border">
                  <div className="pt-4 space-y-4">
                    {/* Arabic version */}
                    <div className="p-4 bg-muted/30 rounded-lg" dir="rtl">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-medium text-muted-foreground">🇸🇦 Arabic</span>
                      </div>
                      <p className="text-sm font-medium mb-1">{question.titleAr}</p>
                      <p className="text-sm text-muted-foreground">{question.descriptionAr}</p>
                    </div>

                    {/* English version */}
                    <div className="p-4 bg-muted/30 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-medium text-muted-foreground">🇬🇧 English</span>
                      </div>
                      <p className="text-sm font-medium mb-1">{question.titleEn}</p>
                      <p className="text-sm text-muted-foreground">{question.descriptionEn}</p>
                    </div>

                    {/* Evidence References */}
                    {question.evidenceRefs.length > 0 && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Link2 className="h-3 w-3" />
                        <span>Related Evidence:</span>
                        {question.evidenceRefs.map((ref, idx) => (
                          <Badge key={idx} variant="secondary" className="text-xs font-mono">
                            {ref}
                          </Badge>
                        ))}
                      </div>
                    )}

                    {/* Answer section */}
                    {!question.answer && !question.skipped && (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <MessageSquare className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">Your Answer</span>
                        </div>
                        <Textarea
                          placeholder="Enter your answer..."
                          value={answers[question.id] || ''}
                          onChange={(e) => setAnswers(prev => ({ ...prev, [question.id]: e.target.value }))}
                          rows={3}
                        />
                        <div className="flex items-center gap-2">
                          <Button 
                            size="sm" 
                            onClick={() => handleSaveAnswer(question.id)}
                            disabled={!answers[question.id]}
                          >
                            Save Answer
                          </Button>
                          <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={() => onSkip?.(question.id)}
                          >
                            Skip (N/A)
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Answered display */}
                    {question.answer && (
                      <div className="p-4 bg-success/5 border border-success/20 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <CheckCircle2 className="h-4 w-4 text-success" />
                          <span className="text-sm font-medium">Answer</span>
                        </div>
                        <p className="text-sm">{question.answer}</p>
                      </div>
                    )}
                  </div>
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>
        ))}
      </div>

      {filteredQuestions.length === 0 && filter !== 'all' && (
        <div className="bg-muted/30 rounded-xl p-8 text-center">
          <p className="text-sm text-muted-foreground">No questions match this filter.</p>
        </div>
      )}
    </div>
  );
}
