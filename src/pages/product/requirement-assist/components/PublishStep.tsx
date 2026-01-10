import React, { useState, useEffect } from 'react';
import { Check, FileText, Layers, BookOpen, Download, Share2, ExternalLink, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface PublishStepProps {
  onCreateAnother: () => void;
  onOpenInCatalyst: () => void;
  onUndo: () => void;
}

export function PublishStep({ onCreateAnother, onOpenInCatalyst, onUndo }: PublishStepProps) {
  const [undoSeconds, setUndoSeconds] = useState(300);

  useEffect(() => {
    const timer = setInterval(() => {
      setUndoSeconds(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleExportPDF = () => {
    toast.success('Generating PDF...');
  };

  const handleExportExcel = () => {
    toast.success('Generating Excel...');
  };

  const handleShare = () => {
    toast.success('Share link copied!');
  };

  const successItems = [
    { icon: FileText, label: 'PRD', ids: 'PRD-089', color: 'bg-primary' },
    { icon: Layers, label: 'Epics', ids: 'EPIC-049, EPIC-050', color: 'bg-violet-500' },
    { icon: Layers, label: 'Features', ids: 'FEAT-117, FEAT-118, FEAT-119, FEAT-120, FEAT-121', color: 'bg-teal-500' },
    { icon: BookOpen, label: 'Stories', ids: 'US-513 to US-524', color: 'bg-emerald-500' },
  ];

  return (
    <div className="flex-1 flex flex-col items-center justify-center py-12">
      {/* Success Icon */}
      <div className="w-[88px] h-[88px] bg-emerald-500 rounded-full flex items-center justify-center mb-7 shadow-lg">
        <Check className="w-10 h-10 text-white" />
      </div>
      
      <h2 className="text-2xl font-bold mb-1.5">Published Successfully</h2>
      <p className="text-muted-foreground mb-9">20 items created in Catalyst</p>
      
      {/* Success Items */}
      <div className="w-full max-w-[540px] mb-6 space-y-2.5">
        {successItems.map((item, i) => (
          <div key={i} className="flex items-center gap-4 p-4 bg-card border rounded-lg hover:border-primary transition-colors cursor-pointer">
            <div className={`w-10 h-10 ${item.color} rounded-lg flex items-center justify-center text-white`}>
              <item.icon className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-semibold">{item.label}</h4>
              <p className="text-xs text-muted-foreground">{item.ids}</p>
            </div>
            <span className="text-[13px] text-primary hover:underline flex items-center gap-1">
              View <ExternalLink className="w-3 h-3" />
            </span>
          </div>
        ))}
      </div>
      
      {/* Action Buttons */}
      <div className="flex gap-2.5 mb-6">
        <Button variant="outline" onClick={handleExportPDF}>
          <Download className="w-4 h-4 mr-2" /> Download PRD
        </Button>
        <Button variant="outline" onClick={handleExportExcel}>
          <FileText className="w-4 h-4 mr-2" /> Export Excel
        </Button>
        <Button variant="outline" onClick={handleShare}>
          <Share2 className="w-4 h-4 mr-2" /> Share
        </Button>
      </div>
      
      {/* Undo Notice */}
      {undoSeconds > 0 && (
        <div className="flex items-center gap-3 p-3.5 bg-amber-50 border border-amber-200 rounded-lg text-[13px] text-amber-700 w-full max-w-[540px]">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>Changed your mind?</span>
          <span className="font-mono font-bold text-[15px]">{formatTime(undoSeconds)}</span>
          <Button 
            size="sm" 
            className="ml-auto bg-amber-500 hover:bg-amber-600"
            onClick={onUndo}
          >
            Undo Publish
          </Button>
        </div>
      )}
      
      {/* Footer Buttons */}
      <div className="flex gap-3 mt-8">
        <Button variant="outline" onClick={onCreateAnother}>
          Create Another
        </Button>
        <Button onClick={onOpenInCatalyst}>
          Open in Catalyst
        </Button>
      </div>
    </div>
  );
}
