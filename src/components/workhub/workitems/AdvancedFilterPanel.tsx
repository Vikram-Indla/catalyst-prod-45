/**
 * AdvancedFilterPanel — Multi-condition filter builder
 * Phase 9
 */
import { useState } from 'react';
import { X, Plus, SlidersHorizontal } from 'lucide-react';
import { v4 as uuid } from 'uuid';

export interface FilterCondition {
  id: string;
  field: string;
  operator: string;
  value: string;
}

const FIELD_OPTIONS = [
  { value: 'status', label: 'Status' },
  { value: 'priority', label: 'Priority' },
  { value: 'issue_type', label: 'Type' },
  { value: 'assignee_display_name', label: 'Assignee' },
  { value: 'project_key', label: 'Project' },
  { value: 'due_date', label: 'Due Date' },
  { value: 'story_points', label: 'Story Points' },
  { value: 'sprint_name', label: 'Release' },
  { value: 'resolution', label: 'Resolution' },
  { value: 'status_category', label: 'Status Category' },
];

const OPERATORS_BY_FIELD: Record<string, { value: string; label: string }[]> = {
  status: [{ value: 'is', label: 'is' }, { value: 'is_not', label: 'is not' }],
  priority: [{ value: 'is', label: 'is' }, { value: 'is_not', label: 'is not' }],
  issue_type: [{ value: 'is', label: 'is' }, { value: 'is_not', label: 'is not' }],
  assignee_display_name: [{ value: 'is', label: 'is' }, { value: 'is_not', label: 'is not' }, { value: 'is_empty', label: 'is empty' }, { value: 'is_not_empty', label: 'is not empty' }],
  project_key: [{ value: 'is', label: 'is' }, { value: 'is_not', label: 'is not' }],
  due_date: [{ value: 'is_before', label: 'is before' }, { value: 'is_after', label: 'is after' }, { value: 'is_empty', label: 'is empty' }],
  story_points: [{ value: 'eq', label: 'equals' }, { value: 'gt', label: 'greater than' }, { value: 'lt', label: 'less than' }],
  sprint_name: [{ value: 'is', label: 'is' }, { value: 'is_not', label: 'is not' }, { value: 'is_empty', label: 'is empty' }],
  resolution: [{ value: 'is', label: 'is' }, { value: 'is_not', label: 'is not' }, { value: 'is_empty', label: 'is empty' }],
  status_category: [{ value: 'is', label: 'is' }, { value: 'is_not', label: 'is not' }],
};

const VALUE_OPTIONS: Record<string, string[]> = {
  status: ['To Do', 'In Progress', 'In Review', 'Done', 'Blocked', 'Cancelled', 'Open', 'Reopened', 'Closed'],
  priority: ['Critical', 'Highest', 'High', 'Medium', 'Low', 'Lowest'],
  issue_type: ['Epic', 'Story', 'Sub-task', 'Bug', 'Task', 'Incident'],
  status_category: ['To Do', 'In Progress', 'Done'],
};

function needsValue(op: string) {
  return !['is_empty', 'is_not_empty'].includes(op);
}

interface AdvancedFilterPanelProps {
  conditions: FilterCondition[];
  matchMode: 'and' | 'or';
  onConditionsChange: (conditions: FilterCondition[]) => void;
  onMatchModeChange: (mode: 'and' | 'or') => void;
  onApply: () => void;
  onReset: () => void;
  onClose: () => void;
}

