// ═══════════════════════════════════════════════════════════════════════════
// OCR PANEL COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

import React, { useState } from 'react';
import { FileSearch, FileText, Loader2, Copy, Check, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface OcrPanelProps {
  attachmentId: string;
  ocrText?: string | null;
  ocrConfidence?: number | null;
  ocrProcessedAt?: string | null;
  onProcess: () => Promise<void>;
}

export const OcrPanel: React.FC<OcrPanelProps> = ({
  attachmentId,
  ocrText,
  ocrConfidence,
  ocrProcessedAt,
  onProcess
}) => {
  const [processing, setProcessing] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleProcess = async () => {
    setProcessing(true);
    try {
      await onProcess();
      toast.success('Text extracted successfully');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'OCR processing failed';
      toast.error(message);
    } finally {
      setProcessing(false);
    }
  };

  const handleCopy = async () => {
    if (!ocrText) return;
    await navigator.clipboard.writeText(ocrText);
    setCopied(true);
    toast.success('Text copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const formatProcessedTime = (date: string) => {
    try {
      return formatDistanceToNow(new Date(date), { addSuffix: true });
    } catch {
      return '';
    }
  };

  // No OCR text yet - show extract button
  if (!ocrText) {
    return (
      <div className="p-4 bg-muted rounded-lg">
        <Button
          onClick={handleProcess}
          disabled={processing}
          className="w-full"
          variant="default"
        >
          {processing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Extracting text...
            </>
          ) : (
            <>
              <FileSearch className="w-4 h-4 mr-2" />
              Extract Text (OCR)
            </>
          )}
        </Button>
        <p className="text-xs text-muted-foreground mt-2 text-center">
          Uses AI to extract text from the image for searching
        </p>
      </div>
    );
  }

  // OCR text exists - show results
  return (
    <div className="p-4 bg-muted rounded-lg space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-foreground flex items-center gap-2">
          <FileText className="w-4 h-4" />
          Extracted Text
        </h4>
        <div className="flex items-center gap-2">
          {ocrConfidence !== null && ocrConfidence !== undefined && (
            <span className={cn(
              "text-xs px-2 py-0.5 rounded-full",
              ocrConfidence >= 0.8 
                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" 
                : "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
            )}>
              {Math.round(ocrConfidence * 100)}% confidence
            </span>
          )}
          <button
            onClick={handleCopy}
            className="p-1 hover:bg-background rounded"
            title="Copy text"
          >
            {copied ? (
              <Check className="w-4 h-4 text-green-500" />
            ) : (
              <Copy className="w-4 h-4 text-muted-foreground" />
            )}
          </button>
        </div>
      </div>
      
      <pre className="text-sm text-foreground bg-background p-3 rounded border border-border max-h-48 overflow-y-auto font-mono whitespace-pre-wrap">
        <HighlightedText text={ocrText} />
      </pre>
      
      <div className="flex items-center justify-between">
        {ocrProcessedAt && (
          <p className="text-xs text-muted-foreground">
            Processed {formatProcessedTime(ocrProcessedAt)}
          </p>
        )}
        <button
          onClick={handleProcess}
          disabled={processing}
          className="text-sm text-primary hover:underline flex items-center gap-1"
        >
          {processing ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <RefreshCw className="w-3 h-3" />
          )}
          Re-process
        </button>
      </div>
    </div>
  );
};

// Pattern highlighting component
const HighlightedText: React.FC<{ text: string }> = ({ text }) => {
  const patterns = [
    { regex: /Error:|Exception:|Failed|FAILED/gi, className: 'text-destructive font-medium' },
    { regex: /https?:\/\/[^\s]+/g, className: 'text-primary underline' },
    { regex: /[\w.-]+@[\w.-]+\.\w+/g, className: 'text-primary' },
    { regex: /\b(404|500|503|401|403)\b/g, className: 'text-destructive font-bold' },
    { regex: /Success|Passed|PASSED|OK/gi, className: 'text-green-600 font-medium' },
  ];

  let result = text;
  patterns.forEach(({ regex, className }) => {
    result = result.replace(regex, (match) => `<span class="${className}">${match}</span>`);
  });

  return <span dangerouslySetInnerHTML={{ __html: result }} />;
};
