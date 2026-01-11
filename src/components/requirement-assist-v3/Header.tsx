// ============================================================
// HEADER COMPONENT
// ============================================================

import React from 'react';
import { useStore } from '@/stores/requirementAssistStore';
import { Sparkles, ChevronLeft, HelpCircle, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function Header() {
  const { generation } = useStore();
  const navigate = useNavigate();

  return (
    <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-4 flex-shrink-0">
      {/* Left */}
      <div className="flex items-center gap-3">
        <button 
          onClick={() => navigate(-1)}
          className="p-2 rounded-md hover:bg-slate-100 text-slate-500"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-base font-semibold text-slate-900">
              Requirement Assist
            </h1>
            <p className="text-xs text-slate-500">
              AI-Powered Requirements Generation
            </p>
          </div>
        </div>
      </div>

      {/* Center - Generation ID */}
      {generation && (
        <div className="text-sm text-slate-500">
          <span className="font-mono">{generation.displayId}</span>
        </div>
      )}

      {/* Right */}
      <div className="flex items-center gap-2">
        <button className="p-2 rounded-md hover:bg-slate-100 text-slate-500">
          <HelpCircle className="w-5 h-5" />
        </button>
        <button className="p-2 rounded-md hover:bg-slate-100 text-slate-500">
          <Settings className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
}
