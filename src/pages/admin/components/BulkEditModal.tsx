/**
 * BulkEditModal - V8 Design System Compliant
 * Ring-fenced bulk edit modal for /admin/users
 */

import { useState } from 'react';
import { X, ChevronDown, Check } from 'lucide-react';

interface BulkEditModalProps {
  isOpen: boolean;
  selectedCount: number;
  onClose: () => void;
  onApply: (updates: Record<string, string>) => void;
  departments?: Array<{ id: string; name: string }>;
  assignments?: Array<{ id: string; name: string }>;
  vendors?: Array<{ id: string; name: string }>;
  countries?: Array<{ id: string; name: string }>;
  locations?: Array<{ id: string; name: string }>;
}

export function BulkEditModal({
  isOpen, selectedCount, onClose, onApply,
  departments = [], assignments = [], vendors = [], countries = [], locations = []
}: BulkEditModalProps) {
  const [enabledFields, setEnabledFields] = useState<Set<string>>(new Set());
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [values, setValues] = useState({
    department_id: '',
    assignment_id: '',
    vendor_id: '',
    resource_type: '',
    location_id: '',
    country_id: ''
  });

  const toggleField = (field: string) => {
    const next = new Set(enabledFields);
    if (next.has(field)) next.delete(field);
    else next.add(field);
    setEnabledFields(next);
  };

  const handleApply = () => {
    const updates: Record<string, string> = {};
    enabledFields.forEach(field => {
      if (values[field as keyof typeof values]) {
        updates[field] = values[field as keyof typeof values];
      }
    });
    if (Object.keys(updates).length === 0) {
      return;
    }
    onApply(updates);
  };

  const selectValue = (field: string, value: string) => {
    setValues(prev => ({ ...prev, [field]: value }));
    setOpenDropdown(null);
  };

  const getDisplayValue = (field: string, options: Array<{ id: string; name: string }>, placeholder: string) => {
    const value = values[field as keyof typeof values];
    if (!value) return placeholder;
    const option = options.find(o => o.id === value);
    return option?.name || placeholder;
  };

  if (!isOpen) return null;

  const resourceTypeOptions = [
    { id: 'Variable', name: 'Variable' },
    { id: 'Permanent', name: 'Permanent' },
    { id: 'Fixed', name: 'Fixed' },
    { id: 'Freelance', name: 'Freelance' }
  ];

  const fields = [
    { key: 'department_id', label: 'Department', placeholder: 'Select department', options: departments },
    { key: 'assignment_id', label: 'Assignment', placeholder: 'Select assignment', options: assignments },
    { key: 'vendor_id', label: 'Vendor', placeholder: 'Select vendor', options: vendors },
    { key: 'resource_type', label: 'Resource Type', placeholder: 'Select type', options: resourceTypeOptions },
    { key: 'location_id', label: 'Location', placeholder: 'Select location', options: locations },
    { key: 'country_id', label: 'Country', placeholder: 'Select country', options: countries },
  ];

  return (
    <>
      <style>{bulkModalCSS}</style>
      <div className="ct-modal-overlay" onClick={onClose}>
        <div className="ct-modal" onClick={(e) => e.stopPropagation()}>
          {/* Header */}
          <div className="ct-modal-header">
            <h2>Bulk Edit {selectedCount} Users</h2>
            <button className="ct-modal-close" onClick={onClose}>
              <X size={18} />
            </button>
          </div>

          {/* Body */}
          <div className="ct-modal-body">
            <p className="ct-modal-description">
              Check the fields you want to update. Only checked fields will be changed.
            </p>

            <div className="ct-field-list">
              {fields.map(({ key, label, placeholder, options }) => {
                const isEnabled = enabledFields.has(key);
                const isOpen = openDropdown === key;
                const currentValue = values[key as keyof typeof values];

                return (
                  <div 
                    key={key} 
                    className={`ct-field-card ${isEnabled ? 'active' : ''}`}
                  >
                    <div className="ct-field-card-header">
                      <input
                        type="checkbox"
                        checked={isEnabled}
                        onChange={() => toggleField(key)}
                      />
                      <span className="ct-field-card-label">{label}</span>
                    </div>

                    <div className={`ct-field-select ${isOpen ? 'open' : ''}`}>
                      <button
                        type="button"
                        className={`ct-field-select-trigger ${!currentValue ? 'placeholder' : ''}`}
                        disabled={!isEnabled}
                        onClick={() => isEnabled && setOpenDropdown(isOpen ? null : key)}
                      >
                        {getDisplayValue(key, options, placeholder)}
                        <ChevronDown size={16} />
                      </button>

                      {isOpen && isEnabled && (
                        <div className="ct-field-select-panel">
                          {options.map(option => (
                            <div
                              key={option.id}
                              className={`ct-field-select-item ${currentValue === option.id ? 'selected' : ''}`}
                              onClick={() => selectValue(key, option.id)}
                            >
                              <span className="checkmark">
                                {currentValue === option.id && <Check size={14} />}
                              </span>
                              {option.name}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Footer */}
          <div className="ct-modal-footer">
            <button className="ct-btn" onClick={onClose}>Cancel</button>
            <button className="ct-btn ct-btn-primary" onClick={handleApply}>
              Apply Changes
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

const bulkModalCSS = `
/* ==========================================
   V8 DESIGN SYSTEM - BULK EDIT MODAL
   ========================================== */

/* Modal Overlay */
.ct-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
  animation: ct-fadeIn 0.15s ease;
}

@keyframes ct-fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

/* Modal Container */
.ct-modal {
  background: #ffffff;
  border-radius: 12px;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  width: 480px;
  max-width: 90vw;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  animation: ct-modalIn 0.2s ease;
}

@keyframes ct-modalIn {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
}

/* Modal Header */
.ct-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid #e2e8f0;
}

.ct-modal-header h2 {
  font-size: 18px;
  font-weight: 700;
  color: #0f172a;
  margin: 0;
}

.ct-modal-close {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: #f8fafc;
  border-radius: 8px;
  color: #64748b;
  cursor: pointer;
  transition: all 0.15s ease;
}

.ct-modal-close:hover {
  background: #f1f5f9;
  color: #334155;
}

/* Modal Body */
.ct-modal-body {
  padding: 24px;
  overflow-y: auto;
  flex: 1;
}

.ct-modal-description {
  font-size: 13px;
  color: #64748b;
  margin: 0 0 20px 0;
  line-height: 1.5;
}

/* Field List */
.ct-field-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* Field Card - V8: WHITE background, NOT gray */
.ct-field-card {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 16px 20px;
  transition: all 0.15s ease;
}

.ct-field-card:hover {
  border-color: #94a3b8;
}

/* Active state: Blue border + subtle blue bg */
.ct-field-card.active {
  border-color: #2563eb;
  background: rgba(37, 99, 235, 0.04);
}

.ct-field-card-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.ct-field-card-header input[type="checkbox"] {
  width: 20px;
  height: 20px;
  accent-color: #2563eb;
  cursor: pointer;
  flex-shrink: 0;
}

.ct-field-card-label {
  font-size: 14px;
  font-weight: 600;
  color: #0f172a;
}

/* Dropdown Select */
.ct-field-select {
  position: relative;
  width: 100%;
}

.ct-field-select-trigger {
  width: 100%;
  height: 44px;
  padding: 0 44px 0 16px;
  font-family: inherit;
  font-size: 14px;
  font-weight: 500;
  color: #1e293b;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s ease;
  text-align: left;
  display: flex;
  align-items: center;
  position: relative;
}

.ct-field-select-trigger:hover:not(:disabled) {
  border-color: #2563eb;
}

.ct-field-select-trigger:focus {
  outline: none;
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.08);
}

.ct-field-select-trigger:disabled {
  background: #f8fafc;
  color: #94a3b8;
  cursor: not-allowed;
}

.ct-field-select-trigger.placeholder {
  color: #94a3b8;
}

.ct-field-select-trigger svg {
  position: absolute;
  right: 16px;
  color: #64748b;
  transition: transform 0.15s ease;
}

.ct-field-select.open .ct-field-select-trigger svg {
  transform: rotate(180deg);
}

/* CRITICAL: Dropdown Panel - WHITE background with shadow */
.ct-field-select-panel {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  right: 0;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  padding: 8px;
  z-index: 50;
  max-height: 280px;
  overflow-y: auto;
  animation: ct-slideDown 0.15s ease;
}

@keyframes ct-slideDown {
  from { opacity: 0; transform: translateY(-8px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Dropdown Items */
.ct-field-select-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  font-size: 14px;
  font-weight: 500;
  color: #334155;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.ct-field-select-item:hover {
  background: #f8fafc;
}

/* Selected item: Blue tint background */
.ct-field-select-item.selected {
  background: rgba(37, 99, 235, 0.08);
  color: #2563eb;
  font-weight: 600;
}

.ct-field-select-item .checkmark {
  width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #2563eb;
}

/* Modal Footer */
.ct-modal-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 24px;
  border-top: 1px solid #e2e8f0;
  background: #f8fafc;
  border-radius: 0 0 12px 12px;
}

/* Button Styles */
.ct-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 0 16px;
  height: 40px;
  font-size: 14px;
  font-weight: 500;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  background: #ffffff;
  color: #0f172a;
  cursor: pointer;
  transition: all 0.15s ease;
}

.ct-btn:hover {
  border-color: #2563eb;
  color: #2563eb;
}

.ct-btn-primary {
  background: #2563eb;
  border-color: #2563eb;
  color: #ffffff;
}

.ct-btn-primary:hover {
  background: #1d4ed8;
  border-color: #1d4ed8;
}
`;
