// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT: T10LabelsFieldNew
// Purpose: Multi-select labels with CREATE NEW functionality and 15-color picker
// Prompt 8 of 9 Complete Rebuild
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Plus, X, Check } from 'lucide-react';
import { useT10Labels, useT10CreateLabel } from '../../hooks';
import { T10_LABEL_COLORS, type T10Label } from '../../types';

interface T10LabelsFieldNewProps {
  selectedLabels: T10Label[];
  onChange: (labelIds: string[]) => void;
}

export function T10LabelsFieldNew({
  selectedLabels,
  onChange,
}: T10LabelsFieldNewProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [newLabelName, setNewLabelName] = useState('');
  const [newLabelColor, setNewLabelColor] = useState<string>(T10_LABEL_COLORS[9].value); // Default blue
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { data: allLabels, isLoading } = useT10Labels();
  const createLabel = useT10CreateLabel();

  const selectedIds = selectedLabels.map((l) => l.id);

  // Calculate position when opening
  useEffect(() => {
    if (isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setPosition({
        top: rect.bottom + 4,
        left: rect.left,
        width: Math.max(rect.width, 360),
      });
    }
  }, [isOpen]);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
        setShowColorPicker(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleToggleLabel = (labelId: string) => {
    const newIds = selectedIds.includes(labelId)
      ? selectedIds.filter((id) => id !== labelId)
      : [...selectedIds, labelId];
    onChange(newIds);
    console.log('[T10] Label toggled:', labelId);
  };

  const handleRemoveLabel = (e: React.MouseEvent, labelId: string) => {
    e.stopPropagation();
    onChange(selectedIds.filter((id) => id !== labelId));
    console.log('[T10] Label removed:', labelId);
  };

  const handleCreateLabel = async () => {
    if (!newLabelName.trim()) return;

    try {
      const newLabel = await createLabel.mutateAsync({
        name: newLabelName.trim(),
        color: newLabelColor,
      });

      // Add the new label to selection
      onChange([...selectedIds, newLabel.id]);
      setNewLabelName('');
      console.log('[T10] New label created and selected:', newLabel.name);
    } catch (err) {
      console.error('[T10] Failed to create label:', err);
    }
  };

  const dropdown = isOpen && (
    <div
      ref={dropdownRef}
      style={{
        position: 'fixed',
        top: position.top,
        left: position.left,
        width: position.width,
        backgroundColor: '#ffffff',
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        boxShadow: '0 10px 25px -5px rgba(0,0,0,0.15), 0 4px 6px -2px rgba(0,0,0,0.08)',
        // Must be above the side panel overlay (z=100000) and panel (z=100001)
        zIndex: 100002,
        pointerEvents: 'auto',
        overflow: 'hidden',
        maxHeight: '360px',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Create New Section */}
      <div
        style={{
          padding: '12px',
          borderBottom: '1px solid #f3f4f6',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Color Picker Trigger */}
          <div style={{ position: 'relative' }}>
            <button
              type="button"
              onClick={() => setShowColorPicker(!showColorPicker)}
              style={{
                width: '36px',
                height: '36px',
                backgroundColor: newLabelColor,
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
              }}
            />

            {/* Color Picker Grid */}
            {showColorPicker && (
              <div
                onClick={(e) => e.stopPropagation()}
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 4px)',
                  left: 0,
                  backgroundColor: '#ffffff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  boxShadow: '0 10px 25px -5px rgba(0,0,0,0.15)',
                  padding: '8px',
                  zIndex: 200,
                }}
              >
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(5, 1fr)',
                    gap: '4px',
                  }}
                >
                  {T10_LABEL_COLORS.map((color) => (
                    <button
                      key={color.value}
                      type="button"
                      onClick={() => {
                        setNewLabelColor(color.value);
                        setShowColorPicker(false);
                      }}
                      title={color.name}
                      style={{
                        width: '28px',
                        height: '28px',
                        backgroundColor: color.value,
                        border:
                          newLabelColor === color.value
                            ? '2px solid #1f2937'
                            : '2px solid transparent',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        boxShadow:
                          newLabelColor === color.value
                            ? '0 0 0 2px #ffffff'
                            : 'none',
                      }}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          <input
            type="text"
            value={newLabelName}
            onChange={(e) => setNewLabelName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCreateLabel();
            }}
            placeholder="New label name..."
            style={{
              flex: 1,
              height: '36px',
              padding: '0 12px',
              fontSize: '14px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              outline: 'none',
            }}
          />

          <button
            type="button"
            onClick={handleCreateLabel}
            disabled={!newLabelName.trim() || createLabel.isPending}
            style={{
              height: '36px',
              padding: '0 12px',
              fontSize: '13px',
              fontWeight: 500,
              color: '#ffffff',
              backgroundColor: '#2563eb',
              border: 'none',
              borderRadius: '6px',
              cursor: !newLabelName.trim() ? 'not-allowed' : 'pointer',
              opacity: !newLabelName.trim() ? 0.5 : 1,
            }}
          >
            {createLabel.isPending ? '...' : 'Add'}
          </button>
        </div>
      </div>

      {/* Existing Labels */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
        {isLoading && (
          <div
            style={{
              padding: '20px',
              textAlign: 'center',
              color: '#9ca3af',
              fontSize: '14px',
            }}
          >
            Loading...
          </div>
        )}

        {!isLoading && allLabels && allLabels.length === 0 && (
          <div
            style={{
              padding: '20px',
              textAlign: 'center',
              color: '#9ca3af',
              fontSize: '14px',
            }}
          >
            No labels yet. Create one above!
          </div>
        )}

        {!isLoading &&
          allLabels?.map((label) => {
            const isSelected = selectedIds.includes(label.id);
            return (
              <button
                key={label.id}
                type="button"
                onClick={() => handleToggleLabel(label.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  width: '100%',
                  padding: '10px 12px',
                  marginBottom: '4px',
                  backgroundColor: isSelected ? '#eff6ff' : 'transparent',
                  border: isSelected ? '1px solid #bfdbfe' : '1px solid transparent',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  color: '#374151',
                }}
              >
                <div
                  style={{
                    width: '16px',
                    height: '16px',
                    border: isSelected
                      ? '2px solid #2563eb'
                      : '2px solid #d1d5db',
                    borderRadius: '4px',
                    backgroundColor: isSelected ? '#2563eb' : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {isSelected && <Check size={10} color="#ffffff" />}
                </div>
                <span
                  style={{
                    width: '12px',
                    height: '12px',
                    borderRadius: '3px',
                    backgroundColor: label.color,
                  }}
                />
                <span style={{ flex: 1, textAlign: 'left' }}>{label.name}</span>
              </button>
            );
          })}
      </div>
    </div>
  );

  return (
    <>
      <div ref={triggerRef} style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
        {/* Selected Labels */}
        {selectedLabels.map((label) => (
          <span
            key={label.id}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 10px',
              fontSize: '13px',
              fontWeight: 500,
              backgroundColor: `${label.color}20`,
              color: label.color,
              borderRadius: '9999px',
            }}
          >
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: label.color,
              }}
            />
            {label.name}
            <button
              type="button"
              onClick={(e) => handleRemoveLabel(e, label.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '16px',
                height: '16px',
                backgroundColor: 'transparent',
                border: 'none',
                borderRadius: '50%',
                color: 'inherit',
                opacity: 0.6,
                cursor: 'pointer',
                marginLeft: '2px',
              }}
            >
              <X size={10} />
            </button>
          </span>
        ))}

        {/* Add Button */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '6px 12px',
            fontSize: '13px',
            fontWeight: 500,
            color: '#6b7280',
            backgroundColor: '#f3f4f6',
            border: '1px dashed #d1d5db',
            borderRadius: '9999px',
            cursor: 'pointer',
          }}
        >
          <Plus size={14} />
          Add
        </button>
      </div>
      {createPortal(dropdown, document.body)}
    </>
  );
}

export default T10LabelsFieldNew;
