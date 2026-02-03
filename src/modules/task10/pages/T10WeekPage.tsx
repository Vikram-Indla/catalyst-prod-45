import React, { useState, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ChevronLeft, ChevronRight, CheckCircle, Zap, Plus, ChevronDown, Info, Check } from 'lucide-react';
import { T10PriorityCard } from '../components/week/T10PriorityCard';
import { T10SidePanel } from '../components/panel/T10SidePanel';
import { T10CheckoutModal } from '../components/modals/T10CheckoutModal';
import type { T10Item, T10CheckoutDecision } from '../types';
import { useToast } from '@/hooks/use-toast';
import '../styles/task10.css';

const initialMockItems: T10Item[] = [
  { id: '1', week_id: 'w1', rank: 1, title: 'Interview senior engineering candidates for Platform team', taskhub_key: 'TSK-142', assignee_name: 'Ibrahim A.', assignee_initials: 'IA', due_date: '2026-02-03', label: 'HR', status: 'todo', carryover_count: 0, created_at: '', updated_at: '' },
  { id: '2', week_id: 'w1', rank: 2, title: 'Complete vendor contract negotiations with legal review', taskhub_key: '', assignee_name: 'Vikram I.', assignee_initials: 'VI', due_date: '2026-02-07', label: 'OPERATIONS', status: 'todo', carryover_count: 2, created_at: '', updated_at: '' },
  { id: '3', week_id: 'w1', rank: 3, title: 'Review sales pipeline for February targets', taskhub_key: 'PLN-008', assignee_name: 'Ibrahim A.', assignee_initials: 'IA', due_date: '2026-02-01', label: 'FINANCE', status: 'todo', carryover_count: 0, created_at: '', updated_at: '' },
  { id: '4', week_id: 'w1', rank: 4, title: 'Finalize Q1 budget forecast with department heads', taskhub_key: 'PLN-004', assignee_name: 'Vikram I.', assignee_initials: 'VI', due_date: '2026-02-04', label: 'FINANCE', status: 'done', carryover_count: 0, created_at: '', updated_at: '' },
  { id: '5', week_id: 'w1', rank: 5, title: 'Architecture review for Phase 2 data migration', taskhub_key: 'TSK-089', assignee_name: 'Maali A.', assignee_initials: 'MA', due_date: '2026-02-04', label: 'TECH', status: 'todo', carryover_count: 0, created_at: '', updated_at: '' },
  { id: '6', week_id: 'w1', rank: 6, title: 'Submit compliance documentation to regulatory body', taskhub_key: '', assignee_name: 'Vikram I.', assignee_initials: 'VI', due_date: '2026-02-03', label: 'LEGAL', status: 'done', carryover_count: 0, created_at: '', updated_at: '' },
  { id: '7', week_id: 'w1', rank: 7, title: 'Prepare quarterly board presentation slides', taskhub_key: '', assignee_name: 'Ibrahim A.', assignee_initials: 'IA', due_date: '2026-02-06', label: 'FINANCE', status: 'todo', carryover_count: 0, created_at: '', updated_at: '' },
  { id: '8', week_id: 'w1', rank: 8, title: 'Review and approve new vendor contracts', taskhub_key: 'TSK-102', assignee_name: 'Maali A.', assignee_initials: 'MA', due_date: '2026-02-09', label: 'LEGAL', status: 'done', carryover_count: 0, created_at: '', updated_at: '' },
  { id: '11', week_id: 'w1', rank: 11, title: 'Research competitor pricing strategies', taskhub_key: '', assignee_name: 'Maali A.', assignee_initials: 'MA', due_date: '2026-02-12', label: 'FINANCE', status: 'todo', carryover_count: 0, created_at: '', updated_at: '' },
  { id: '12', week_id: 'w1', rank: 12, title: 'Draft security audit response', taskhub_key: 'TSK-156', assignee_name: 'Vikram I.', assignee_initials: 'VI', due_date: '2026-02-14', label: 'TECH', status: 'todo', carryover_count: 0, created_at: '', updated_at: '' },
];

