// ============================================================
// IDEAS LIST HEADER - World Class Design
// ============================================================

import { Button } from "@/components/ui/button";
import { Layers, Download, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface IdeasListHeaderProps {
  onSubmitClick: () => void;
  onExport?: () => void;
  className?: string;
}

export function IdeasListHeader({ onSubmitClick, onExport, className }: IdeasListHeaderProps) {
  return (
    <div className={cn("flex items-center justify-between", className)}>
      <div className="flex items-center gap-4">
        {/* Gradient Icon */}
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/25">
          <Layers className="w-6 h-6 text-white" />
        </div>
        
        <div>
          <h1 className="text-2xl font-bold text-slate-900">All Ideas</h1>
          <p className="text-sm text-slate-500">Browse and manage all improvement suggestions</p>
        </div>
      </div>
      
      <div className="flex items-center gap-3">
        <Button 
          variant="outline" 
          onClick={onExport}
          className="gap-2 border-slate-200 bg-white hover:bg-slate-50"
        >
          <Download className="w-4 h-4" />
          Export
        </Button>
        <Button 
          onClick={onSubmitClick}
          className="gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-800 shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 transition-all"
        >
          <Plus className="w-4 h-4" />
          Submit Idea
          <kbd className="ml-1 px-1.5 py-0.5 bg-white/20 rounded text-[10px] font-mono">N</kbd>
        </Button>
      </div>
    </div>
  );
}
