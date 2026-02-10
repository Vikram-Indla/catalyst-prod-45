import { useState, useRef, useEffect } from 'react';
import { GripVertical, Paperclip, Copy, ArrowUp, Trash2, Plus, ChevronDown, Library, X } from 'lucide-react';
import { SharedStepsModal } from './SharedStepsModal';
import { toast } from 'sonner';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

export interface StepAttachment {
  id?: string;
  file?: File;
  name: string;
  size: number;
  type: string;
  url?: string;
  uploading?: boolean;
}

export interface Step {
  id: string;
  action: string;
  expectedResult: string;
  sharedStepId?: string;
  attachments?: StepAttachment[];
}

interface StepsEditorProps {
  steps: Step[];
  onChange: (steps: Step[]) => void;
}

// Sortable Step Row Component
function SortableStepRow({
  step, index, stepsCount, onUpdate, onClone, onInsertAbove, onDelete, onAttach, onRemoveAttachment,
}: {
  step: Step; index: number; stepsCount: number;
  onUpdate: (field: 'action' | 'expectedResult', value: string) => void;
  onClone: () => void; onInsertAbove: () => void; onDelete: () => void; onAttach: () => void;
  onRemoveAttachment: (attIndex: number) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: step.id });

  const rowStyle: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1000 : undefined,
    display: 'flex',
    borderBottom: '1px solid #E2E8F0',
    backgroundColor: step.sharedStepId ? '#FEFCE8' : '#FFFFFF',
    position: 'relative',
  };

  return (
    <div ref={setNodeRef} style={rowStyle} {...attributes}>
      {/* Drag Handle */}
      <div {...listeners} style={{
        width: 40, display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        paddingTop: 20, borderRight: '1px solid #E2E8F0',
        cursor: isDragging ? 'grabbing' : 'grab', color: '#CBD5E1', transition: 'color 0.15s',
      }}
        onMouseEnter={(e) => e.currentTarget.style.color = '#94A3B8'}
        onMouseLeave={(e) => e.currentTarget.style.color = '#CBD5E1'}
      >
        <GripVertical style={{ width: 16, height: 16 }} />
      </div>

      {/* Number Badge */}
      <div style={{ width: 56, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: 20 }}>
        <div style={{
          width: 32, height: 32, borderRadius: '50%',
          backgroundColor: step.sharedStepId ? '#CA8A04' : '#2563EB',
          color: '#FFFFFF', fontSize: 13, fontWeight: 600,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>{index + 1}</div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, padding: 16, minWidth: 0 }}>
        {step.sharedStepId && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            <Library style={{ width: 12, height: 12, color: '#CA8A04' }} />
            <span style={{ fontSize: 11, fontWeight: 600, color: '#CA8A04', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Shared Step</span>
          </div>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748B', marginBottom: 6 }}>Action</label>
            <textarea value={step.action} onChange={(e) => onUpdate('action', e.target.value)} placeholder="Describe the action to perform..."
              style={{ width: '100%', minHeight: 80, padding: '10px 12px', fontSize: 14, fontFamily: 'Inter, sans-serif', color: '#0F172A', backgroundColor: '#FFFFFF', border: '1.5px solid #E2E8F0', borderRadius: 8, resize: 'vertical', outline: 'none', transition: 'border-color 0.15s, box-shadow 0.15s' }}
              onFocus={(e) => { e.target.style.borderColor = '#2563EB'; e.target.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.12)'; }}
              onBlur={(e) => { e.target.style.borderColor = '#E2E8F0'; e.target.style.boxShadow = 'none'; }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748B', marginBottom: 6 }}>Expected Result</label>
            <textarea value={step.expectedResult} onChange={(e) => onUpdate('expectedResult', e.target.value)} placeholder="Describe the expected outcome..."
              style={{ width: '100%', minHeight: 80, padding: '10px 12px', fontSize: 14, fontFamily: 'Inter, sans-serif', color: '#0F172A', backgroundColor: '#FFFFFF', border: '1.5px solid #E2E8F0', borderRadius: 8, resize: 'vertical', outline: 'none', transition: 'border-color 0.15s, box-shadow 0.15s' }}
              onFocus={(e) => { e.target.style.borderColor = '#2563EB'; e.target.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.12)'; }}
              onBlur={(e) => { e.target.style.borderColor = '#E2E8F0'; e.target.style.boxShadow = 'none'; }}
            />
          </div>
        </div>
        {step.attachments && step.attachments.length > 0 && (
          <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {step.attachments.map((att, attIndex) => (
              <div key={attIndex} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 8px', backgroundColor: '#F1F5F9', borderRadius: 6, fontSize: 12 }}>
                <Paperclip size={12} style={{ color: '#64748B' }} />
                <span style={{ color: '#334155', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{att.name}</span>
                <span style={{ color: '#94A3B8' }}>({Math.round(att.size / 1024)}KB)</span>
                <button type="button" onClick={() => onRemoveAttachment(attIndex)} style={{ padding: 2, border: 'none', background: 'none', color: '#94A3B8', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 4 }}
                  onMouseEnter={(e) => e.currentTarget.style.color = '#DC2626'} onMouseLeave={(e) => e.currentTarget.style.color = '#94A3B8'}
                ><X size={14} /></button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Actions Column */}
      <div style={{ width: 80, borderLeft: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', paddingTop: 16, gap: 4 }}>
        <AttachButton onClick={onAttach} count={step.attachments?.length || 0} />
        <ActionButton icon={Copy} title="Clone step" onClick={onClone} />
        <ActionButton icon={ArrowUp} title="Insert above" onClick={onInsertAbove} />
        <ActionButton icon={Trash2} title="Delete step" onClick={onDelete} danger disabled={stepsCount === 1} />
      </div>
    </div>
  );
}

export function StepsEditor({ steps, onChange }: StepsEditorProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [sharedStepsModalOpen, setSharedStepsModalOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = steps.findIndex(s => s.id === active.id);
      const newIndex = steps.findIndex(s => s.id === over.id);
      onChange(arrayMove(steps, oldIndex, newIndex));
    }
  };

  const addStep = () => {
    onChange([...steps, { id: `step-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`, action: '', expectedResult: '', attachments: [] }]);
    setDropdownOpen(false);
  };

  const insertSharedStep = (step: { action: string; expectedResult: string; sharedStepId: string }) => {
    onChange([...steps, { id: Date.now().toString(), action: step.action, expectedResult: step.expectedResult, sharedStepId: step.sharedStepId, attachments: [] }]);
  };

  const updateStep = (id: string, field: 'action' | 'expectedResult', value: string) => {
    onChange(steps.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  const deleteStep = (id: string) => {
    if (steps.length > 1) {
      onChange(steps.filter(s => s.id !== id));
      toast.success('Step deleted');
    } else {
      toast.error('At least one step is required');
    }
  };

  const handleAttachFile = (stepId: string) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.accept = 'image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv';
    
    input.onchange = async (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (!files || files.length === 0) return;
      
      const newAttachments: StepAttachment[] = [];
      
      for (const file of Array.from(files)) {
        // Validate file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
          toast.error(`${file.name} is too large (max 10MB)`);
          continue;
        }
        
        newAttachments.push({
          file,
          name: file.name,
          size: file.size,
          type: file.type,
          uploading: false,
        });
      }
      
      if (newAttachments.length === 0) return;
      
      // Add to step's attachments
      onChange(steps.map(step => {
        if (step.id === stepId) {
          return {
            ...step,
            attachments: [...(step.attachments || []), ...newAttachments],
          };
        }
        return step;
      }));
      
      toast.success(`${newAttachments.length} file(s) attached`);
    };
    
    input.click();
  };

  const handleRemoveAttachment = (stepId: string, attachmentIndex: number) => {
    onChange(steps.map(step => {
      if (step.id === stepId) {
        return {
          ...step,
          attachments: (step.attachments || []).filter((_, j) => j !== attachmentIndex),
        };
      }
      return step;
    }));
    toast.success('Attachment removed');
  };

  const cloneStep = (id: string) => {
    const index = steps.findIndex(s => s.id === id);
    if (index !== -1) {
      const step = steps[index];
      const newStep = { id: Date.now().toString(), action: step.action, expectedResult: step.expectedResult, attachments: [] };
      const newSteps = [...steps];
      newSteps.splice(index + 1, 0, newStep);
      onChange(newSteps);
      toast.success('Step cloned');
    }
  };

  const insertAbove = (id: string) => {
    const index = steps.findIndex(s => s.id === id);
    if (index !== -1) {
      const newStep = { id: Date.now().toString(), action: '', expectedResult: '', attachments: [] };
      const newSteps = [...steps];
      newSteps.splice(index, 0, newStep);
      onChange(newSteps);
    }
  };

  return (
    <>
      <div style={{
        border: '1px solid #E2E8F0',
        borderRadius: 8,
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          height: 48,
          padding: '0 16px',
          backgroundColor: '#F8FAFC',
          borderBottom: '1px solid #E2E8F0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: '#0F172A' }}>Steps</span>
          <span style={{ fontSize: 13, color: '#64748B' }}>{steps.length} step(s)</span>
        </div>

        {/* Steps List */}
        <div style={{ maxHeight: 400, overflowY: 'auto' }}>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={steps.map(s => s.id)} strategy={verticalListSortingStrategy}>
              {steps.map((step, index) => (
                <SortableStepRow
                  key={step.id}
                  step={step}
                  index={index}
                  stepsCount={steps.length}
                  onUpdate={(field, value) => updateStep(step.id, field, value)}
                  onClone={() => cloneStep(step.id)}
                  onInsertAbove={() => insertAbove(step.id)}
                  onDelete={() => deleteStep(step.id)}
                  onAttach={() => handleAttachFile(step.id)}
                  onRemoveAttachment={(attIndex) => handleRemoveAttachment(step.id, attIndex)}
                />
              ))}
            </SortableContext>
          </DndContext>
        </div>

        {/* Add Step with Dropdown */}
        <div style={{ padding: 16, borderTop: '1px solid #E2E8F0' }}>
          <div ref={dropdownRef} style={{ position: 'relative' }}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              style={{
                width: '100%',
                height: 48,
                padding: 0,
                backgroundColor: 'transparent',
                border: '2px dashed #E2E8F0',
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 500,
                color: '#64748B',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                transition: 'all 0.15s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#2563EB';
                e.currentTarget.style.color = '#2563EB';
                e.currentTarget.style.backgroundColor = 'rgba(37,99,235,0.04)';
              }}
              onMouseLeave={(e) => {
                if (!dropdownOpen) {
                  e.currentTarget.style.borderColor = '#E2E8F0';
                  e.currentTarget.style.color = '#64748B';
                  e.currentTarget.style.backgroundColor = 'transparent';
                }
              }}
            >
              <Plus style={{ width: 18, height: 18 }} />
              Add Step
              <ChevronDown style={{ width: 14, height: 14 }} />
            </button>

            {dropdownOpen && (
              <div
                style={{
                  position: 'absolute',
                  bottom: '100%',
                  left: 0,
                  right: 0,
                  marginBottom: 4,
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  borderRadius: 8,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                  overflow: 'hidden',
                  zIndex: 10,
                }}
              >
                <button
                  onClick={addStep}
                  style={{
                    width: '100%',
                    height: 44,
                    padding: '0 16px',
                    backgroundColor: 'transparent',
                    border: 'none',
                    fontSize: 14,
                    color: '#0F172A',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    textAlign: 'left',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F8FAFC')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <Plus style={{ width: 16, height: 16, color: '#64748B' }} />
                  Add New Step
                </button>
                <button
                  onClick={() => { setSharedStepsModalOpen(true); setDropdownOpen(false); }}
                  style={{
                    width: '100%',
                    height: 44,
                    padding: '0 16px',
                    backgroundColor: 'transparent',
                    border: 'none',
                    borderTop: '1px solid #E2E8F0',
                    fontSize: 14,
                    color: '#0F172A',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    textAlign: 'left',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F8FAFC')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <Library style={{ width: 16, height: 16, color: '#64748B' }} />
                  Insert Shared Step
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <SharedStepsModal
        isOpen={sharedStepsModalOpen}
        onClose={() => setSharedStepsModalOpen(false)}
        onInsert={insertSharedStep}
      />
    </>
  );
}

function AttachButton({ onClick, count }: { onClick: () => void; count: number }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title="Attach file"
      style={{
        width: 32,
        height: 32,
        padding: 0,
        border: '1px solid #E2E8F0',
        borderRadius: 6,
        backgroundColor: count > 0 ? '#EFF6FF' : '#FFFFFF',
        color: count > 0 ? '#2563EB' : '#94A3B8',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        transition: 'all 0.15s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = count > 0 ? '#DBEAFE' : '#F8FAFC';
        e.currentTarget.style.borderColor = count > 0 ? '#93C5FD' : '#CBD5E1';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = count > 0 ? '#EFF6FF' : '#FFFFFF';
        e.currentTarget.style.borderColor = '#E2E8F0';
      }}
    >
      <Paperclip size={14} />
      {count > 0 && (
        <span style={{
          position: 'absolute',
          top: -4,
          right: -4,
          width: 16,
          height: 16,
          borderRadius: '50%',
          backgroundColor: '#2563EB',
          color: '#FFFFFF',
          fontSize: 10,
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          {count}
        </span>
      )}
    </button>
  );
}

function ActionButton({ 
  icon: Icon, 
  title, 
  onClick, 
  danger = false,
  disabled = false,
}: { 
  icon: any; 
  title: string; 
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={{
        width: 32,
        height: 32,
        padding: 0,
        backgroundColor: '#FFFFFF',
        border: '1px solid #E2E8F0',
        borderRadius: 6,
        color: '#94A3B8',
        cursor: disabled ? 'not-allowed' : 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: disabled ? 0.5 : 1,
        transition: 'all 0.15s',
      }}
      onMouseEnter={(e) => {
        if (!disabled) {
          if (danger) {
            e.currentTarget.style.backgroundColor = '#FEF2F2';
            e.currentTarget.style.borderColor = '#FECACA';
            e.currentTarget.style.color = '#DC2626';
          } else {
            e.currentTarget.style.backgroundColor = '#F8FAFC';
            e.currentTarget.style.borderColor = '#CBD5E1';
            e.currentTarget.style.color = '#475569';
          }
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = '#FFFFFF';
        e.currentTarget.style.borderColor = '#E2E8F0';
        e.currentTarget.style.color = '#94A3B8';
      }}
    >
      <Icon style={{ width: 14, height: 14 }} />
    </button>
  );
}

export default StepsEditor;