interface WeekData {
  id: string;
  startDate: string;
  displayDate: string;
  isCheckedOut: boolean;
  items: T10Item[];
}

export function T10WeekPage() {
  const navigate = useNavigate();
  const { listId } = useParams();
  const { toast } = useToast();
  
  // Week navigation state
  const [weeks, setWeeks] = useState<WeekData[]>([
    { id: 'w1', startDate: '2026-02-02', displayDate: 'Feb 2, 2026', isCheckedOut: false, items: initialMockItems }
  ]);
  const [currentWeekIndex, setCurrentWeekIndex] = useState(0);
  
  const currentWeek = weeks[currentWeekIndex];
  const items = currentWeek?.items || [];
  
  const [aiExpanded, setAiExpanded] = useState(false);
  const [bufferExpanded, setBufferExpanded] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [sidePanelOpen, setSidePanelOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [quickAddValue, setQuickAddValue] = useState('');

  const completedCount = items.filter(i => i.status === 'done').length;
  const topTenItems = items.filter(i => i.rank <= 10).sort((a, b) => a.rank - b.rank);
  const bufferItems = items.filter(i => i.rank > 10).sort((a, b) => a.rank - b.rank);

  const handleCardClick = (itemId: string) => {
    setSelectedItemId(itemId);
    setSidePanelOpen(true);
  };

  const handleToggleStatus = (itemId: string) => {
    setWeeks(prevWeeks => prevWeeks.map((week, idx) => {
      if (idx !== currentWeekIndex) return week;
      return {
        ...week,
        items: week.items.map(item => 
          item.id === itemId 
            ? { ...item, status: item.status === 'done' ? 'todo' : 'done' } 
            : item
        )
      };
    }));
  };

  const handleUpdateItem = (updates: Partial<T10Item>) => {
    if (!selectedItemId) return;
    setWeeks(prevWeeks => prevWeeks.map((week, idx) => {
      if (idx !== currentWeekIndex) return week;
      return {
        ...week,
        items: week.items.map(item => 
          item.id === selectedItemId ? { ...item, ...updates } : item
        )
      };
    }));
  };

  const handleDeleteItem = () => {
    if (!selectedItemId) return;
    setWeeks(prevWeeks => prevWeeks.map((week, idx) => {
      if (idx !== currentWeekIndex) return week;
      return {
        ...week,
        items: week.items.filter(item => item.id !== selectedItemId)
      };
    }));
    setSidePanelOpen(false);
    setSelectedItemId(null);
    toast({
      title: "Item deleted",
      description: "The priority item has been removed.",
    });
  };

  const handleQuickAdd = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && quickAddValue.trim()) {
      const newRank = Math.max(...items.map(i => i.rank), 0) + 1;
      const newItem: T10Item = {
        id: `new-${Date.now()}`,
        week_id: currentWeek.id,
        rank: newRank > 10 ? newRank : 10,
        title: quickAddValue.trim(),
        status: 'todo',
        carryover_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Check if it looks like a TaskHub key
      const keyMatch = quickAddValue.match(/^([A-Z]+-\d+)/);
      if (keyMatch) {
        newItem.taskhub_key = keyMatch[1];
      }

      setWeeks(prevWeeks => prevWeeks.map((week, idx) => {
        if (idx !== currentWeekIndex) return week;
        return { ...week, items: [...week.items, newItem] };
      }));
      
      setQuickAddValue('');
      toast({
        title: "Item added",
        description: `"${newItem.title}" added to buffer queue.`,
      });
    }
  };

  const handleCheckout = (decisions: T10CheckoutDecision[]) => {
    const carriedItems = decisions.filter(d => d.decision === 'carry');
    const resolvedItems = decisions.filter(d => d.decision === 'resolved');
    
    // Mark current week as checked out
    const updatedWeeks = [...weeks];
    updatedWeeks[currentWeekIndex] = {
      ...updatedWeeks[currentWeekIndex],
      isCheckedOut: true,
      items: updatedWeeks[currentWeekIndex].items.map(item => {
        const decision = decisions.find(d => d.itemId === item.id);
        if (decision?.decision === 'resolved') {
          return { ...item, status: 'done' as const };
        }
        return item;
      }).filter(item => {
        const decision = decisions.find(d => d.itemId === item.id);
        return decision?.decision !== 'remove';
      })
    };

    // Create new week with carried items
    const nextWeekDate = new Date('2026-02-09');
    const newWeekItems: T10Item[] = carriedItems.map((carried, idx) => {
      const originalItem = items.find(i => i.id === carried.itemId);
      return {
        ...originalItem!,
        id: `carried-${Date.now()}-${idx}`,
        week_id: `w${weeks.length + 1}`,
        rank: idx + 1,
        carryover_count: (originalItem?.carryover_count || 0) + 1,
        status: 'todo' as const,
      };
    });

    const newWeek: WeekData = {
      id: `w${weeks.length + 1}`,
      startDate: '2026-02-09',
      displayDate: 'Feb 9, 2026',
      isCheckedOut: false,
      items: newWeekItems,
    };

    updatedWeeks.push(newWeek);
    setWeeks(updatedWeeks);
    setCurrentWeekIndex(updatedWeeks.length - 1);
    setCheckoutOpen(false);

    toast({
      title: "Week checked out successfully",
      description: `${resolvedItems.length} resolved, ${carriedItems.length} carried to next week.`,
    });
  };

  const canNavigatePrev = currentWeekIndex > 0;
  const canNavigateNext = currentWeekIndex < weeks.length - 1;

  return (
    <div className="t10-module">
      <header className="t10-week-header">
        <div className="t10-week-header-left">
          <button className="t10-back-btn" onClick={() => navigate('/taskhub/task10')}>
            <ArrowLeft size={18} />
            Back
          </button>
          <span className="t10-list-title">Weekly Team Priorities</span>
        </div>
        <div className="t10-week-nav">
          <button 
            className="t10-week-nav-btn" 
            disabled={!canNavigatePrev}
            onClick={() => setCurrentWeekIndex(prev => prev - 1)}
          >
            <ChevronLeft size={18} />
          </button>
          <div className="t10-week-date">
            {currentWeek?.displayDate}
            {currentWeek?.isCheckedOut && (
              <span className="t10-week-checked-badge">
                <Check size={12} /> Checked Out
              </span>
            )}
          </div>
          <button 
            className="t10-week-nav-btn" 
            disabled={!canNavigateNext}
            onClick={() => setCurrentWeekIndex(prev => prev + 1)}
          >
            <ChevronRight size={18} />
          </button>
        </div>
        <div className="t10-week-header-right">
          <div className="t10-week-progress">
            <strong>{completedCount}</strong>/10 completed
          </div>
          {currentWeek?.isCheckedOut ? (
            <span className="t10-checked-out-badge">
              <Check size={16} /> Week Closed
            </span>
          ) : (
            <button className="t10-btn t10-btn-primary" onClick={() => setCheckoutOpen(true)}>
              <CheckCircle size={18} />
              Checkout Week
            </button>
          )}
        </div>
      </header>

      {!currentWeek?.isCheckedOut && (
        <div className="t10-ai-banner">
          <div className="t10-ai-collapsed" onClick={() => setAiExpanded(!aiExpanded)}>
            <div className="t10-ai-collapsed-left">
              <div className="t10-ai-icon-wrapper"><Zap size={20} /></div>
              <div>
                <div className="t10-ai-collapsed-title">AI Suggestions</div>
                <div className="t10-ai-collapsed-subtitle">
                  Based on participants: <strong>Ibrahim A., Vikram I., Maali A.</strong> · {10 - topTenItems.length} slots available
                </div>
              </div>
            </div>
            <button className={`t10-ai-toggle ${aiExpanded ? 'expanded' : ''}`}>
              {aiExpanded ? 'Close' : 'Review 2 tasks'}
              <ChevronDown size={16} />
            </button>
          </div>
          {aiExpanded && (
            <div className="t10-ai-expanded">
              <div className="t10-ai-info-box">
                <Info size={16} />
                Showing HIGH and CRITICAL priority tasks from TaskHub assigned to this list's participants
              </div>
              <div className="t10-ai-suggestion-card">
                <div className="t10-ai-suggestion-checkbox" />
                <div className="t10-ai-priority-badge critical">Critical</div>
                <div className="t10-ai-suggestion-content">
                  <div className="t10-ai-suggestion-title">Security vulnerability patch for authentication module</div>
                  <div className="t10-ai-suggestion-meta">
                    <span className="t10-ai-suggestion-key">TSK-201</span>
                    Assigned to <strong>Vikram I.</strong>
                    Due Feb 4
                  </div>
                </div>
                <button className="t10-ai-add-btn">Add</button>
              </div>
              <div className="t10-ai-suggestion-card">
                <div className="t10-ai-suggestion-checkbox" />
                <div className="t10-ai-priority-badge high">High</div>
                <div className="t10-ai-suggestion-content">
                  <div className="t10-ai-suggestion-title">Client onboarding process documentation update</div>
                  <div className="t10-ai-suggestion-meta">
                    <span className="t10-ai-suggestion-key">TSK-198</span>
                    Assigned to <strong>Ibrahim A.</strong>
                    Due Feb 5
                  </div>
                </div>
                <button className="t10-ai-add-btn">Add</button>
              </div>
            </div>
          )}
        </div>
      )}

      {!currentWeek?.isCheckedOut && (
        <div className="t10-quick-add">
          <div className={`t10-quick-add-icon ${quickAddValue ? 'active' : ''}`}>
            <Plus size={18} />
          </div>
          <input 
            type="text" 
            className="t10-quick-add-input" 
            placeholder="Add a priority or paste TaskHub key..."
            value={quickAddValue}
            onChange={(e) => setQuickAddValue(e.target.value)}
            onKeyDown={handleQuickAdd}
          />
          <span className="t10-quick-add-hint">
            <kbd>Enter</kbd> to add
          </span>
        </div>
      )}

      <div className="t10-cards-section">
        <div className="t10-section-header">
          <span className="t10-section-title">Top 10 Priorities</span>
        </div>
        <div className="t10-cards-list">
          {topTenItems.length > 0 ? (
            topTenItems.map(item => (
              <T10PriorityCard 
                key={item.id} 
                item={item} 
                onClick={() => handleCardClick(item.id)} 
                onToggleStatus={() => handleToggleStatus(item.id)} 
              />
            ))
          ) : (
            <div className="t10-empty-state">
              <p>No priorities for this week yet. Add items using the quick add above.</p>
            </div>
          )}
        </div>
        
        {bufferItems.length > 0 && (
          <div className="t10-buffer-section">
            <button 
              className={`t10-buffer-toggle ${bufferExpanded ? 'expanded' : ''}`} 
              onClick={() => setBufferExpanded(!bufferExpanded)}
            >
              <div className="t10-buffer-toggle-left">
                <span>Buffer Queue</span>
                <span className="t10-buffer-count">{bufferItems.length} items</span>
              </div>
              <ChevronDown size={18} />
            </button>
            {bufferExpanded && (
              <div className="t10-buffer-list">
                {bufferItems.map(item => (
                  <T10PriorityCard 
                    key={item.id} 
                    item={item} 
                    onClick={() => handleCardClick(item.id)} 
                    onToggleStatus={() => handleToggleStatus(item.id)} 
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <T10SidePanel 
        item={items.find(i => i.id === selectedItemId) || null} 
        isOpen={sidePanelOpen} 
        onClose={() => { setSidePanelOpen(false); setSelectedItemId(null); }} 
        onUpdate={handleUpdateItem} 
        onDelete={handleDeleteItem} 
      />
      
      <T10CheckoutModal 
        isOpen={checkoutOpen} 
        onClose={() => setCheckoutOpen(false)} 
        weekDate={`${currentWeek?.displayDate} – Feb 8, 2026`}
        items={items.filter(i => i.rank <= 10)} 
        completedCount={completedCount} 
        onCheckout={handleCheckout} 
      />
    </div>
  );
}
