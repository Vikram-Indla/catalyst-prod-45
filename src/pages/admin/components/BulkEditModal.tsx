/**
 * BulkEditModal - Ring-fenced bulk edit modal for /admin/users
 * Per LOVABLE-USERS-INVASIVE-REPLACEMENT spec
 */

import { useState } from 'react';
import { X } from 'lucide-react';

// ID mappings
const DEPT_TO_ID: Record<string, string> = {
  'Delivery': 'D04', 'Product': 'D01', 'Operations': 'D05',
  'Governance': 'D03', 'Technical Support': 'D02'
};
const VENDOR_TO_ID: Record<string, string> = {
  'Thiqah': 'V04', 'BMC': 'V01', 'ELM': 'V02', 'Freelance': 'V03',
  'Permanent': 'V05', 'Spectech': 'V06', 'Nozom': 'V07'
};
const ASSIGN_TO_ID: Record<string, string> = {
  'Digital Transformation': 'A12', 'Senaei 3.0': 'A04', 'Senaei OPS': 'A02',
  'Senaei Mobile': 'A14', 'ICP': 'A10', 'Inspection Project': 'A07',
  'Tahommena 2.0': 'A08', 'IR Platform - Phase 2': 'A15',
  'Innovation Platform': 'A05', 'Data Platform': 'A09',
  'Sectorial Services': 'A03', 'MIM Website': 'A01', 'IS13': 'A13'
};

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
  const [values, setValues] = useState({
    department_id: '',
    assignment_id: '',
    vendor_id: '',
    resource_type: 'Variable',
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

  if (!isOpen) return null;

  return (
    <>
      <style>{bulkModalCSS}</style>
      <div className="um-modal-overlay visible">
        <div className="um-modal">
          <div className="um-modal-header">
            <h2>Bulk Edit {selectedCount} Users</h2>
            <button className="um-drawer-close" onClick={onClose}>
              <X size={18} />
            </button>
          </div>
          <div className="um-modal-body">
            <p className="um-modal-desc">
              Check the fields you want to update. Only checked fields will be changed.
            </p>
            <div className="um-bulk-field-list">
              {/* Department */}
              <div className="um-bulk-field">
                <input
                  type="checkbox"
                  checked={enabledFields.has('department_id')}
                  onChange={() => toggleField('department_id')}
                />
                <div className="um-bulk-field-content">
                  <label>Department</label>
                  <select
                    disabled={!enabledFields.has('department_id')}
                    value={values.department_id}
                    onChange={(e) => setValues({ ...values, department_id: e.target.value })}
                  >
                    <option value="">Select department</option>
                    {departments.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Assignment */}
              <div className="um-bulk-field">
                <input
                  type="checkbox"
                  checked={enabledFields.has('assignment_id')}
                  onChange={() => toggleField('assignment_id')}
                />
                <div className="um-bulk-field-content">
                  <label>Assignment</label>
                  <select
                    disabled={!enabledFields.has('assignment_id')}
                    value={values.assignment_id}
                    onChange={(e) => setValues({ ...values, assignment_id: e.target.value })}
                  >
                    <option value="">Select assignment</option>
                    {assignments.map(a => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Vendor */}
              <div className="um-bulk-field">
                <input
                  type="checkbox"
                  checked={enabledFields.has('vendor_id')}
                  onChange={() => toggleField('vendor_id')}
                />
                <div className="um-bulk-field-content">
                  <label>Vendor</label>
                  <select
                    disabled={!enabledFields.has('vendor_id')}
                    value={values.vendor_id}
                    onChange={(e) => setValues({ ...values, vendor_id: e.target.value })}
                  >
                    <option value="">Select vendor</option>
                    {vendors.map(v => (
                      <option key={v.id} value={v.id}>{v.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Resource Type */}
              <div className="um-bulk-field">
                <input
                  type="checkbox"
                  checked={enabledFields.has('resource_type')}
                  onChange={() => toggleField('resource_type')}
                />
                <div className="um-bulk-field-content">
                  <label>Resource Type</label>
                  <select
                    disabled={!enabledFields.has('resource_type')}
                    value={values.resource_type}
                    onChange={(e) => setValues({ ...values, resource_type: e.target.value })}
                  >
                    <option value="Variable">Variable</option>
                    <option value="Permanent">Permanent</option>
                    <option value="Fixed">Fixed</option>
                    <option value="Freelance">Freelance</option>
                  </select>
                </div>
              </div>

              {/* Location */}
              <div className="um-bulk-field">
                <input
                  type="checkbox"
                  checked={enabledFields.has('location_id')}
                  onChange={() => toggleField('location_id')}
                />
                <div className="um-bulk-field-content">
                  <label>Location</label>
                  <select
                    disabled={!enabledFields.has('location_id')}
                    value={values.location_id}
                    onChange={(e) => setValues({ ...values, location_id: e.target.value })}
                  >
                    <option value="">Select location</option>
                    {locations.map(l => (
                      <option key={l.id} value={l.id}>{l.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Country */}
              <div className="um-bulk-field">
                <input
                  type="checkbox"
                  checked={enabledFields.has('country_id')}
                  onChange={() => toggleField('country_id')}
                />
                <div className="um-bulk-field-content">
                  <label>Country</label>
                  <select
                    disabled={!enabledFields.has('country_id')}
                    value={values.country_id}
                    onChange={(e) => setValues({ ...values, country_id: e.target.value })}
                  >
                    <option value="">Select country</option>
                    {countries.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>
          <div className="um-modal-footer">
            <button className="um-btn" onClick={onClose}>Cancel</button>
            <button className="um-btn um-btn-primary" onClick={handleApply}>
              Apply Changes
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

const bulkModalCSS = `
/* Modal Overlay */
.um-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.5);
  backdrop-filter: blur(2px);
  z-index: 200;
  display: none;
  align-items: center;
  justify-content: center;
}
.um-modal-overlay.visible {
  display: flex;
}

/* Modal */
.um-modal {
  background: white;
  border-radius: 16px;
  width: 500px;
  max-width: 90vw;
  max-height: 85vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow: 0 25px 50px rgba(0,0,0,0.25);
}
.um-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid #e2e8f0;
}
.um-modal-header h2 {
  font-size: 18px;
  font-weight: 700;
  color: #0f172a;
  margin: 0;
}
.um-modal-body {
  padding: 24px;
  overflow-y: auto;
}
.um-modal-desc {
  font-size: 13px;
  color: #64748b;
  margin: 0 0 16px 0;
}
.um-modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 16px 24px;
  border-top: 1px solid #e2e8f0;
  background: #f8fafc;
}

/* Bulk Field */
.um-bulk-field-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.um-bulk-field {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px;
  background: #f8fafc;
  border-radius: 10px;
  border: 1px solid #f1f5f9;
}
.um-bulk-field input[type="checkbox"] {
  width: 18px;
  height: 18px;
  accent-color: #2563eb;
  cursor: pointer;
}
.um-bulk-field-content {
  flex: 1;
}
.um-bulk-field-content label {
  font-size: 13px;
  font-weight: 600;
  display: block;
  margin-bottom: 6px;
  color: #0f172a;
}
.um-bulk-field-content select {
  width: 100%;
  height: 36px;
  padding: 0 10px;
  font-size: 13px;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  background: white;
}
.um-bulk-field-content select:disabled {
  background: #f1f5f9;
  color: #94a3b8;
}

/* Button styles */
.um-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0 14px;
  height: 36px;
  font-size: 13px;
  font-weight: 500;
  border-radius: 6px;
  border: 1px solid #e2e8f0;
  background: white;
  color: #0f172a;
  cursor: pointer;
  transition: all 0.15s;
}
.um-btn:hover {
  border-color: #2563eb;
  color: #2563eb;
}
.um-btn-primary {
  background: #2563eb;
  border-color: #2563eb;
  color: white;
}
.um-btn-primary:hover {
  background: #1d4ed8;
}
.um-drawer-close {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: #f8fafc;
  cursor: pointer;
  border-radius: 8px;
  color: #94a3b8;
  transition: all 0.15s;
}
.um-drawer-close:hover {
  background: #f1f5f9;
  color: #0f172a;
}
`;
