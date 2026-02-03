// ═══════════════════════════════════════════════════════════════════════════════
// PAGE: T10CompletedPage
// Purpose: Completed weeks verification view with summary cards and table
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { T10CompletedSummaryCards } from '../components/completed/T10CompletedSummaryCards';
import { T10CompletedFilters } from '../components/completed/T10CompletedFilters';
import { T10CompletedWeeksTable } from '../components/completed/T10CompletedWeeksTable';
import type { T10CompletedFilters as FilterType } from '../types/completed';
import '../styles/task10-v2.css';

export function T10CompletedPage() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<FilterType>({
    dateRange: 'last30',
  });

  const handleListClick = (listId: string) => {
    navigate(`/taskhub/task10/list/${listId}`);
  };

  return (
    <div className="t10-module-v2">
      <div className="t10-completed-page">
        {/* Header */}
        <div className="t10-completed-header">
          <button
            type="button"
            className="t10-back-btn"
            onClick={() => navigate('/taskhub/task10')}
          >
            <ArrowLeft size={16} />
            Back to Lists
          </button>
          <div className="t10-completed-title-section">
            <h1 className="t10-completed-title">Completed Weeks</h1>
            <p className="t10-completed-subtitle">
              Review and verify completed weeks across all your Task¹⁰ lists
            </p>
          </div>
        </div>

        {/* Summary Cards */}
        <T10CompletedSummaryCards />

        {/* Filters */}
        <T10CompletedFilters
          filters={filters}
          onFiltersChange={setFilters}
        />

        {/* Table */}
        <T10CompletedWeeksTable
          filters={filters}
          onListClick={handleListClick}
        />
      </div>
    </div>
  );
}

export default T10CompletedPage;
