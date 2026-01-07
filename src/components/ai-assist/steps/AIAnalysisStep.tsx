import React, { useState } from 'react';
import { Brain, Check, Circle, Loader2, Search, Filter, BookOpen, MessageSquare, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { useLatestArtifactsForDraft } from '@/hooks/useAIAssistArtifacts';
import { useAIAssistDocuments } from '@/hooks/useAIAssistDocuments';
import { useAIAssistAnalyze } from '@/hooks/useAIAssistAnalyze';
import { toast } from 'sonner';

export interface AIAnalysisStepProps {
  draftId: string;
  runId?: string;
  onAnalysisComplete?: () => void;
}

interface ProcessingStep {
  id: string;
  label: string;
  status: 'pending' | 'active' | 'done';
  duration?: string;
}

// Evidence item component
function EvidenceItem({ evidence, index }: { evidence: { text_en: string; text_ar?: string; page?: string; lines?: string; confidence?: number }; index: number }) {
  return (
    <div className="bg-muted/50 rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-primary/10 text-primary text-xs font-semibold rounded font-mono">
          P{evidence.page || '01'} L{evidence.lines || `${(index * 5 + 1).toString().padStart(3, '0')}`}
        </span>
        <span className="text-xs font-medium text-[hsl(var(--success))]">
          {((evidence.confidence || 0.95) * 100).toFixed(1)}% OCR
        </span>
      </div>
      
      <p className="text-sm leading-relaxed">{evidence.text_en}</p>
      
      {evidence.text_ar && (
        <div className="bg-card rounded p-3 border border-border/50">
          <p className="text-sm text-muted-foreground leading-relaxed" dir="rtl">
            {evidence.text_ar}
          </p>
        </div>
      )}
      
      <div className="flex gap-2">
        <span className="text-xs px-2 py-1 bg-card border border-border/50 rounded text-muted-foreground">
          📋 requirement
        </span>
        <Button variant="ghost" size="sm" className="h-6 text-xs">
          🔗 Link to FR
        </Button>
      </div>
    </div>
  );
}

// Glossary term component
function GlossaryTerm({ term }: { term: { term_en: string; term_ar?: string; definition?: string } }) {
  return (
    <div className="bg-muted/50 rounded-lg p-3 space-y-2">
      <div className="flex items-center gap-2">
        <span className="font-semibold text-sm">{term.term_en}</span>
        {term.term_ar && (
          <span className="text-sm text-muted-foreground" dir="rtl">{term.term_ar}</span>
        )}
      </div>
      {term.definition && (
        <p className="text-xs text-muted-foreground">{term.definition}</p>
      )}
    </div>
  );
}

export function AIAnalysisStep({ draftId, runId, onAnalysisComplete }: AIAnalysisStepProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('evidence');
  
  const { data: artifacts = [], refetch: refetchArtifacts } = useLatestArtifactsForDraft(draftId);
  const { data: documents = [] } = useAIAssistDocuments(draftId);
  const { runAnalysis, isAnalyzing, progress, currentTask } = useAIAssistAnalyze({
    onSuccess: () => {
      refetchArtifacts();
    },
  });

  const evidenceArtifact = artifacts.find(a => a.artifact_type === 'evidence');
  const glossaryArtifact = artifacts.find(a => a.artifact_type === 'glossary');
  const memoArtifact = artifacts.find(a => a.artifact_type === 'memo');

  // Support both evidence formats
  const evidenceData = evidenceArtifact?.content_json as { 
    items?: Array<{ text_en: string; text_ar?: string; page?: string; lines?: string; confidence?: number }>;
    evidence?: Array<{ id: string; statement: string; source_ref?: string; confidence?: string; category?: string }>;
  } | undefined;
  
  const evidenceItems = evidenceData?.items || 
    (evidenceData?.evidence?.map((e, idx) => ({
      text_en: e.statement,
      page: e.source_ref?.split(' ')[0] || String(idx + 1),
      confidence: e.confidence === 'high' ? 0.95 : e.confidence === 'medium' ? 0.8 : 0.6,
    })) || []);

  const glossaryData = glossaryArtifact?.content_json as { 
    terms?: Array<{ term_en?: string; term?: string; term_ar?: string; definition?: string }>;
  } | undefined;
  
  const glossaryTerms = glossaryData?.terms?.map(t => ({
    term_en: t.term_en || t.term || '',
    term_ar: t.term_ar,
    definition: t.definition,
  })) || [];

  const memoSections = (memoArtifact?.content_json as { sections?: Array<{ title: string; content: string }> })?.sections || [];

  const hasData = evidenceItems.length > 0 || glossaryTerms.length > 0 || memoSections.length > 0;
  const latestDoc = documents[0];
  const hasDocument = !!latestDoc?.extracted_text;

  const handleStartAnalysis = async () => {
    if (!runId || !latestDoc?.extracted_text) {
      toast.error('No document text available for analysis');
      return;
    }

    // Run evidence analysis first
    const evidenceResult = await runAnalysis({
      draftId,
      runId,
      documentText: latestDoc.extracted_text,
      analysisType: 'evidence',
    });

    if (evidenceResult) {
      // Then run glossary analysis
      await runAnalysis({
        draftId,
        runId,
        documentText: latestDoc.extracted_text,
        analysisType: 'glossary',
      });

      toast.success('Analysis complete!');
      onAnalysisComplete?.();
    }
  };

  // Processing state
  if (isAnalyzing) {
    const steps: ProcessingStep[] = [
      { id: 'parse', label: 'Document parsed', status: progress > 10 ? 'done' : 'active', duration: '2s' },
      { id: 'lang', label: 'Language detected', status: progress > 20 ? 'done' : progress > 10 ? 'active' : 'pending', duration: '1s' },
      { id: 'evidence', label: 'Extracting evidence...', status: progress > 60 ? 'done' : progress > 20 ? 'active' : 'pending', duration: progress > 60 ? '15s' : '—' },
      { id: 'glossary', label: 'Building glossary', status: progress > 80 ? 'done' : progress > 60 ? 'active' : 'pending' },
      { id: 'memo', label: 'Generating deep memo', status: progress > 95 ? 'done' : progress > 80 ? 'active' : 'pending' },
    ];

    return (
      <div className="bg-card border border-border rounded-xl p-10 text-center">
        <div className="w-16 h-16 mx-auto mb-6 text-primary animate-pulse">
          <Brain className="h-16 w-16" />
        </div>
        
        <h3 className="text-xl font-semibold mb-2">AI Analysis in Progress</h3>
        <p className="text-sm text-muted-foreground mb-8">
          {currentTask || 'Processing...'}
        </p>

        {/* Progress bar */}
        <div className="max-w-md mx-auto mb-8">
          <div className="h-2 bg-muted rounded-full overflow-hidden mb-2">
            <div
              className="h-full bg-gradient-to-r from-primary to-[hsl(var(--success))] rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-sm text-muted-foreground">{progress}%</p>
        </div>

        {/* Processing steps */}
        <div className="max-w-xs mx-auto text-left space-y-3">
          {steps.map((step) => (
            <div key={step.id} className="flex items-center gap-3 py-2 border-b border-border/50 last:border-0">
              <div className={cn(
                "w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0",
                step.status === 'done' && "bg-[hsl(var(--success))] text-white",
                step.status === 'active' && "bg-primary text-white animate-pulse",
                step.status === 'pending' && "bg-muted text-muted-foreground"
              )}>
                {step.status === 'done' && <Check className="h-3 w-3" />}
                {step.status === 'active' && <Loader2 className="h-3 w-3 animate-spin" />}
                {step.status === 'pending' && <Circle className="h-3 w-3" />}
              </div>
              <span className="flex-1 text-sm">{step.label}</span>
              <span className="text-xs text-muted-foreground">{step.duration || '—'}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Results state
  if (hasData) {
    return (
      <div className="space-y-6">
        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-4">
          <button
            onClick={() => setActiveTab('evidence')}
            className={cn(
              "bg-card border rounded-xl p-5 text-center transition-all hover:shadow-md hover:-translate-y-0.5",
              activeTab === 'evidence' ? 'border-primary shadow-md' : 'border-border'
            )}
          >
            <p className="text-4xl font-bold">{evidenceItems.length}</p>
            <p className="text-sm text-muted-foreground mt-1">Evidence Items</p>
            <p className="text-xs text-primary font-medium mt-3">View →</p>
          </button>
          
          <button
            onClick={() => setActiveTab('glossary')}
            className={cn(
              "bg-card border rounded-xl p-5 text-center transition-all hover:shadow-md hover:-translate-y-0.5",
              activeTab === 'glossary' ? 'border-primary shadow-md' : 'border-border'
            )}
          >
            <p className="text-4xl font-bold">{glossaryTerms.length}</p>
            <p className="text-sm text-muted-foreground mt-1">Glossary Terms</p>
            <p className="text-xs text-primary font-medium mt-3">View →</p>
          </button>
          
          <button
            onClick={() => setActiveTab('memo')}
            className={cn(
              "bg-card border rounded-xl p-5 text-center transition-all hover:shadow-md hover:-translate-y-0.5",
              activeTab === 'memo' ? 'border-primary shadow-md' : 'border-border'
            )}
          >
            <p className="text-4xl font-bold">{memoSections.length}</p>
            <p className="text-sm text-muted-foreground mt-1">Memo Sections</p>
            <p className="text-xs text-primary font-medium mt-3">View →</p>
          </button>
        </div>

        {/* Tabbed content */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="flex items-center justify-between gap-4 mb-4">
            <TabsList className="bg-muted/50 p-1">
              <TabsTrigger value="evidence" className="gap-2">
                <FileText className="h-4 w-4" />
                Evidence
              </TabsTrigger>
              <TabsTrigger value="glossary" className="gap-2">
                <BookOpen className="h-4 w-4" />
                Glossary
              </TabsTrigger>
              <TabsTrigger value="memo" className="gap-2">
                <MessageSquare className="h-4 w-4" />
                Deep Memo
              </TabsTrigger>
            </TabsList>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 w-48"
                />
              </div>
              <Button variant="outline" size="icon" className="h-9 w-9">
                <Filter className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <TabsContent value="evidence" className="space-y-3 max-h-96 overflow-y-auto">
            {evidenceItems.map((item, idx) => (
              <EvidenceItem key={idx} evidence={item} index={idx} />
            ))}
          </TabsContent>

          <TabsContent value="glossary" className="grid grid-cols-2 gap-3 max-h-96 overflow-y-auto">
            {glossaryTerms.map((term, idx) => (
              <GlossaryTerm key={idx} term={term} />
            ))}
          </TabsContent>

          <TabsContent value="memo" className="space-y-4 max-h-96 overflow-y-auto">
            {memoSections.map((section, idx) => (
              <div key={idx} className="bg-muted/50 rounded-lg p-4">
                <h4 className="font-semibold mb-2">{section.title}</h4>
                <p className="text-sm text-muted-foreground">{section.content}</p>
              </div>
            ))}
          </TabsContent>
        </Tabs>
      </div>
    );
  }

  // Empty/pending state
  return (
    <div className="space-y-6">
      <div className="bg-muted/50 rounded-xl p-8 text-center">
        <Brain className="h-12 w-12 mx-auto mb-4 text-primary opacity-60" />
        <h3 className="text-lg font-semibold mb-2">AI Analysis Engine</h3>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          Extracts evidence, generates glossary, and creates a deep memo from your document.
        </p>
        <Button 
          className="mt-6 gap-2" 
          onClick={handleStartAnalysis}
          disabled={!hasDocument || !runId}
        >
          <Brain className="h-4 w-4" />
          Start Analysis
        </Button>
        {!hasDocument && (
          <p className="text-xs text-muted-foreground mt-2">
            Upload a document in the previous step first
          </p>
        )}
      </div>

      {/* Preview metrics */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-muted/30 rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-muted-foreground">—</p>
          <p className="text-xs text-muted-foreground mt-1">Evidence Items</p>
        </div>
        <div className="bg-muted/30 rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-muted-foreground">—</p>
          <p className="text-xs text-muted-foreground mt-1">Glossary Terms</p>
        </div>
        <div className="bg-muted/30 rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-muted-foreground">—</p>
          <p className="text-xs text-muted-foreground mt-1">Memo Sections</p>
        </div>
      </div>
    </div>
  );
}
