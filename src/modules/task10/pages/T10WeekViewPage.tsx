// ═══════════════════════════════════════════════════════════════════════════
// TASK¹⁰ WEEK VIEW PAGE
// Reference Layout:
// 1. Header: Back | Title | Date nav | Completion | Checkout
// 2. AI Banner
// 3. Quick Add input (ABOVE the priority list)
// 4. "TOP 10 PRIORITIES" section header
// 5. Priority cards 1-10
// 6. Buffer section (11+)
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
  useDeleteT10Item,
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
  const deleteItem = useDeleteT10Item();
  const reorderItems = useReorderT10Items();
  const addSuggestion = useAddT10SuggestionToWeek();
  const dismissSuggestion = useDismissT10Suggestion();
  const generateSuggestions = useGenerateT10Suggestions();
  
  // UI State
  const [selectedItem, setSelectedItem] = useState<T10ItemWithAssignee | null>(null);
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  
  // Computed stats - count only top 10 items for "X/10 completed"
  const stats = useMemo(() => {
    if (!week) return { completed: 0, total: 10 };
    const top10 = week.items.slice(0, 10);
    const completed = top10.filter(i => i.status === 'done' || i.status === 'resolved').length;
    return { completed, total: 10 };
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
    const baseRank = week.items.length + 1;
    reorderItems.mutate({
      weekId: week.id,
      itemIds,
      baseRank,
    });
  }, [week, reorderItems]);

  const handleQuickAdd = (title: string) => {
    if (!week) return;
    const allItems = [...week.items, ...week.buffer_items];
    const nextRank = allItems.length > 0 
      ? Math.max(...allItems.map(i => i.rank)) + 1 
      : 1;
    
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

  const handleItemDelete = (itemId: string) => {
    if (!week) return;
    deleteItem.mutate({ 
      itemId, 
      weekId: week.id,
    });
    setSelectedItem(null);
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

  // No current week
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
      {/* Header */}
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
          
          {/* Quick Add - ABOVE the priority list section */}
          <T10QuickAdd
            onAdd={handleQuickAdd}
            disabled={createItem.isPending}
          />
          
          {/* Priority Items Section */}
          <section className="t10-priority-section" style={{ marginTop: '24px' }}>
            <h2 
              style={{ 
                fontSize: '11px', 
                fontWeight: 700, 
                color: '#6b7280',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                marginBottom: '16px',
              }}
            >
              TOP 10 PRIORITIES
            </h2>
            
            <T10SortablePriorityList
              items={week.items}
              onToggleStatus={handleToggleStatus}
              onItemClick={setSelectedItem}
              onReorder={handleReorder}
              disabled={reorderItems.isPending}
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
        onDelete={handleItemDelete}
      />
      
      {/* Checkout Modal */}
      <T10CheckoutModal
        isOpen={isCheckoutModalOpen}
        week={week}
        items={[...week.items, ...week.buffer_items]}
        onClose={() => setIsCheckoutModalOpen(false)}
        onSuccess={() => {
          setIsCheckoutModalOpen(false);
        }}
      />
    </div>
  );
}

export default T10WeekViewPage;
