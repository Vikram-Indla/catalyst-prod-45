import React, { useState, useCallback } from 'react';
import { EFDSession } from '../../types/efd.types';
import { useUpdateEFDSession, useEFDDocuments } from '../../hooks/useEFDSession';
import { useUploadDocument, useDeleteDocument } from '../../hooks/useEFDDocuments';
import { Upload, FileText, X, CheckCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useDropzone } from 'react-dropzone';
import { toast } from 'sonner';

interface SetupStepProps {
  session: EFDSession;
}

const ACCEPTED_FILE_TYPES = {
  'application/pdf': ['.pdf'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'text/plain': ['.txt'],
};

const MAX_FILES = 5;
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

export const SetupStep: React.FC<SetupStepProps> = ({ session }) => {
  const updateSession = useUpdateEFDSession();
  const { data: documents = [], isLoading: docsLoading } = useEFDDocuments(session.id);
  const uploadDocument = useUploadDocument();
  const deleteDocument = useDeleteDocument();
  const [textInput, setTextInput] = useState(session.text_input || '');

  const wordCount = textInput.trim() ? textInput.trim().split(/\s+/).length : 0;
  const hasInput = documents.length > 0 || wordCount > 0;
  const canUploadMore = documents.length < MAX_FILES;

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (documents.length + acceptedFiles.length > MAX_FILES) {
      toast.error(`Maximum ${MAX_FILES} files allowed`);
      return;
    }

    for (const file of acceptedFiles) {
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`${file.name} exceeds 20MB limit`);
        continue;
      }

      try {
        await uploadDocument.mutateAsync({
          sessionId: session.id,
          file,
        });
      } catch (error) {
        toast.error(`Failed to upload ${file.name}`);
      }
    }
  }, [session.id, documents.length, uploadDocument]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_FILE_TYPES,
    maxFiles: MAX_FILES - documents.length,
    disabled: !canUploadMore || uploadDocument.isPending,
  });

  const handleTextChange = (value: string) => {
    setTextInput(value);
    const words = value.trim() ? value.trim().split(/\s+/).length : 0;
    updateSession.mutate({
      sessionId: session.id,
      updates: { text_input: value, text_word_count: words }
    });
  };

  const handleDeleteDocument = async (docId: string) => {
    try {
      await deleteDocument.mutateAsync({ documentId: docId, sessionId: session.id });
    } catch (error) {
      toast.error('Failed to delete document');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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
          <p className="text-sm text-muted-foreground mb-4">Max {MAX_FILES} files, 20MB each</p>
          
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer
              ${isDragActive ? 'border-primary bg-primary/5' : 'hover:border-primary/50'}
              ${!canUploadMore ? 'opacity-50 cursor-not-allowed' : ''}
              ${uploadDocument.isPending ? 'pointer-events-none' : ''}`}
          >
            <input {...getInputProps()} />
            {uploadDocument.isPending ? (
              <>
                <Loader2 className="h-10 w-10 mx-auto text-primary mb-2 animate-spin" />
                <p className="font-medium">Uploading...</p>
              </>
            ) : (
              <>
                <FileText className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                <p className="font-medium">
                  {isDragActive ? 'Drop files here' : 'Drop files here or click to browse'}
                </p>
                <p className="text-sm text-muted-foreground">PDF, DOCX, TXT • Max {MAX_FILES} files</p>
              </>
            )}
          </div>

          {documents.length > 0 && (
            <div className="mt-4 space-y-2">
              {documents.map((doc: any) => (
                <div key={doc.id} className="flex items-center justify-between p-2 bg-muted rounded-lg">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="text-sm truncate">{doc.file_name}</span>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {formatFileSize(doc.file_size)}
                    </span>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => handleDeleteDocument(doc.id)}
                    disabled={deleteDocument.isPending}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
          <p className="text-sm text-muted-foreground mt-2">{documents.length}/{MAX_FILES} files</p>
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