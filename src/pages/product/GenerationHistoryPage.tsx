// ============================================================
// GENERATION HISTORY PAGE
// Displays all requirement generations across Catalyst
// Route: /generation-history
// ============================================================

import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { 
  Sparkles, 
  Plus, 
  Search, 
  CheckCircle, 
  Clock, 
  X, 
  Copy, 
  RefreshCw,
  ExternalLink,
  Trash2,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { useGenerationHistory, Generation, GenerationItem } from '@/hooks/useGenerationHistory';
import { cn } from '@/lib/utils';

// ============================================================
// STAT CARD COMPONENT
// ============================================================

function StatCard({ 
  label, 
  value, 
  color = 'slate' 
}: { 
  label: string; 
  value: string | number; 
  color?: 'slate' | 'emerald' | 'amber' | 'blue';
}) {
  const colorClass = {
    slate: 'text-slate-900',
    emerald: 'text-emerald-600',
    amber: 'text-amber-600',
    blue: 'text-blue-600'
  }[color];
  
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <p className="text-sm text-slate-500 mb-1">{label}</p>
      <p className={`text-2xl font-bold ${colorClass}`}>{value}</p>
    </div>
  );
}

// ============================================================
// GENERATION CARD COMPONENT
// ============================================================

function GenerationCard({ 
  generation, 
  onClick,
  onContinue,
  onDelete,
}: { 
  generation: Generation; 
  onClick: () => void;
  onContinue: () => void;
  onDelete: () => void;
}) {
  const navigate = useNavigate();
  
  const statusConfig = {
    published: { 
      label: 'Published', 
      bg: 'bg-emerald-100', 
      text: 'text-emerald-700', 
      Icon: CheckCircle 
    },
    partial: { 
      label: `Partial (${generation.published_count || 0}/${generation.total_count || 0})`, 
      bg: 'bg-amber-100', 
      text: 'text-amber-700', 
      Icon: Clock 
    },
    draft: { 
      label: 'Unpublished', 
      bg: 'bg-slate-100', 
      text: 'text-slate-600', 
      Icon: null 
    },
    completed: { 
      label: 'Completed', 
      bg: 'bg-blue-100', 
      text: 'text-blue-700', 
      Icon: CheckCircle 
    },
    processing: { 
      label: 'Processing', 
      bg: 'bg-blue-100', 
      text: 'text-blue-700', 
      Icon: Clock 
    },
    failed: { 
      label: 'Failed', 
      bg: 'bg-red-100', 
      text: 'text-red-700', 
      Icon: null 
    },
  };
  
  const status = statusConfig[generation.displayStatus as keyof typeof statusConfig] || statusConfig.draft;

  const handleCopyKeys = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (generation.published_keys?.length) {
      navigator.clipboard.writeText(generation.published_keys.join(', '));
      toast.success('Keys copied to clipboard');
    }
  };

  return (
    <div 
      onClick={onClick}
      className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-lg hover:border-slate-300 transition-all cursor-pointer"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="px-2.5 py-1 bg-slate-100 text-slate-700 text-xs font-mono font-semibold rounded">
            {generation.display_id}
          </span>
          <span className={`px-2.5 py-1 ${status.bg} ${status.text} text-xs font-semibold rounded flex items-center gap-1`}>
            {status.Icon && <status.Icon className="w-3 h-3" />}
            {status.label}
          </span>
        </div>
        <span className="text-xs text-slate-400">
          {format(new Date(generation.created_at), 'MMM d, yyyy • h:mm a')}
        </span>
      </div>
      
      {/* Context */}
      <div className="mb-4">
        <div className="flex items-center gap-2 text-sm text-slate-500 mb-2">
          {generation.program && (
            <>
              <span className="font-medium text-slate-700">{generation.program.name}</span>
              {generation.project && (
                <>
                  <ChevronRight className="w-3 h-3" />
                  <span className="font-medium text-slate-700">{generation.project.name}</span>
                </>
              )}
            </>
          )}
        </div>
        <p className="text-sm text-slate-600 line-clamp-2">
          {generation.title || generation.input_text?.slice(0, 200)}
        </p>
      </div>
      
      {/* Footer */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {generation.epic_count > 0 && (
            <span className="px-2 py-1 bg-violet-100 text-violet-700 text-xs font-semibold rounded">
              {generation.epic_count} Epic{generation.epic_count !== 1 ? 's' : ''}
            </span>
          )}
          {generation.feature_count > 0 && (
            <span className="px-2 py-1 bg-teal-100 text-teal-700 text-xs font-semibold rounded">
              {generation.feature_count} Feature{generation.feature_count !== 1 ? 's' : ''}
            </span>
          )}
          {generation.story_count > 0 && (
            <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-xs font-semibold rounded">
              {generation.story_count} Stor{generation.story_count !== 1 ? 'ies' : 'y'}
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {generation.published_keys && generation.published_keys.length > 0 && (
            <button 
              onClick={handleCopyKeys}
              className="text-xs text-blue-600 hover:underline font-mono flex items-center gap-1"
            >
              <Copy className="w-3 h-3" />
              {generation.published_keys.slice(0, 3).join(', ')}
              {generation.published_keys.length > 3 ? '...' : ''}
            </button>
          )}
          
          {generation.displayStatus === 'partial' && (
            <Button 
              variant="outline"
              size="sm"
              onClick={(e) => { e.stopPropagation(); onContinue(); }}
            >
              Continue Publishing
            </Button>
          )}
          
          {generation.displayStatus === 'draft' && (
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={(e) => { e.stopPropagation(); onContinue(); }}
              >
                Review & Publish
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="text-red-600 border-red-200 hover:bg-red-50" 
                onClick={(e) => { e.stopPropagation(); onDelete(); }}
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// ITEM TREE COMPONENT
// ============================================================

function ItemTree({ 
  item, 
  allItems, 
  programCode, 
  projectCode, 
  level = 0 
}: { 
  item: GenerationItem; 
  allItems: GenerationItem[]; 
  programCode: string;
  projectCode: string;
  level?: number;
}) {
  const navigate = useNavigate();
  const children = allItems.filter(i => i.parent_id === item.id);
  const displayId = item.is_published ? item.permanent_display_id : item.temp_display_id;
  
  const badgeConfig: Record<string, string> = {
    epic: 'bg-gradient-to-r from-violet-500 to-purple-600',
    feature: 'bg-gradient-to-r from-teal-500 to-teal-600',
    story: 'bg-gradient-to-r from-emerald-500 to-green-600',
    prd: 'bg-gradient-to-r from-blue-500 to-blue-600',
  };

  const bgConfig: Record<number, string> = {
    0: 'bg-violet-50',
    1: 'bg-teal-50',
    2: 'bg-emerald-50',
  };

  const handleKeyClick = () => {
    if (!item.is_published) return;
    // Navigate based on item type would go here
    toast.info(`Navigate to ${displayId}`);
  };

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden">
      <div 
        className={cn("p-4 flex items-center justify-between", bgConfig[level] || 'bg-slate-50')}
        style={{ paddingLeft: `${16 + level * 24}px` }}
      >
        <div className="flex items-center gap-3">
          <button 
            onClick={handleKeyClick}
            disabled={!item.is_published}
            className={cn(
              "px-2.5 py-1 text-white text-xs font-bold rounded shadow-sm",
              badgeConfig[item.item_type] || 'bg-slate-500',
              item.is_published ? 'hover:shadow-md cursor-pointer' : 'opacity-60 cursor-default'
            )}
          >
            {displayId}
          </button>
          <span className="font-medium text-slate-900 truncate max-w-[300px]">{item.title}</span>
        </div>
        <span className={cn(
          "px-2 py-0.5 text-xs rounded",
          item.is_published ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
        )}>
          {item.is_published ? 'Published' : 'Draft'}
        </span>
      </div>
      
      {children.length > 0 && (
        <div className="border-t border-slate-100">
          {children.map(child => (
            <ItemTree 
              key={child.id} 
              item={child} 
              allItems={allItems} 
              programCode={programCode} 
              projectCode={projectCode} 
              level={level + 1} 
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================
// DETAIL PANEL COMPONENT
// ============================================================

function GenerationDetailPanel({ 
  generation, 
  isOpen, 
  onClose 
}: { 
  generation: Generation | null; 
  isOpen: boolean; 
  onClose: () => void;
}) {
  const navigate = useNavigate();
  
  if (!generation) return null;

  const statusConfig = {
    published: { label: 'Published', bg: 'bg-emerald-100', text: 'text-emerald-700' },
    partial: { label: 'Partial', bg: 'bg-amber-100', text: 'text-amber-700' },
    draft: { label: 'Unpublished', bg: 'bg-slate-100', text: 'text-slate-600' },
    completed: { label: 'Completed', bg: 'bg-blue-100', text: 'text-blue-700' },
    processing: { label: 'Processing', bg: 'bg-blue-100', text: 'text-blue-700' },
    failed: { label: 'Failed', bg: 'bg-red-100', text: 'text-red-700' },
  };
  
  const status = statusConfig[generation.displayStatus as keyof typeof statusConfig] || statusConfig.draft;
  const programCode = generation.program?.key || 'PRG';
  const projectCode = generation.project?.key || 'PRJ';
  const rootItems = generation.items?.filter(i => !i.parent_id) || [];

  const handleCopyAllKeys = () => {
    if (generation.published_keys?.length) {
      navigator.clipboard.writeText(generation.published_keys.join('\n'));
      toast.success('All keys copied to clipboard');
    }
  };

  const handleRegenerate = () => {
    navigate(`/product/requirement-assist?regenerate=${generation.id}`);
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/30 z-40" 
          onClick={onClose} 
        />
      )}
      
      {/* Panel */}
      <div className={cn(
        "fixed right-0 top-0 bottom-0 w-full max-w-2xl bg-white shadow-2xl z-50 flex flex-col",
        "transform transition-transform duration-300",
        isOpen ? 'translate-x-0' : 'translate-x-full'
      )}>
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between flex-shrink-0">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <span className="px-2.5 py-1 bg-slate-100 text-slate-700 text-xs font-mono font-semibold rounded">
                {generation.display_id}
              </span>
              <span className={cn("px-2.5 py-1 text-xs font-semibold rounded", status.bg, status.text)}>
                {status.label}
              </span>
            </div>
            <p className="text-sm text-slate-500">
              Created {format(new Date(generation.created_at), 'MMM d, yyyy at h:mm a')}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>
        
        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {/* Context Section */}
          <div className="p-6 border-b border-slate-100">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Context</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-slate-500">Program</p>
                <p className="font-medium text-slate-900">
                  {generation.program?.name || 'N/A'} {generation.program?.key && `(${generation.program.key})`}
                </p>
              </div>
              <div>
                <p className="text-slate-500">Project</p>
                <p className="font-medium text-slate-900">
                  {generation.project?.name || 'N/A'} {generation.project?.key && `(${generation.project.key})`}
                </p>
              </div>
            </div>
          </div>
          
          {/* Input Text Section */}
          <div className="p-6 border-b border-slate-100">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Input Requirements</h3>
            <div className="bg-slate-50 rounded-xl p-4">
              <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap line-clamp-[10]">
                {generation.input_text}
              </p>
            </div>
          </div>
          
          {/* Generated Items Section */}
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Generated Items</h3>
              <div className="flex gap-2">
                {generation.epic_count > 0 && (
                  <span className="px-2 py-1 bg-violet-100 text-violet-700 text-xs font-semibold rounded">
                    {generation.epic_count} Epics
                  </span>
                )}
                {generation.feature_count > 0 && (
                  <span className="px-2 py-1 bg-teal-100 text-teal-700 text-xs font-semibold rounded">
                    {generation.feature_count} Features
                  </span>
                )}
                {generation.story_count > 0 && (
                  <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-xs font-semibold rounded">
                    {generation.story_count} Stories
                  </span>
                )}
              </div>
            </div>
            
            {/* Items Tree */}
            <div className="space-y-2">
              {rootItems.length > 0 ? (
                rootItems.map(item => (
                  <ItemTree 
                    key={item.id} 
                    item={item} 
                    allItems={generation.items || []} 
                    programCode={programCode}
                    projectCode={projectCode}
                  />
                ))
              ) : (
                <div className="text-center py-8 text-slate-400 text-sm">
                  No items generated yet
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Footer */}
        <div className="p-6 border-t border-slate-100 flex justify-between bg-slate-50 flex-shrink-0">
          <Button 
            variant="outline" 
            className="text-red-600 border-red-200 hover:bg-red-50"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete Generation
          </Button>
          <div className="flex gap-3">
            {generation.published_keys && generation.published_keys.length > 0 && (
              <Button variant="outline" onClick={handleCopyAllKeys}>
                <Copy className="w-4 h-4 mr-2" /> Copy All Keys
              </Button>
            )}
            <Button onClick={handleRegenerate}>
              <RefreshCw className="w-4 h-4 mr-2" /> Regenerate
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}

// ============================================================
// MAIN PAGE COMPONENT
// ============================================================

export default function GenerationHistoryPage() {
  const navigate = useNavigate();
  const {
    generations,
    isLoading,
    filters,
    updateFilter,
    stats,
    programs,
    projects,
    deleteGeneration,
  } = useGenerationHistory();

  const [selectedGeneration, setSelectedGeneration] = useState<Generation | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  const handleViewDetails = useCallback((generation: Generation) => {
    setSelectedGeneration(generation);
    setIsPanelOpen(true);
  }, []);

  const handleClosePanel = useCallback(() => {
    setIsPanelOpen(false);
    setTimeout(() => setSelectedGeneration(null), 300);
  }, []);

  const handleContinue = useCallback((generation: Generation) => {
    navigate(`/product/requirement-assist?continue=${generation.id}`);
  }, [navigate]);

  // Loading state
  if (isLoading) {
    return (
      <div className="h-full flex flex-col bg-slate-50">
        <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-6 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-base font-semibold text-slate-900">Generation History</h1>
              <p className="text-xs text-slate-500">All requirement generations across Catalyst</p>
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-4 gap-4 mb-6">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}
          </div>
          <Skeleton className="h-16 rounded-xl mb-6" />
          <div className="space-y-4">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-slate-50">
      {/* Header */}
      <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-6 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-base font-semibold text-slate-900">Generation History</h1>
            <p className="text-xs text-slate-500">All requirement generations across Catalyst</p>
          </div>
        </div>
        <Button 
          onClick={() => navigate('/product/requirement-assist')} 
          className="bg-gradient-to-r from-blue-600 to-blue-700 text-white"
        >
          <Plus className="w-4 h-4 mr-2" /> New Generation
        </Button>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-6">
        {/* Stats Bar */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <StatCard label="Total Generations" value={stats.totalCount} />
          <StatCard label="Published Items" value={stats.publishedCount} color="emerald" />
          <StatCard label="Pending Review" value={stats.pendingCount} color="amber" />
          <StatCard label="Programs / Projects" value={`${stats.programCount} / ${stats.projectCount}`} color="blue" />
        </div>

        {/* Filters Bar */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6">
          <div className="flex items-center gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by content, keys, or generation ID..."
                value={filters.search}
                onChange={(e) => updateFilter('search', e.target.value)}
                className="w-full h-10 pl-10 pr-4 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
              />
            </div>
            
            {/* Program Filter */}
            <select 
              value={filters.programId} 
              onChange={(e) => updateFilter('programId', e.target.value)}
              className="h-10 px-3 border border-slate-200 rounded-lg text-sm bg-white"
            >
              <option value="">All Programs</option>
              {programs.map(p => (
                <option key={p.id} value={p.id}>{p.name} {p.key && `(${p.key})`}</option>
              ))}
            </select>
            
            {/* Project Filter */}
            <select 
              value={filters.projectId} 
              onChange={(e) => updateFilter('projectId', e.target.value)}
              className="h-10 px-3 border border-slate-200 rounded-lg text-sm bg-white"
            >
              <option value="">All Projects</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.name} {p.key && `(${p.key})`}</option>
              ))}
            </select>
            
            {/* Status Filter */}
            <select 
              value={filters.status} 
              onChange={(e) => updateFilter('status', e.target.value as any)}
              className="h-10 px-3 border border-slate-200 rounded-lg text-sm bg-white"
            >
              <option value="">All Status</option>
              <option value="published">Published</option>
              <option value="partial">Partial</option>
              <option value="draft">Unpublished</option>
            </select>
          </div>
        </div>

        {/* Generation List */}
        {generations.length > 0 ? (
          <div className="space-y-4">
            {generations.map(generation => (
              <GenerationCard
                key={generation.id}
                generation={generation}
                onClick={() => handleViewDetails(generation)}
                onContinue={() => handleContinue(generation)}
                onDelete={() => deleteGeneration(generation.id)}
              />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-100 flex items-center justify-center">
              <Sparkles className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">No generations yet</h3>
            <p className="text-slate-500 mb-6">Create your first requirement generation to get started</p>
            <Button onClick={() => navigate('/product/requirement-assist')}>
              <Plus className="w-4 h-4 mr-2" /> New Generation
            </Button>
          </div>
        )}
      </main>

      {/* Detail Slide-Over */}
      <GenerationDetailPanel
        generation={selectedGeneration}
        isOpen={isPanelOpen}
        onClose={handleClosePanel}
      />
    </div>
  );
}
