/**
 * AI Suggestions Card for Task¹⁰
 * Surfaces high-priority tasks from TaskHub for the weekly Top 10
 */
import { useState } from 'react';
import { Sparkles, RefreshCw, Plus, Check, X } from 'lucide-react';
import { useAqdSuggestions, type AqdSuggestion } from '../hooks/useAqdSuggestions';
import { useAddFromSuggestion } from '../hooks/useAddFromSuggestion';

interface AiSuggestionsCardProps {
  listId: string;
  weekId: string;
  currentItemCount: number;
}

export function AiSuggestionsCard({ listId, weekId, currentItemCount }: AiSuggestionsCardProps) {
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());
  const [dismissed, setDismissed] = useState(false);
  const [addedTasks, setAddedTasks] = useState<Set<string>>(new Set());
  
  const { data, isLoading, refetch, isRefetching } = useAqdSuggestions({ 
    listId, 
    weekId,
    currentItemCount,
    enabled: currentItemCount < 10 && !dismissed 
  });
  
  const addMutation = useAddFromSuggestion();
  
  const suggestions = data?.suggestions || [];
  const availableSuggestions = suggestions.filter(s => !addedTasks.has(s.taskKey));
  
  // Don't render if list is full or dismissed
  if (currentItemCount >= 10 || dismissed) return null;
  
  // Don't render if no suggestions (after loading)
  if (!isLoading && availableSuggestions.length === 0) return null;
  
  // Loading state
  if (isLoading) {
    return (
      <div className="bg-gradient-to-br from-violet-50 to-indigo-50 border border-violet-200 rounded-xl p-5 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 bg-gradient-to-br from-violet-500 to-indigo-500 rounded-lg flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <span className="font-semibold text-violet-900">AI Suggestions</span>
          <span className="text-[9px] font-bold bg-violet-500 text-white px-1.5 py-0.5 rounded uppercase">Beta</span>
        </div>
        <div className="flex items-center justify-center py-8">
          <div className="w-5 h-5 border-2 border-violet-200 border-t-violet-500 rounded-full animate-spin" />
          <span className="ml-3 text-sm text-violet-600">Analyzing TaskHub for high-priority tasks...</span>
        </div>
      </div>
    );
  }
  
  const handleToggle = (taskKey: string) => {
    const newSelected = new Set(selectedTasks);
    if (newSelected.has(taskKey)) {
      newSelected.delete(taskKey);
    } else {
      newSelected.add(taskKey);
    }
    setSelectedTasks(newSelected);
  };
  
  const handleAddSingle = async (suggestion: AqdSuggestion) => {
    try {
      await addMutation.mutateAsync({
        listId,
        weekId,
        suggestion
      });
      setAddedTasks(prev => new Set([...prev, suggestion.taskKey]));
      setSelectedTasks(prev => {
        const newSet = new Set(prev);
        newSet.delete(suggestion.taskKey);
        return newSet;
      });
    } catch (error) {
      // Error handled by mutation
    }
  };
  
  const handleAddSelected = async () => {
    for (const taskKey of selectedTasks) {
      const suggestion = suggestions.find(s => s.taskKey === taskKey);
      if (suggestion && !addedTasks.has(taskKey)) {
        try {
          await addMutation.mutateAsync({
            listId,
            weekId,
            suggestion
          });
          setAddedTasks(prev => new Set([...prev, taskKey]));
        } catch (error) {
          // Continue with next task
        }
      }
    }
    setSelectedTasks(new Set());
  };

  const handleRefresh = () => {
    setAddedTasks(new Set());
    setSelectedTasks(new Set());
    refetch();
  };

  const getPriorityBadgeClass = (priority: string) => {
    if (priority === 'critical') {
      return 'bg-red-100 text-red-700';
    }
    return 'bg-orange-100 text-orange-700';
  };

  const formatDueDate = (dateStr: string | null) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    const today = new Date();
    const diffDays = Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return `${Math.abs(diffDays)}d overdue`;
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays <= 7) return `${diffDays}d`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };
  
  return (
    <div className="bg-gradient-to-br from-violet-50 to-indigo-50 border border-violet-200 rounded-xl p-5 mb-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-violet-500 to-indigo-500 rounded-lg flex items-center justify-center shadow-sm">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <span className="font-semibold text-violet-900">AI Suggestions</span>
          <span className="text-[9px] font-bold bg-violet-500 text-white px-1.5 py-0.5 rounded uppercase tracking-wide">Beta</span>
        </div>
        <button 
          onClick={handleRefresh}
          disabled={isRefetching}
          className="p-2 hover:bg-violet-100 rounded-lg transition-colors disabled:opacity-50"
          title="Refresh suggestions"
        >
          <RefreshCw className={`w-4 h-4 text-violet-500 ${isRefetching ? 'animate-spin' : ''}`} />
        </button>
      </div>
      
      {/* Intro */}
      <p className="text-sm text-violet-700 mb-4">
        Found <strong className="text-violet-900">{availableSuggestions.length} high-priority task{availableSuggestions.length !== 1 ? 's' : ''}</strong> from TaskHub that may belong in your Top 10.
      </p>
      
      {/* Suggestions */}
      <div className="space-y-3">
        {availableSuggestions.map(suggestion => (
          <div 
            key={suggestion.taskKey}
            className={`bg-white border rounded-lg p-4 transition-all ${
              selectedTasks.has(suggestion.taskKey) 
                ? 'border-violet-400 ring-1 ring-violet-200 bg-violet-50/50' 
                : 'border-violet-100 hover:border-violet-300'
            }`}
          >
            <div className="flex items-start gap-3">
              {/* Checkbox */}
              <button
                onClick={() => handleToggle(suggestion.taskKey)}
                className={`w-5 h-5 rounded border-2 flex-shrink-0 mt-0.5 flex items-center justify-center transition-colors ${
                  selectedTasks.has(suggestion.taskKey)
                    ? 'bg-violet-500 border-violet-500 text-white'
                    : 'border-violet-300 hover:border-violet-400'
                }`}
              >
                {selectedTasks.has(suggestion.taskKey) && <Check className="w-3 h-3" />}
              </button>
              
              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="font-medium text-slate-900 mb-1.5 leading-tight">{suggestion.title}</div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mb-2">
                  <span className="font-mono text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">{suggestion.taskKey}</span>
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase ${getPriorityBadgeClass(suggestion.priority)}`}>
                    {suggestion.priority}
                  </span>
                  {suggestion.dueDate && (
                    <span className="text-slate-600">Due {formatDueDate(suggestion.dueDate)}</span>
                  )}
                  {suggestion.assigneeName && (
                    <>
                      <span className="text-slate-300">·</span>
                      <span>{suggestion.assigneeName}</span>
                    </>
                  )}
                </div>
                {/* AI Reasoning */}
                <div className="text-xs text-violet-600 italic bg-violet-50 px-3 py-2 rounded-md border-l-2 border-violet-400">
                  💡 {suggestion.reasoning}
                </div>
              </div>
              
              {/* Add Button */}
              <button
                onClick={() => handleAddSingle(suggestion)}
                disabled={addMutation.isPending}
                className="px-3 py-1.5 bg-violet-500 hover:bg-violet-600 text-white text-xs font-semibold rounded-md transition-colors flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {addMutation.isPending ? '...' : 'Add to Top 10'}
              </button>
            </div>
          </div>
        ))}
      </div>
      
      {/* Footer */}
      <div className="flex items-center justify-between mt-4 pt-3 border-t border-violet-200">
        <button 
          onClick={() => setDismissed(true)}
          className="text-sm text-violet-600 hover:text-violet-800 px-3 py-1.5 hover:bg-violet-100 rounded-md transition-colors flex items-center gap-1.5"
        >
          <X className="w-3.5 h-3.5" />
          Not now
        </button>
        
        {selectedTasks.size > 0 && (
          <div className="flex items-center gap-3">
            <span className="text-xs text-violet-600">{selectedTasks.size} selected</span>
            <button
              onClick={handleAddSelected}
              disabled={addMutation.isPending}
              className="flex items-center gap-2 px-4 py-2 bg-violet-500 hover:bg-violet-600 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              Add Selected
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default AiSuggestionsCard;
