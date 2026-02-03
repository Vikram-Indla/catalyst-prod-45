// ═══════════════════════════════════════════════════════════════════════════
// TASK¹⁰ LANDING PAGE
// Lists overview with search, filter, and create functionality
// ═══════════════════════════════════════════════════════════════════════════

import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useT10Lists } from '../hooks';
import type { T10ListStatus, T10ListRow, T10ListWithStats } from '../types';
import {
  T10Header,
  T10SearchBar,
  T10FilterBar,
  T10ListCard,
  T10DropdownMenu,
  T10CreateListModal,
  T10RenameListModal,
  T10DeleteListModal,
} from '../components';
import type { DropdownMenuItem, FilterState } from '../components';
import '../styles/task10.scoped.css';
import '../styles/task10-complete.css';

export function T10LandingPage() {
  const navigate = useNavigate();
  const { data: lists, isLoading, error } = useT10Lists();
  
  // UI State
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<FilterState>({});
  
  // Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [renameList, setRenameList] = useState<T10ListRow | null>(null);
  const [deleteList, setDeleteList] = useState<T10ListRow | null>(null);
  
  // Dropdown menu state
  const [menuPosition, setMenuPosition] = useState<{ x: number; y: number } | null>(null);
  const [menuList, setMenuList] = useState<T10ListWithStats | null>(null);

  // Filter and sort lists
  const filteredLists = useMemo(() => {
    if (!lists) return [];
    
    let result = [...lists];
    
    // Filter by status
    if (filters.status && filters.status !== 'all') {
      result = result.filter(list => list.status === filters.status);
    }
    
    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(list => 
        list.name.toLowerCase().includes(query) ||
        list.list_key.toLowerCase().includes(query)
      );
    }
    
    // Sort by most recent
    result.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
    
    return result;
  }, [lists, filters, searchQuery]);

  const handleListClick = (list: T10ListWithStats) => {
    navigate(`/taskhub/task10/list/${list.id}`);
  };

  const handleMenuClick = (list: T10ListWithStats, event: React.MouseEvent) => {
    event.stopPropagation();
    const rect = (event.target as HTMLElement).getBoundingClientRect();
    setMenuPosition({ x: rect.left, y: rect.bottom + 4 });
    setMenuList(list);
  };

  const getMenuItems = (list: T10ListWithStats): DropdownMenuItem[] => [
    {
      id: 'rename',
      label: 'Rename',
      icon: 'edit',
      onClick: () => setRenameList(list),
    },
    {
      id: 'archive',
      label: list.status === 'archived' ? 'Restore' : 'Archive',
      icon: list.status === 'archived' ? 'restore' : 'archive',
      onClick: () => {
        // TODO: Implement archive/restore
        console.log('Archive/restore', list.id);
      },
    },
    {
      id: 'delete',
      label: 'Delete',
      icon: 'delete',
      variant: 'danger',
      onClick: () => setDeleteList(list),
    },
  ];

  if (isLoading) {
    return (
      <div className="catalyst-module--task10 t10-module">
        <T10Header onCreateList={() => setIsCreateModalOpen(true)} />
        <div className="t10-loading">
          <Loader2 className="t10-spinner" />
          <span>Loading lists...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="catalyst-module--task10 t10-module">
        <T10Header onCreateList={() => setIsCreateModalOpen(true)} />
        <div className="t10-error">
          <span>Failed to load lists. Please try again.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="catalyst-module--task10 t10-module">
      <T10Header onCreateList={() => setIsCreateModalOpen(true)} />
      
      <main className="t10-main">
        <div className="t10-container t10-container--narrow">
          {/* Toolbar */}
          <div className="t10-toolbar">
            <T10SearchBar 
              value={searchQuery} 
              onChange={setSearchQuery} 
            />
            <T10FilterBar 
              filters={filters}
              onFilterChange={setFilters}
            />
          </div>
          
          {/* Lists Grid */}
          {filteredLists.length === 0 ? (
            <div className="t10-empty-state">
              {lists?.length === 0 ? (
                <>
                  <div className="t10-empty-state__icon">📋</div>
                  <h3>No lists yet</h3>
                  <p>Create your first Top 10 list to get started</p>
                  <button 
                    className="t10-btn t10-btn--primary"
                    onClick={() => setIsCreateModalOpen(true)}
                  >
                    Create List
                  </button>
                </>
              ) : (
                <>
                  <div className="t10-empty-state__icon">🔍</div>
                  <h3>No matching lists</h3>
                  <p>Try adjusting your search or filters</p>
                </>
              )}
            </div>
          ) : (
            <div className="t10-lists-grid">
              {filteredLists.map((list) => (
                <T10ListCard
                  key={list.id}
                  list={list}
                  onClick={() => handleListClick(list)}
                  onMenuClick={(e) => handleMenuClick(list, e)}
                />
              ))}
            </div>
          )}
        </div>
      </main>
      
      {/* Dropdown Menu */}
      {menuPosition && menuList && (
        <T10DropdownMenu
          items={getMenuItems(menuList)}
          position={menuPosition}
          onClose={() => {
            setMenuPosition(null);
            setMenuList(null);
          }}
        />
      )}
      
      {/* Modals */}
      <T10CreateListModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={(listId) => navigate(`/taskhub/task10/list/${listId}`)}
      />
      
      <T10RenameListModal
        isOpen={!!renameList}
        list={renameList}
        onClose={() => setRenameList(null)}
      />
      
      <T10DeleteListModal
        isOpen={!!deleteList}
        list={deleteList}
        onClose={() => setDeleteList(null)}
      />
    </div>
  );
}

export default T10LandingPage;
