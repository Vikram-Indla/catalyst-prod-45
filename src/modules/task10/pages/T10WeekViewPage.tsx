// ═══════════════════════════════════════════════════════════════════════════
// TASK¹⁰ WEEK VIEW PAGE
// Priority management for a specific week
// ═══════════════════════════════════════════════════════════════════════════

import { useState, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { 
  useT10List, 
  useT10CurrentWeek, 
  useT10Suggestions,
  useToggleT10ItemStatus,
  useCreateT10Item,
  useUpdateT10Item,
  useReorderT10Items,
  useAddT10SuggestionToWeek,
  useDismissT10Suggestion,
  useGenerateT10Suggestions,
} from '../hooks';
import type { T10ItemWithAssignee } from '../types';
import {
  T10WeekHeader,
  T10AIBanner,
  T10QuickAdd,
  T10SortablePriorityList,
  T10BufferSection,
  T10SidePanel,
  T10CheckoutModal,
} from '../components';
import '../styles/task10.scoped.css';

export function T10WeekViewPage() {
  const { listId } = useParams<{ listId: string }>();
  const navigate = useNavigate();
  
  // Data fetching
  const { data: list, isLoading: listLoading, error: listError } = useT10List(listId);
  const { data: week, isLoading: weekLoading, error: weekError } = useT10CurrentWeek(listId);
  const { data: suggestions = [] } = useT10Suggestions(listId);
  
  // Mutations
  const toggleStatus = useToggleT10ItemStatus();
  const createItem = useCreateT10Item();
  const updateItem = useUpdateT10Item();
  const reorderItems = useReorderT10Items();
  const addSuggestion = useAddT10SuggestionToWeek();
  const dismissSuggestion = useDismissT10Suggestion();
  const generateSuggestions = useGenerateT10Suggestions();
  
  // UI State
  const [selectedItem, setSelectedItem] = useState<T10ItemWithAssignee | null>(null);
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  
  // Computed stats
  const stats = useMemo(() => {
    if (!week) return { completed: 0, total: 0 };
    const allItems = [...(week.items || []), ...(week.buffer_items || [])];
    const completed = allItems.filter(i => i.status === 'done' || i.status === 'resolved').length;
    return { completed, total: allItems.length };
  }, [week]);

  const handleToggleStatus = (itemId: string, _done: boolean) => {
    if (!week) return;
    toggleStatus.mutate({
      itemId,
      weekId: week.id,
    });
  };

  const handleReorder = useCallback((itemIds: string[]) => {
    if (!week) return;
    reorderItems.mutate({
      weekId: week.id,
      itemIds,
    });
  }, [week, reorderItems]);

  const handleBufferReorder = useCallback((itemIds: string[]) => {
    if (!week) return;
    // Buffer items start at rank 11, so we offset by 10 + top 10 count
    const baseRank = week.items.length + 1;
    reorderItems.mutate({
      weekId: week.id,
      itemIds,
      baseRank,
    });
  }, [week, reorderItems]);

  const handleQuickAdd = (title: string) => {
    if (!week) return;
    const nextRank = Math.max(
      ...([...week.items, ...week.buffer_items].map(i => i.rank)),
      0
    ) + 1;
    
    createItem.mutate({
      week_id: week.id,
      title,
      rank: nextRank,
    });
  };

  const handleAddSuggestion = (suggestionId: string) => {
    if (!week || !listId) return;
    addSuggestion.mutate({ suggestionId, weekId: week.id, listId });
  };

  const handleDismissSuggestion = (suggestionId: string) => {
    if (!listId) return;
    dismissSuggestion.mutate({ suggestionId, listId });
  };

  const handleGenerateSuggestions = () => {
    if (!listId || !week) return;
    generateSuggestions.mutate({ listId, weekId: week.id, count: 5 });
  };

  const handleItemUpdate = (itemId: string, updates: Partial<T10ItemWithAssignee>) => {
    if (!week) return;
    updateItem.mutate({ 
      itemId, 
      weekId: week.id,
      input: updates,
    });
  };

  // Loading state
  if (listLoading || weekLoading) {
    return (
      <div className="catalyst-module--task10">
        <div className="t10-loading">
          <Loader2 className="t10-spinner" />
          <span>Loading week...</span>
        </div>
      </div>
    );
  }

  // Error state
  if (listError || weekError || !list) {
    return (
      <div className="catalyst-module--task10">
        <div className="t10-error">
          <span>Failed to load week data. Please try again.</span>
          <button 
            className="t10-btn t10-btn--primary"
            onClick={() => navigate('/taskhub/task10')}
          >
            Back to Lists
          </button>
        </div>
      </div>
    );
  }

  // No current week (shouldn't happen normally)
  if (!week) {
    return (
      <div className="catalyst-module--task10">
        <div className="t10-empty-state">
          <h3>No active week</h3>
          <p>There's no active week for this list.</p>
          <button 
            className="t10-btn t10-btn--primary"
            onClick={() => navigate('/taskhub/task10')}
          >
            Back to Lists
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="catalyst-module--task10">
      <T10WeekHeader
        list={list}
        week={week}
        completedCount={stats.completed}
        totalCount={stats.total}
        onBack={() => navigate('/taskhub/task10')}
        onCheckout={() => setIsCheckoutModalOpen(true)}
      />
      
      <main className="t10-main">
        <div className="t10-container">
          {/* AI Suggestions Banner */}
          <T10AIBanner
            suggestions={suggestions}
            onAddSuggestion={handleAddSuggestion}
            onDismiss={handleDismissSuggestion}
            onGenerateSuggestions={handleGenerateSuggestions}
            isGenerating={generateSuggestions.isPending}
          />
          
          {/* Priority Items */}
          <section className="t10-priority-section">
            <div className="t10-section-header">
              <h2 className="t10-section-title">Top 10 Priorities</h2>
              <span className="t10-section-count">
                {week.items.filter(i => i.status === 'done' || i.status === 'resolved').length} / {week.items.length}
              </span>
            </div>
            
            <T10SortablePriorityList
              items={week.items}
              onToggleStatus={handleToggleStatus}
              onItemClick={setSelectedItem}
              onReorder={handleReorder}
              disabled={reorderItems.isPending}
            />
            
            {/* Quick Add */}
            <T10QuickAdd
              onAdd={handleQuickAdd}
              disabled={createItem.isPending}
              placeholder={week.items.length >= 10 
                ? "Add to buffer (rank 11+)..." 
                : "Add new priority item..."
              }
            />
          </section>
          
          {/* Buffer Section */}
          <T10BufferSection
            items={week.buffer_items}
            onToggleStatus={handleToggleStatus}
            onItemClick={setSelectedItem}
            onReorder={handleBufferReorder}
            disabled={reorderItems.isPending}
          />
        </div>
      </main>
      
      {/* Side Panel */}
      <T10SidePanel
        item={selectedItem}
        isOpen={!!selectedItem}
        onClose={() => setSelectedItem(null)}
        onUpdate={handleItemUpdate}
      />
      
      {/* Checkout Modal */}
      <T10CheckoutModal
        isOpen={isCheckoutModalOpen}
        week={week}
        items={[...week.items, ...week.buffer_items]}
        onClose={() => setIsCheckoutModalOpen(false)}
        onSuccess={() => {
          setIsCheckoutModalOpen(false);
          // Refresh will happen via query invalidation
        }}
      />
    </div>
  );
}

export default T10WeekViewPage;
