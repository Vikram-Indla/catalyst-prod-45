// ============================================================
// DETAIL PANEL COMPONENT
// Slide-over panel showing work item details
// ============================================================

import React, { useState } from 'react';
import { useStore, selectSelectedItem } from '@/stores/requirementAssistStore';
import { 
  X, 
  Edit2, 
  RefreshCw, 
  Check,
} from 'lucide-react';

export function DetailPanel() {
  const { isDetailOpen, closeDetail } = useStore();
  const item = useStore(selectSelectedItem);
  const [isEditing, setIsEditing] = useState(false);

  if (!item) return null;

  // Badge colors
  const badgeConfig: Record<string, { bg: string; text: string }> = {
    epic: { bg: 'bg-purple-100', text: 'text-purple-700' },
    feature: { bg: 'bg-blue-100', text: 'text-blue-700' },
    story: { bg: 'bg-green-100', text: 'text-green-700' },
  };

  const badge = badgeConfig[item.itemType] || { bg: 'bg-slate-100', text: 'text-slate-600' };

  // Confidence color and label
  const confidenceColor = 
    item.confidenceScore >= 0.9 ? 'text-green-600' :
    item.confidenceScore >= 0.8 ? 'text-amber-600' :
    'text-red-600';
  
  const confidenceLabel = 
    item.confidenceScore >= 0.9 ? 'High Confidence' :
    item.confidenceScore >= 0.8 ? 'Medium Confidence' :
    'Low Confidence';

  return (
    <>
      {/* Backdrop */}
      {isDetailOpen && (
        <div 
          className="absolute inset-0 bg-black/5 z-40"
          onClick={closeDetail}
        />
      )}
      
      {/* Panel */}
      <div className={`
        absolute top-0 right-0 bottom-0 w-[400px] max-w-[90%]
        bg-white border-l border-slate-200
        shadow-xl
        flex flex-col z-50
        transform transition-transform duration-200 ease-out
        ${isDetailOpen ? 'translate-x-0' : 'translate-x-full'}
      `}>
        {/* Header */}
        <div className="px-4 py-4 border-b border-slate-100 flex-shrink-0">
          <div className="flex items-start justify-between mb-3">
            <span className={`inline-flex px-2 py-0.5 rounded text-xs font-semibold ${badge.bg} ${badge.text}`}>
              {item.displayId}
            </span>
            <button 
              onClick={closeDetail}
              className="p-1.5 rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <h2 className="text-lg font-semibold text-slate-900 leading-snug">
            {item.title}
          </h2>
          
          {item.isEdited && (
            <span className="inline-flex items-center gap-1 mt-2 text-xs text-amber-600">
              <Edit2 className="w-3 h-3" />
              Edited
            </span>
          )}
        </div>
        
        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          {/* Description */}
          {item.description && (
            <Section title="Description">
              <p className="text-sm text-slate-600 leading-relaxed">
                {item.description}
              </p>
            </Section>
          )}
          
          {/* Acceptance Criteria */}
          {item.acceptanceCriteria && item.acceptanceCriteria.length > 0 && (
            <Section title="Acceptance Criteria">
              <ul className="space-y-0">
                {item.acceptanceCriteria.map((criterion: string, index: number) => (
                  <li 
                    key={index}
                    className="flex items-start gap-2 py-2.5 border-b border-slate-50 last:border-0"
                  >
                    <div className="w-5 h-5 rounded-full bg-green-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check className="w-3 h-3 text-green-600" />
                    </div>
                    <span className="text-sm text-slate-600 leading-relaxed">
                      {criterion}
                    </span>
                  </li>
                ))}
              </ul>
            </Section>
          )}
          
          {/* AI Confidence */}
          <Section title="AI Confidence">
            <div className="p-3 bg-slate-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-slate-600">{confidenceLabel}</span>
                <span className={`text-lg font-bold ${confidenceColor}`}>
                  {Math.round(item.confidenceScore * 100)}%
                </span>
              </div>
              <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all ${
                    item.confidenceScore >= 0.9 ? 'bg-green-500' :
                    item.confidenceScore >= 0.8 ? 'bg-amber-500' :
                    'bg-red-500'
                  }`}
                  style={{ width: `${item.confidenceScore * 100}%` }}
                />
              </div>
              {item.confidenceReason && (
                <p className="mt-2 text-xs text-slate-500">
                  {item.confidenceReason}
                </p>
              )}
            </div>
          </Section>
          
          {/* Metadata */}
          <Section title="Metadata">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <MetadataItem label="Type" value={item.itemType} />
              <MetadataItem label="Level" value={`Level ${item.level}`} />
              <MetadataItem label="Selected" value={item.isSelected ? 'Yes' : 'No'} />
              <MetadataItem label="Published" value={item.isPublished ? 'Yes' : 'No'} />
            </div>
          </Section>
        </div>
        
        {/* Footer */}
        <div className="px-4 py-3 border-t border-slate-100 flex gap-2 flex-shrink-0">
          <button 
            onClick={() => setIsEditing(true)}
            className="flex-1 h-9 flex items-center justify-center gap-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <Edit2 className="w-4 h-4" />
            Edit
          </button>
          <button className="flex-1 h-9 flex items-center justify-center gap-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
            <RefreshCw className="w-4 h-4" />
            Regenerate
          </button>
        </div>
      </div>
    </>
  );
}

// ============================================================
// HELPER COMPONENTS
// ============================================================

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">
        {title}
      </h3>
      {children}
    </section>
  );
}

function MetadataItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="py-2 px-3 bg-slate-50 rounded-md">
      <div className="text-xs text-slate-400 mb-0.5">{label}</div>
      <div className="text-slate-700 font-medium capitalize">{value}</div>
    </div>
  );
}
