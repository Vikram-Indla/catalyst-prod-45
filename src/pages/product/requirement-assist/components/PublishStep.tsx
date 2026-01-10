import React, { useState, useEffect, useRef } from 'react';
import { Check, FileText, Layers, Puzzle, Bookmark, Download, Share2, ExternalLink, Undo2, Plus, History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface PublishStepProps {
  onCreateAnother: () => void;
  onOpenInCatalyst: () => void;
  onUndo: () => void;
  onViewHistory?: () => void;
}

export function PublishStep({ onCreateAnother, onOpenInCatalyst, onUndo, onViewHistory }: PublishStepProps) {
  const [undoSeconds, setUndoSeconds] = useState(300);
  const undoTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    undoTimerRef.current = setInterval(() => {
      setUndoSeconds(prev => {
        if (prev <= 1) {
          if (undoTimerRef.current) {
            clearInterval(undoTimerRef.current);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (undoTimerRef.current) {
        clearInterval(undoTimerRef.current);
      }
    };
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleExportPDF = () => {
    toast.success('Generating PDF... (demo)');
  };

  const handleExportExcel = () => {
    toast.success('Generating Excel... (demo)');
  };

  const handleShare = () => {
    toast.success('Share link copied!');
  };

  const handleUndo = () => {
    if (confirm('Undo publish? All items will be removed from Catalyst.')) {
      if (undoTimerRef.current) {
        clearInterval(undoTimerRef.current);
      }
      onUndo();
      toast.success('Publish undone');
    }
  };

  const successItems = [
    { 
      icon: FileText, 
      title: 'Document Management PRD',
      subtitle: 'PRD-089', 
      color: 'bg-primary text-white'
    },
    { 
      icon: Layers, 
      title: '2 Epics Created',
      subtitle: 'EPIC-049, EPIC-050', 
      color: 'bg-violet-500 text-white'
    },
    { 
      icon: Puzzle, 
      title: '5 Features Created',
      subtitle: 'FEAT-117 to FEAT-121', 
      color: 'bg-teal-500 text-white'
    },
    { 
      icon: Bookmark, 
      title: '12 Stories Created',
      subtitle: 'US-513 to US-524', 
      color: 'bg-emerald-500 text-white'
    },
  ];

  return (
    <div className="flex-1 flex flex-col items-center justify-center py-12">
      {/* Success Icon */}
      <div className="w-[88px] h-[88px] bg-emerald-500 rounded-full flex items-center justify-center mb-7 shadow-[0_12px_40px_rgba(16,185,129,0.3)]">
        <Check className="w-10 h-10 text-white" />
      </div>
      
      <h2 className="text-2xl font-semibold mb-1.5">Published Successfully</h2>
      <p className="text-sm text-muted-foreground mb-9">20 items created in Catalyst</p>
      
      {/* Success Items */}
      <div className="w-full max-w-[540px] mb-6 space-y-2.5">
        {successItems.map((item, i) => (
          <div 
            key={i} 
            onClick={() => toast.success(`Opening ${item.title} in Catalyst...`)}
            className="flex items-center gap-4 p-4 bg-card border rounded-lg hover:border-primary transition-colors cursor-pointer group"
          >
            <div className={`w-10 h-10 ${item.color} rounded-lg flex items-center justify-center`}>
              <item.icon className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-semibold">{item.title}</h4>
              <p className="text-xs text-muted-foreground">{item.subtitle}</p>
            </div>
            <span className="text-[13px] text-primary flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
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
        <div className="flex items-center gap-3 px-4 py-3.5 bg-amber-50 border border-amber-200 rounded-lg text-[13px] text-amber-800 w-full max-w-[540px]">
          <Undo2 className="w-4 h-4 flex-shrink-0" />
          <span>Changed your mind?</span>
          <span className="font-mono font-bold text-[15px]">{formatTime(undoSeconds)}</span>
          <Button 
            size="sm" 
            className="ml-auto bg-amber-500 hover:bg-amber-600 text-white"
            onClick={handleUndo}
          >
            Undo Publish
          </Button>
        </div>
      )}
      
      {/* Footer Buttons */}
      <div className="flex gap-3 mt-7">
        <Button variant="outline" onClick={onCreateAnother}>
          <Plus className="w-4 h-4 mr-2" /> Create Another
        </Button>
        {onViewHistory && (
          <Button variant="outline" onClick={onViewHistory}>
            <History className="w-4 h-4 mr-2" /> View in History
          </Button>
        )}
        <Button onClick={onOpenInCatalyst}>
          <ExternalLink className="w-4 h-4 mr-2" /> Open in Catalyst
        </Button>
      </div>
    </div>
  );
}
