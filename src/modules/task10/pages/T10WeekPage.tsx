import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ChevronLeft, ChevronRight, CheckCircle, Zap, Plus, ChevronDown, Info } from 'lucide-react';
import { T10PriorityCard } from '../components/week/T10PriorityCard';
import { T10SidePanel } from '../components/panel/T10SidePanel';
import { T10CheckoutModal } from '../components/modals/T10CheckoutModal';
import type { T10Item } from '../types';
import '../styles/task10.css';

const mockItems: T10Item[] = [
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

export function T10WeekPage() {
  const navigate = useNavigate();
  const { listId } = useParams();
  const [items, setItems] = useState(mockItems);
  const [aiExpanded, setAiExpanded] = useState(false);
  const [bufferExpanded, setBufferExpanded] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [sidePanelOpen, setSidePanelOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  const completedCount = items.filter(i => i.status === 'done').length;
  const topTenItems = items.filter(i => i.rank <= 10);
  const bufferItems = items.filter(i => i.rank > 10);

  const handleCardClick = (itemId: string) => { setSelectedItemId(itemId); setSidePanelOpen(true); };
  const handleToggleStatus = (itemId: string) => { setItems(items.map(item => item.id === itemId ? { ...item, status: item.status === 'done' ? 'todo' : 'done' } : item)); };

  return (
    <div className="t10-module">
      <header className="t10-week-header">
        <div className="t10-week-header-left">
          <button className="t10-back-btn" onClick={() => navigate('/task10')}><ArrowLeft size={18} />Back</button>
          <span className="t10-list-title">Weekly Team Priorities</span>
        </div>
        <div className="t10-week-nav">
          <button className="t10-week-nav-btn"><ChevronLeft size={18} /></button>
          <div className="t10-week-date">Feb 2, 2026</div>
          <button className="t10-week-nav-btn" disabled><ChevronRight size={18} /></button>
        </div>
        <div className="t10-week-header-right">
          <div className="t10-week-progress"><strong>{completedCount}</strong>/10 completed</div>
          <button className="t10-btn t10-btn-primary" onClick={() => setCheckoutOpen(true)}><CheckCircle size={18} />Checkout Week</button>
        </div>
      </header>

      <div className="t10-ai-banner">
        <div className="t10-ai-collapsed" onClick={() => setAiExpanded(!aiExpanded)}>
          <div className="t10-ai-collapsed-left">
            <div className="t10-ai-icon-wrapper"><Zap size={20} /></div>
            <div>
              <div className="t10-ai-collapsed-title">AI Suggestions</div>
              <div className="t10-ai-collapsed-subtitle">Based on participants: <strong>Ibrahim A., Vikram I., Maali A.</strong> · 2 slots available</div>
            </div>
          </div>
          <button className={`t10-ai-toggle ${aiExpanded ? 'expanded' : ''}`}>{aiExpanded ? 'Close' : 'Review 2 tasks'}<ChevronDown size={16} /></button>
        </div>
        {aiExpanded && (
          <div className="t10-ai-expanded">
            <div className="t10-ai-info-box"><Info size={16} />Showing HIGH and CRITICAL priority tasks from TaskHub assigned to this list's participants</div>
            <div className="t10-ai-suggestion-card">
              <div className="t10-ai-suggestion-checkbox" />
              <div className="t10-ai-priority-badge critical">Critical</div>
              <div className="t10-ai-suggestion-content">
                <div className="t10-ai-suggestion-title">Security vulnerability patch for authentication module</div>
                <div className="t10-ai-suggestion-meta"><span className="t10-ai-suggestion-key">TSK-201</span>Assigned to <strong>Vikram I.</strong>Due Feb 4</div>
              </div>
              <button className="t10-ai-add-btn">Add</button>
            </div>
          </div>
        )}
      </div>

      <div className="t10-quick-add">
        <div className="t10-quick-add-icon"><Plus size={18} /></div>
        <input type="text" className="t10-quick-add-input" placeholder="Add a priority or paste TaskHub key..." />
        <span className="t10-quick-add-hint"><kbd>Enter</kbd> to add</span>
      </div>

      <div className="t10-cards-section">
        <div className="t10-section-header"><span className="t10-section-title">Top 10 Priorities</span></div>
        <div className="t10-cards-list">
          {topTenItems.map(item => (<T10PriorityCard key={item.id} item={item} onClick={() => handleCardClick(item.id)} onToggleStatus={() => handleToggleStatus(item.id)} />))}
        </div>
        {bufferItems.length > 0 && (
          <div className="t10-buffer-section">
            <button className={`t10-buffer-toggle ${bufferExpanded ? 'expanded' : ''}`} onClick={() => setBufferExpanded(!bufferExpanded)}>
              <div className="t10-buffer-toggle-left"><span>Buffer Queue</span><span className="t10-buffer-count">{bufferItems.length} items</span></div>
              <ChevronDown size={18} />
            </button>
            {bufferExpanded && (<div className="t10-buffer-list">{bufferItems.map(item => (<T10PriorityCard key={item.id} item={item} onClick={() => handleCardClick(item.id)} onToggleStatus={() => handleToggleStatus(item.id)} />))}</div>)}
          </div>
        )}
      </div>

      <T10SidePanel item={items.find(i => i.id === selectedItemId) || null} isOpen={sidePanelOpen} onClose={() => { setSidePanelOpen(false); setSelectedItemId(null); }} onUpdate={(updates) => { if (selectedItemId) setItems(items.map(item => item.id === selectedItemId ? { ...item, ...updates } : item)); }} onDelete={() => { if (selectedItemId) { setItems(items.filter(item => item.id !== selectedItemId)); setSidePanelOpen(false); setSelectedItemId(null); } }} />
      <T10CheckoutModal isOpen={checkoutOpen} onClose={() => setCheckoutOpen(false)} weekDate="Feb 2 – Feb 8, 2026" items={items.filter(i => i.rank <= 10)} completedCount={completedCount} onCheckout={(decisions) => { console.log('Checkout:', decisions); setCheckoutOpen(false); }} />
    </div>
  );
}