export function AdvancedFilterPanel({
  conditions, matchMode, onConditionsChange, onMatchModeChange, onApply, onReset, onClose,
}: AdvancedFilterPanelProps) {
  const addCondition = () => {
    if (conditions.length >= 8) return;
    onConditionsChange([...conditions, { id: uuid(), field: 'status', operator: 'is', value: '' }]);
  };

  const updateCondition = (id: string, updates: Partial<FilterCondition>) => {
    onConditionsChange(conditions.map(c => {
      if (c.id !== id) return c;
      const updated = { ...c, ...updates };
      // Reset operator and value when field changes
      if (updates.field) {
        const ops = OPERATORS_BY_FIELD[updates.field] || [];
        updated.operator = ops[0]?.value || 'is';
        updated.value = '';
      }
      // Reset value when operator changes
      if (updates.operator && !needsValue(updates.operator)) {
        updated.value = '';
      }
      return updated;
    }));
  };

  const removeCondition = (id: string) => {
    onConditionsChange(conditions.filter(c => c.id !== id));
  };

  const selectStyle: React.CSSProperties = {
    height: 50,
    borderRadius: 'var(--wh-radius-md, 8px)',
    border: '1px solid var(--divider)',
    padding: '0 10px',
    fontSize: 13,
    fontFamily: 'var(--ds-font-family-body)',
    color: 'var(--fg-1)',
    backgroundColor: 'var(--cp-float)',
    minWidth: 140,
    outline: 'none',
  };

  return (
    <div
      className="mb-3 animate-in slide-in-from-top-2 duration-200"
      style={{
        background: 'var(--cp-float)',
        border: '1px solid var(--divider)',
        borderRadius: 'var(--wh-radius-lg, 12px)',
        padding: 16,
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4" style={{ color: 'var(--cp-blue)' }} />
          <span className="text-sm font-semibold" style={{ color: 'var(--fg-1)', fontFamily: 'var(--ds-font-family-body)' }}>
            Advanced Filters
          </span>
        </div>
        <button onClick={onClose} className="p-1 rounded-md hover:bg-slate-100 transition-colors">
          <X className="w-4 h-4" style={{ color: 'var(--fg-4)' }} />
        </button>
      </div>

      {/* Condition rows */}
      <div className="space-y-2 mb-3">
        {conditions.map((cond, idx) => {
          const operators = OPERATORS_BY_FIELD[cond.field] || [{ value: 'is', label: 'is' }];
          const values = VALUE_OPTIONS[cond.field];
          const showValue = needsValue(cond.operator);
          const isDateField = cond.field === 'due_date';
          const isNumberField = cond.field === 'story_points';

          return (
            <div key={cond.id} className="flex items-center gap-2 flex-wrap">
              {/* Conjunction */}
              <span className="text-xs font-semibold w-12 shrink-0 text-right" style={{ color: 'var(--fg-4)', textTransform: 'uppercase' }}>
                {idx === 0 ? 'Where' : matchMode === 'and' ? 'AND' : 'OR'}
              </span>

              {/* Field */}
              <select value={cond.field} onChange={e => updateCondition(cond.id, { field: e.target.value })} style={selectStyle}
                className="focus:ring-2 focus:ring-blue-500/30">
                {FIELD_OPTIONS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
              </select>

              {/* Operator */}
              <select value={cond.operator} onChange={e => updateCondition(cond.id, { operator: e.target.value })} style={{ ...selectStyle, minWidth: 120 }}
                className="focus:ring-2 focus:ring-blue-500/30">
                {operators.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>

              {/* Value */}
              {showValue && (
                values ? (
                  <select value={cond.value} onChange={e => updateCondition(cond.id, { value: e.target.value })} style={selectStyle}
                    className="focus:ring-2 focus:ring-blue-500/30">
                    <option value="">Select...</option>
                    {values.map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                ) : isDateField ? (
                  <input type="date" value={cond.value} onChange={e => updateCondition(cond.id, { value: e.target.value })}
                    style={{ ...selectStyle, minWidth: 150 }} className="focus:ring-2 focus:ring-blue-500/30" />
                ) : isNumberField ? (
                  <input type="number" value={cond.value} onChange={e => updateCondition(cond.id, { value: e.target.value })}
                    placeholder="0" style={{ ...selectStyle, minWidth: 80 }} className="focus:ring-2 focus:ring-blue-500/30" />
                ) : (
                  <input type="text" value={cond.value} onChange={e => updateCondition(cond.id, { value: e.target.value })}
                    placeholder="Value..." style={{ ...selectStyle, minWidth: 150 }} className="focus:ring-2 focus:ring-blue-500/30" />
                )
              )}

              {/* Remove */}
              <button onClick={() => removeCondition(cond.id)}
                className="p-1.5 rounded-md hover:bg-red-50 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500/30">
                <X className="w-3.5 h-3.5" style={{ color: 'var(--sem-danger)' }} />
              </button>
            </div>
          );
        })}
      </div>

      {/* Add condition */}
      <button onClick={addCondition} disabled={conditions.length >= 8}
        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-md border hover:bg-slate-50 transition-colors disabled:opacity-40 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
        style={{ borderColor: 'var(--divider)', color: 'var(--cp-blue)' }}>
        <Plus className="w-3 h-3" /> Add Condition
      </button>

      {/* Match mode + actions */}
      <div className="flex items-center justify-between mt-4 pt-3" style={{ borderTop: '1px solid var(--bg-1)' }}>
        <div className="flex items-center gap-4">
          <span className="text-xs font-medium" style={{ color: 'var(--fg-3)' }}>Match:</span>
          <label className="flex items-center gap-1.5 text-xs cursor-pointer">
            <input type="radio" checked={matchMode === 'and'} onChange={() => onMatchModeChange('and')} className="accent-blue-600" />
            <span style={{ color: 'var(--fg-1)' }}>All conditions (AND)</span>
          </label>
          <label className="flex items-center gap-1.5 text-xs cursor-pointer">
            <input type="radio" checked={matchMode === 'or'} onChange={() => onMatchModeChange('or')} className="accent-blue-600" />
            <span style={{ color: 'var(--fg-1)' }}>Any condition (OR)</span>
          </label>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={onReset}
            className="px-3 py-1.5 text-xs font-medium rounded-md border hover:bg-slate-50 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            style={{ borderColor: 'var(--divider)', color: 'var(--fg-3)' }}>
            Reset
          </button>
          <button onClick={onApply}
            className="px-3 py-1.5 text-xs font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            style={{ backgroundColor: 'var(--cp-blue)', color: 'var(--bg-app)' }}>
            Apply {conditions.length > 0 ? `${conditions.length} Condition${conditions.length > 1 ? 's' : ''}` : ''}
          </button>
        </div>
      </div>
    </div>
  );
}
