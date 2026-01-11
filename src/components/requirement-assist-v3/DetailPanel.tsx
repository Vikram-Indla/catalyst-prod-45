// ============================================================
// DETAIL PANEL COMPONENT - ENHANCED
// Fixed: confidence %, correct level, publish button, inline editing
// Added: Published context section
// ============================================================

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore, selectSelectedItem } from '@/stores/requirementAssistStore';
import { 
  X, 
  Pencil, 
  Check,
  CheckCircle,
  FileText,
  ListChecks,
  BarChart3,
  Info,
  Upload,
  Trash2,
  Plus,
  ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { 
  formatConfidencePercent, 
  getConfidenceColor 
} from '@/utils/requirementAssistDisplayId';

export function DetailPanel() {
  const navigate = useNavigate();
  const { isDetailOpen, closeDetail, updateWorkItem, programs, projects, programId, projectId, generation } = useStore();
  const item = useStore(selectSelectedItem);
  
  // Get generation display ID from store
  const generationDisplayId = generation?.displayId || null;
  const [isEditing, setIsEditing] = useState(false);
  
  // Edit state
  const [editedTitle, setEditedTitle] = useState('');
  const [editedDescription, setEditedDescription] = useState('');
  const [editedCriteria, setEditedCriteria] = useState<string[]>([]);

  if (!item) return null;

  // Get codes for display
  const program = programs.find(p => p.id === programId);
  const project = projects.find(p => p.id === projectId);
  const programCode = program?.code || 'PRG';
  const projectCode = project?.code || 'PRJ';

  // Badge configuration with gradients
  const badgeConfig: Record<string, { bg: string; text: string }> = {
    prd: { bg: 'bg-gradient-to-r from-blue-500 to-blue-600', text: 'text-white' },
    epic: { bg: 'bg-gradient-to-r from-violet-500 to-purple-600', text: 'text-white' },
    feature: { bg: 'bg-gradient-to-r from-teal-500 to-teal-600', text: 'text-white' },
    story: { bg: 'bg-gradient-to-r from-emerald-500 to-green-600', text: 'text-white' },
  };

  const badge = badgeConfig[item.itemType] || { bg: 'bg-slate-500', text: 'text-white' };

  // FIXED: Use utility function for confidence percentage
  const confidencePercent = formatConfidencePercent(item.confidenceScore);
  const confidenceColor = 
    confidencePercent >= 90 ? 'bg-emerald-500' :
    confidencePercent >= 80 ? 'bg-amber-500' :
    'bg-red-500';
  const confidenceLabel = 
    confidencePercent >= 90 ? 'High Confidence' :
    confidencePercent >= 80 ? 'Medium Confidence' :
    'Low Confidence';

  // FIXED: Correct level based on item type
  const levelMap: Record<string, number> = { prd: -1, epic: 0, feature: 1, story: 2, task: 3, test_case: 3 };
  const correctLevel = levelMap[item.itemType] ?? 0;

  // Start editing
  const handleStartEdit = () => {
    setEditedTitle(item.title);
    setEditedDescription(item.description || '');
    setEditedCriteria(item.acceptanceCriteria || []);
    setIsEditing(true);
  };

  // Save edits
  const handleSaveEdit = () => {
    updateWorkItem(item.id, {
      title: editedTitle,
      description: editedDescription,
      acceptanceCriteria: editedCriteria,
      isEdited: true,
    });
    setIsEditing(false);
    toast.success('Changes saved');
  };

  // Cancel editing
  const handleCancelEdit = () => {
    setIsEditing(false);
  };

  // Criteria management
  const updateCriterion = (index: number, value: string) => {
    const newCriteria = [...editedCriteria];
    newCriteria[index] = value;
    setEditedCriteria(newCriteria);
  };

  const removeCriterion = (index: number) => {
    setEditedCriteria(editedCriteria.filter((_, i) => i !== index));
  };

  const addCriterion = () => {
    setEditedCriteria([...editedCriteria, '']);
  };

  // FIXED: Publish single item
  const handlePublishSingle = async () => {
    try {
      // Mark as published in store with timestamp
      updateWorkItem(item.id, {
        isPublished: true,
        publishedAt: new Date().toISOString(),
      });
      
      toast.success(`Published ${item.displayId} to backlog`);
    } catch (error) {
      toast.error('Failed to publish item');
    }
  };

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
            <span className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-bold ${
              item.isPublished ? 'bg-gradient-to-r from-emerald-500 to-emerald-600' : badge.bg
            } ${badge.text} shadow-lg`}>
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
          
          <div className="flex items-center gap-2 mt-2">
            {item.isPublished && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded text-xs font-medium">
                <Check className="w-3 h-3" />
                Published
              </span>
            )}
            {item.isEdited && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-600 rounded text-xs font-medium">
                <Pencil className="w-3 h-3" />
                Edited
              </span>
            )}
          </div>
        </div>
        
        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {/* Published Context Section */}
          {item.isPublished && (
            <div className="mx-5 mt-5 mb-2 bg-emerald-50 border border-emerald-100 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                <span className="text-sm font-semibold text-emerald-700">Published</span>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-emerald-600 text-xs uppercase tracking-wide mb-1">Program</p>
                  <p className="font-medium text-slate-900">{program?.name || 'N/A'} ({programCode})</p>
                </div>
                <div>
                  <p className="text-emerald-600 text-xs uppercase tracking-wide mb-1">Project</p>
                  <p className="font-medium text-slate-900">{project?.name || 'N/A'} ({projectCode})</p>
                </div>
                <div>
                  <p className="text-emerald-600 text-xs uppercase tracking-wide mb-1">Published To</p>
                  <p className="font-medium text-slate-900">
                    {item.itemType === 'story' ? 'Project Backlog' : 'Program Backlog'}
                  </p>
                </div>
                <div>
                  <p className="text-emerald-600 text-xs uppercase tracking-wide mb-1">Published At</p>
                  <p className="font-medium text-slate-900">
                    {item.publishedAt 
                      ? format(new Date(item.publishedAt), 'MMM d, yyyy • h:mm a')
                      : format(new Date(), 'MMM d, yyyy • h:mm a')
                    }
                  </p>
                </div>
              </div>
              
              {/* Source Generation */}
              {generationDisplayId && (
                <div className="mt-3 pt-3 border-t border-emerald-100">
                  <p className="text-emerald-600 text-xs uppercase tracking-wide mb-1">Source Generation</p>
                  <button 
                    onClick={() => navigate(`/generation-history?id=${generationDisplayId}`)}
                    className="inline-flex items-center gap-1 font-mono text-sm text-blue-600 hover:underline"
                  >
                    {generationDisplayId}
                    <ExternalLink className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          )}
          {isEditing ? (
            /* ============ EDIT MODE ============ */
            <div className="p-5 space-y-5">
              {/* Title */}
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Title
                </label>
                <input
                  value={editedTitle}
                  onChange={(e) => setEditedTitle(e.target.value)}
                  className="w-full mt-2 px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none"
                />
              </div>
              
              {/* Description */}
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Description
                </label>
                <textarea
                  value={editedDescription}
                  onChange={(e) => setEditedDescription(e.target.value)}
                  rows={4}
                  className="w-full mt-2 px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none resize-none"
                />
              </div>
              
              {/* Acceptance Criteria */}
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Acceptance Criteria
                </label>
                <div className="space-y-2 mt-2">
                  {editedCriteria.map((criterion, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <input
                        value={criterion}
                        onChange={(e) => updateCriterion(index, e.target.value)}
                        className="flex-1 px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none"
                        placeholder={`Criterion ${index + 1}`}
                      />
                      <button 
                        onClick={() => removeCriterion(index)} 
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
                <button 
                  onClick={addCriterion} 
                  className="mt-3 flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 hover:underline"
                >
                  <Plus className="w-4 h-4" />
                  Add criterion
                </button>
              </div>
              
              {/* Save/Cancel buttons */}
              <div className="flex gap-3 pt-4 border-t border-slate-100">
                <button 
                  onClick={handleCancelEdit} 
                  className="flex-1 py-2.5 border border-slate-200 rounded-lg hover:bg-slate-50 text-sm font-medium text-slate-600 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSaveEdit} 
                  className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium transition-colors"
                >
                  Save Changes
                </button>
              </div>
            </div>
          ) : (
            /* ============ VIEW MODE ============ */
            <>
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
              
              {/* AI Confidence - FIXED */}
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
                      style={{ width: `${Math.min(confidencePercent, 100)}%` }}
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
              
              {/* Metadata - FIXED LEVEL */}
              <Section icon={Info} title="Metadata">
                <div className="grid grid-cols-2 gap-3">
                  <MetadataCard label="Type" value={item.itemType} />
                  <MetadataCard label="Level" value={`Level ${correctLevel}`} />
                  <MetadataCard label="Selected" value={item.isSelected ? 'Yes' : 'No'} />
                  <MetadataCard label="Published" value={item.isPublished ? 'Yes' : 'No'} />
                </div>
              </Section>
            </>
          )}
        </div>
        
        {/* Footer - FIXED BUTTONS */}
        {!isEditing && (
          <div className="px-5 py-4 border-t border-slate-100 flex gap-3 flex-shrink-0 bg-gradient-to-r from-slate-50 to-white">
            <button 
              onClick={handleStartEdit}
              disabled={item.isPublished}
              className={`flex-1 h-10 flex items-center justify-center gap-2 bg-white border rounded-xl text-sm font-medium transition-all ${
                item.isPublished 
                  ? 'border-slate-200 text-slate-400 cursor-not-allowed' 
                  : 'border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300'
              }`}
            >
              <Pencil className="w-4 h-4" />
              Edit
            </button>
            
            {item.isPublished ? (
              <div className="flex-1 h-10 flex items-center justify-center gap-2 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-200 text-sm font-medium">
                <Check className="w-4 h-4" />
                Published
              </div>
            ) : (
              <button 
                onClick={handlePublishSingle}
                className="flex-1 h-10 flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl shadow-md hover:shadow-lg text-sm font-medium transition-all"
              >
                <Upload className="w-4 h-4" />
                Publish
              </button>
            )}
          </div>
        )}
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
