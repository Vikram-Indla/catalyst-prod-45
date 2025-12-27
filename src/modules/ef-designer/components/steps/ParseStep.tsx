import React, { useState } from 'react';
import { EFDSession } from '../../types/efd.types';
import { useEFDAtoms, useEFDDocuments } from '../../hooks/useEFDSession';
import { useParseDocument } from '../../hooks/useEFDAI';
import { useUpdateAtom } from '../../hooks/useEFDMutations';
import { Bot, Loader2, CheckCircle, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { EditableAtomRow } from '../atoms/EditableAtomRow';

export const ParseStep: React.FC<{ session: EFDSession }> = ({ session }) => {
  const { data: atoms = [], isLoading: atomsLoading, refetch } = useEFDAtoms(session.id);
  const { data: documents = [] } = useEFDDocuments(session.id);
  const parseDocument = useParseDocument();
  const updateAtom = useUpdateAtom();
  const [parseProgress, setParseProgress] = useState(0);

  const handleParse = async () => {
    const content = session.text_input || 'Sample requirements text for parsing';
    
    if (!content || content.trim().length === 0) {
      return;
    }

    setParseProgress(10);
    
    try {
      await parseDocument.mutateAsync({
        sessionId: session.id,
        documentContent: content,
        documentName: 'Text Input',
      });
      setParseProgress(100);
      refetch();
    } catch (error) {
      setParseProgress(0);
    }
  };

  const handleUpdateAtom = (atomId: string, updates: Record<string, any>) => {
    updateAtom.mutate({ atomId, updates });
  };

  const handleToggleSelection = (atomId: string, selected: boolean) => {
    updateAtom.mutate({ 
      atomId, 
      updates: { 
        is_selected: selected,
        status: selected ? 'unmapped' : 'excluded' 
      } 
    });
  };

  const isParsing = parseDocument.isPending;

  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-1">Parse Requirements</h2>
        <p className="text-muted-foreground">AI will extract atomic requirements from your inputs.</p>
      </div>

      {/* Parse Action Card */}
      {atoms.length === 0 && !isParsing && (
        <div className="border rounded-xl p-8 text-center bg-gradient-to-br from-primary/5 to-primary/10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
            <Sparkles className="h-8 w-8 text-primary" />
          </div>
          <h3 className="font-semibold text-lg mb-2">Ready to Extract Requirements</h3>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            Our AI will analyze your {documents.length > 0 ? 'documents' : 'text'} and extract atomic, 
            testable requirements automatically.
          </p>
          <Button size="lg" onClick={handleParse} disabled={!session.text_input && documents.length === 0}>
            <Bot className="h-4 w-4 mr-2" />
            Extract Requirements
          </Button>
          {!session.text_input && documents.length === 0 && (
            <p className="text-sm text-amber-600 mt-3">Go back to Setup to add input first</p>
          )}
        </div>
      )}

      {/* Parsing Progress */}
      {isParsing && (
        <div className="border rounded-xl p-8 bg-card">
          <div className="flex items-center gap-4 mb-4">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <div>
              <h3 className="font-semibold">Parsing in Progress...</h3>
              <p className="text-sm text-muted-foreground">Extracting atomic requirements</p>
            </div>
          </div>
          <Progress value={parseProgress} className="h-2" />
        </div>
      )}

      {/* Results Table */}
      {atoms.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span className="font-semibold">{atoms.length} Requirements Extracted</span>
            </div>
            <Button variant="outline" size="sm" onClick={handleParse} disabled={isParsing}>
              <Bot className="h-4 w-4 mr-2" />
              Re-parse
            </Button>
          </div>

          <div className="border rounded-xl overflow-hidden">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium w-24">ID</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Requirement</th>
                  <th className="px-4 py-3 text-left text-sm font-medium w-32">Type</th>
                  <th className="px-4 py-3 text-left text-sm font-medium w-28">Priority</th>
                  <th className="px-4 py-3 text-center text-sm font-medium w-24">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {atoms.map((atom: any) => (
                  <EditableAtomRow
                    key={atom.id}
                    atom={atom}
                    onUpdate={handleUpdateAtom}
                    onToggleSelection={handleToggleSelection}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};