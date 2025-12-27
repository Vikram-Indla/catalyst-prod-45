import React, { useState } from 'react';
import { EFDSession } from '../../types/efd.types';
import { useUpdateEFDSession, useEFDDocuments } from '../../hooks/useEFDSession';
import { Upload, FileText, X, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

interface SetupStepProps {
  session: EFDSession;
}

export const SetupStep: React.FC<SetupStepProps> = ({ session }) => {
  const updateSession = useUpdateEFDSession();
  const { data: documents = [] } = useEFDDocuments(session.id);
  const [textInput, setTextInput] = useState(session.text_input || '');

  const wordCount = textInput.trim() ? textInput.trim().split(/\s+/).length : 0;
  const hasInput = documents.length > 0 || wordCount > 0;

  const handleTextChange = (value: string) => {
    setTextInput(value);
    const words = value.trim() ? value.trim().split(/\s+/).length : 0;
    updateSession.mutate({
      sessionId: session.id,
      updates: { text_input: value, text_word_count: words }
    });
  };

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-2">Setup</h2>
        <p className="text-muted-foreground">Upload documents or enter requirements text to get started.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* File Upload Card */}
        <div className="border rounded-xl p-6 bg-card">
          <div className="flex items-center gap-2 mb-1">
            <Upload className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Upload Documents</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-4">Max 5 files, 20MB each</p>
          
          <div className="border-2 border-dashed rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer">
            <FileText className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
            <p className="font-medium">Drop files here or click to browse</p>
            <p className="text-sm text-muted-foreground">PDF, DOCX, TXT • Max 5 files</p>
          </div>

          {documents.length > 0 && (
            <div className="mt-4 space-y-2">
              {documents.map((doc: any) => (
                <div key={doc.id} className="flex items-center justify-between p-2 bg-muted rounded-lg">
                  <span className="text-sm truncate">{doc.file_name}</span>
                  <Button variant="ghost" size="sm"><X className="h-4 w-4" /></Button>
                </div>
              ))}
            </div>
          )}
          <p className="text-sm text-muted-foreground mt-2">{documents.length}/5 files</p>
        </div>

        {/* Text Input Card */}
        <div className="border rounded-xl p-6 bg-card">
          <h3 className="font-semibold mb-1">Or Enter Text Directly</h3>
          <p className="text-sm text-muted-foreground mb-4">Max 2000 words</p>
          
          <Textarea
            value={textInput}
            onChange={(e) => handleTextChange(e.target.value)}
            placeholder="Enter your requirements as bullet points or paragraphs..."
            className="min-h-[200px] resize-none"
          />
          <p className={`text-sm mt-2 ${wordCount > 2000 ? 'text-destructive' : 'text-muted-foreground'}`}>
            {wordCount} / 2000 words
          </p>
        </div>
      </div>

      {hasInput && (
        <div className="flex items-center gap-2 p-4 bg-green-50 border border-green-200 rounded-lg">
          <CheckCircle className="h-5 w-5 text-green-600" />
          <span className="text-green-700 font-medium">Ready to Continue</span>
          <span className="text-green-600 text-sm">
            {documents.length} document(s), {wordCount} words entered
          </span>
        </div>
      )}
    </div>
  );
};
