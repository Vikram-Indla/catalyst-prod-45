// ============================================================
// DETAIL PANEL COMPONENT - ENHANCED
// Gradient badges, sections with icons, enhanced styling
// ============================================================

import React, { useState } from 'react';
import { useStore, selectSelectedItem } from '@/stores/requirementAssistStore';
import { 
  X, 
  Edit2, 
  RefreshCw, 
  Check,
  FileText,
  ListChecks,
  BarChart3,
  Info,
} from 'lucide-react';

export function DetailPanel() {
  const { isDetailOpen, closeDetail } = useStore();
  const item = useStore(selectSelectedItem);
  const [isEditing, setIsEditing] = useState(false);

  if (!item) return null;

  // Badge configuration with gradients
  const badgeConfig: Record<string, { bg: string; text: string }> = {
    prd: { bg: 'bg-gradient-to-r from-blue-500 to-blue-600', text: 'text-white' },
    epic: { bg: 'bg-gradient-to-r from-violet-500 to-purple-600', text: 'text-white' },
    feature: { bg: 'bg-gradient-to-r from-teal-500 to-teal-600', text: 'text-white' },
    story: { bg: 'bg-gradient-to-r from-emerald-500 to-green-600', text: 'text-white' },
  };

  const badge = badgeConfig[item.itemType] || { bg: 'bg-slate-500', text: 'text-white' };

  // Confidence color and label
  const confidencePercent = Math.round(item.confidenceScore * 100);
  const confidenceColor = 
    confidencePercent >= 90 ? 'bg-emerald-500' :
    confidencePercent >= 80 ? 'bg-amber-500' :
    'bg-red-500';
  const confidenceLabel = 
    confidencePercent >= 90 ? 'High Confidence' :
    confidencePercent >= 80 ? 'Medium Confidence' :
    'Low Confidence';

  return (
    <>
      {/* Backdrop */}
      {isDetailOpen && (
        <div 
          className="absolute inset-0 bg-black/10 backdrop-blur-[2px] z-40 animate-fade-in"
          onClick={closeDetail}
        />
      )}
      
      {/* Panel */}
      <div className={`
        absolute top-0 right-0 bottom-0 w-[420px] max-w-[90%]
        bg-white border-l border-slate-200
        shadow-ra-panel
        flex flex-col z-50
        transform transition-transform duration-250 ease-out
        ${isDetailOpen ? 'translate-x-0' : 'translate-x-full'}
      `}>
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex-shrink-0 bg-gradient-to-r from-slate-50 to-white">
          <div className="flex items-start justify-between mb-3">
            <span className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-bold ${badge.bg} ${badge.text} shadow-lg`}>
              {item.displayId}
            </span>
            <button 
              onClick={closeDetail}
              className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <h2 className="text-lg font-semibold text-slate-900 leading-snug pr-8">
            {item.title}
          </h2>
          
          {item.isEdited && (
            <span className="inline-flex items-center gap-1 mt-2 px-2 py-0.5 bg-amber-50 text-amber-600 rounded text-xs font-medium">
              <Edit2 className="w-3 h-3" />
              Edited
            </span>
          )}
        </div>
        
        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {/* Description */}
          {item.description && (
            <Section icon={FileText} title="Description">
              <p className="text-sm text-slate-600 leading-relaxed">
                {item.description}
              </p>
            </Section>
          )}
          
          {/* Acceptance Criteria */}
          {item.acceptanceCriteria && item.acceptanceCriteria.length > 0 && (
            <Section icon={ListChecks} title="Acceptance Criteria">
              <ul className="space-y-0">
                {item.acceptanceCriteria.map((criterion: string, index: number) => (
                  <li 
                    key={index}
                    className="flex items-start gap-3 py-3 border-b border-slate-50 last:border-0"
                  >
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-500 flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm">
                      <Check className="w-3.5 h-3.5 text-white" />
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
          <Section icon={BarChart3} title="AI Confidence">
            <div className="p-4 bg-gradient-to-br from-slate-50 to-white rounded-xl border border-slate-100">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-slate-600">{confidenceLabel}</span>
                <span className={`
                  text-2xl font-bold
                  ${confidencePercent >= 90 ? 'text-emerald-600' :
                    confidencePercent >= 80 ? 'text-amber-600' :
                    'text-red-600'}
                `}>
                  {confidencePercent}%
                </span>
              </div>
              <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ${confidenceColor}`}
                  style={{ width: `${confidencePercent}%` }}
                />
              </div>
              <p className="mt-3 text-xs text-slate-500">
                {confidencePercent >= 90 
                  ? 'Explicitly stated in requirements with clear acceptance criteria.'
                  : confidencePercent >= 80
                  ? 'Strongly implied by context and related requirements.'
                  : 'Inferred from domain patterns. Manual review recommended.'
                }
              </p>
            </div>
          </Section>
          
          {/* Metadata */}
          <Section icon={Info} title="Metadata">
            <div className="grid grid-cols-2 gap-3">
              <MetadataCard label="Type" value={item.itemType} />
              <MetadataCard label="Level" value={`Level ${item.level}`} />
              <MetadataCard label="Selected" value={item.isSelected ? 'Yes' : 'No'} />
              <MetadataCard label="Published" value={item.isPublished ? 'Yes' : 'No'} />
            </div>
          </Section>
        </div>
        
        {/* Footer */}
        <div className="px-5 py-4 border-t border-slate-100 flex gap-3 flex-shrink-0 bg-gradient-to-r from-slate-50 to-white">
          <button 
            onClick={() => setIsEditing(true)}
            className="flex-1 h-10 flex items-center justify-center gap-2 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all"
          >
            <Edit2 className="w-4 h-4" />
            Edit
          </button>
          <button className="flex-1 h-10 flex items-center justify-center gap-2 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all">
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

function Section({ 
  icon: Icon, 
  title, 
  children 
}: { 
  icon: React.ComponentType<{ className?: string }>; 
  title: string; 
  children: React.ReactNode 
}) {
  return (
    <section className="px-5 py-4 border-b border-slate-50">
      <div className="flex items-center gap-2 mb-3">
        <Icon className="w-4 h-4 text-slate-400" />
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          {title}
        </h3>
      </div>
      {children}
    </section>
  );
}

function MetadataCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="py-3 px-4 bg-slate-50 rounded-xl">
      <div className="text-xs text-slate-400 mb-1">{label}</div>
      <div className="text-sm font-semibold text-slate-900 capitalize">{value}</div>
    </div>
  );
}
