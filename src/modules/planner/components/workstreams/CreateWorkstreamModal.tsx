// ============================================================
// WORKSTREAMS V11 - Create Modal with Crown Toggle Lead Selection
// Uses resource_inventory table, single list with crown toggle for lead
// ============================================================

import '@/styles/workstreams.css';
import { useState, useMemo } from 'react';
import { useProfileAvatars } from '@/hooks/useProfileAvatars';
import { X, Check, ChevronRight, Search, Crown, Info, Users } from 'lucide-react';
import { useCreateWorkstream, useAddWorkstreamMember } from '../../hooks/usePlannerWorkstreams';
import { useResourceInventory, Resource } from '../../hooks/useResourceInventory';
import { catalystToast } from '@/lib/catalystToast';
import { cn } from '@/lib/utils';

const WORKSTREAM_COLORS = [
  { name: 'Cyan', value: '#06b6d4' },
  { name: 'Purple', value: '#8b5cf6' },
  { name: 'Indigo', value: '#6366f1' },
  { name: 'Orange', value: '#f97316' },
  { name: 'Pink', value: '#ec4899' },
  { name: 'Lime', value: '#84cc16' },
  { name: 'Teal', value: '#14b8a6' },
  { name: 'Blue', value: 'var(--ds-text-brand, #2563eb)' },
  { name: 'Red', value: 'var(--ds-text-danger, #ef4444)' },
  { name: 'Emerald', value: '#10b981' },
];

interface CreateWorkstreamModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateWorkstreamModal({ isOpen, onClose }: CreateWorkstreamModalProps) {
  // Form state
  const [step, setStep] = useState<1 | 2>(1);
  const profileAvatars = useProfileAvatars();
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState(WORKSTREAM_COLORS[0].value);
  
  // Team selection state - unified with crown toggle
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [leadId, setLeadId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Hooks
  const { data: resources = [], isLoading: loadingResources } = useResourceInventory();
  const createWorkstream = useCreateWorkstream();
  const addMember = useAddWorkstreamMember();

  // Filter resources by search term
  const filteredResources = useMemo(() => {
    if (!searchTerm.trim()) return resources;
    const term = searchTerm.toLowerCase();
    return resources.filter(r =>
      r.name.toLowerCase().includes(term) ||
      r.role?.toLowerCase().includes(term) ||
      r.department?.toLowerCase().includes(term)
    );
  }, [resources, searchTerm]);

  // Get selected resources sorted (lead first)
  const selectedResources = useMemo(() => {
    return resources
      .filter(r => selectedIds.has(r.id))
      .sort((a, b) => {
        if (a.id === leadId) return -1;
        if (b.id === leadId) return 1;
        return a.name.localeCompare(b.name);
      });
  }, [resources, selectedIds, leadId]);

  // Get avatar color based on name hash
  const getAvatarColor = (name: string) => {
    const colors = [
      'var(--ds-text-brand, #3b82f6)', '#8b5cf6', '#ec4899',
      '#f97316', '#14b8a6', 'var(--ds-text-success, #22c55e)'
    ];
    const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };

  // Toggle resource selection
  const toggleResource = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
      if (leadId === id) setLeadId(null);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  // Toggle lead status
  const toggleLead = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (leadId === id) {
      setLeadId(null);
    } else {
      // Ensure resource is selected when making lead
      if (!selectedIds.has(id)) {
        setSelectedIds(new Set([...selectedIds, id]));
      }
      setLeadId(id);
    }
  };

  // Remove from selection
  const removeResource = (id: string) => {
    const newSelected = new Set(selectedIds);
    newSelected.delete(id);
    if (leadId === id) setLeadId(null);
    setSelectedIds(newSelected);
  };

  const handleNext = () => {
    if (!name.trim()) {
      catalystToast.error('Name required', 'Please enter a workstream name');
      return;
    }
    if (!code.trim()) {
      setCode(name.replace(/[^A-Za-z0-9]/g, '').slice(0, 3).toUpperCase());
    }
    setStep(2);
  };

  const handleCreate = async () => {
    try {
      // Find lead resource if exists
      const leadResource = leadId ? resources.find(r => r.id === leadId) : null;

      // Create workstream
      const result = await createWorkstream.mutateAsync({
        name: name.trim(),
        description: description.trim() || undefined,
        color,
        leadId: leadResource?.id || null, // Use resource_inventory.id
        keyPrefix: code.trim() || undefined,
      });

      // Add all selected members with is_lead flag
      for (const resourceId of selectedIds) {
        const resource = resources.find(r => r.id === resourceId);
        if (resource?.profile_id) {
          await addMember.mutateAsync({
            workstreamId: result.id,
            userId: resource.profile_id,
            role: resourceId === leadId ? 'lead' : 'member',
          });
        }
      }

      catalystToast.success('Workstream Created', `"${name}" has been created successfully`);
      resetAndClose();
    } catch (error: any) {
      catalystToast.error('Creation Failed', error.message || 'Could not create workstream');
    }
  };

  const resetAndClose = () => {
    setStep(1);
    setName('');
    setCode('');
    setDescription('');
    setColor(WORKSTREAM_COLORS[0].value);
    setSelectedIds(new Set());
    setLeadId(null);
    setSearchTerm('');
    onClose();
  };

  // Validation
  const isBasicsValid = name.trim().length > 0;

  if (!isOpen) return null;

  return (
    <div className={`ws-modal-overlay ${isOpen ? 'open' : ''}`}>
      <div className="ws-modal" style={{ maxWidth: '520px' }}>
        {/* Header */}
        <div className="ws-modal-header">
          <div>
            <div className="ws-modal-title">Create Workstream</div>
            <div className="ws-modal-subtitle">
              {step === 1 ? 'Set up the basics' : 'Add your team'}
            </div>
          </div>
          <button className="ws-btn ws-btn-ghost ws-btn-icon ws-btn-sm" onClick={resetAndClose}>
            <X className="w-4 h-4" strokeWidth={2} />
          </button>
        </div>

        {/* Stepper */}
        <div className="ws-stepper" style={{ padding: '1rem 1.25rem 0' }}>
          <div className="ws-stepper-step">
            <div className={`ws-stepper-circle ${step >= 1 ? 'active' : 'pending'}`}>
              {step > 1 ? <Check className="w-4 h-4" strokeWidth={2} /> : '1'}
            </div>
            <span className="ws-stepper-label">Basics</span>
          </div>
          <div className={`ws-stepper-line ${step > 1 ? 'completed' : ''}`} />
          <div className="ws-stepper-step">
            <div className={`ws-stepper-circle ${step === 2 ? 'active' : 'pending'}`}>
              2
            </div>
            <span className="ws-stepper-label">Team</span>
          </div>
        </div>

        {/* Body */}
        <div className="ws-modal-body" style={{ padding: '1.25rem', maxHeight: '420px', overflowY: 'auto' }}>
          {step === 1 && (
            <>
              {/* Name */}
              <div className="ws-form-group">
                <label className="ws-form-label">
                  Name <span className="required">*</span>
                </label>
                <input
                  type="text"
                  className="ws-form-input"
                  placeholder="e.g., Platform Development"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoFocus
                />
              </div>

              {/* Code (Key Prefix) */}
              <div className="ws-form-group">
                <label className="ws-form-label">
                  Task Key Prefix
                </label>
                <input
                  type="text"
                  className="ws-form-input"
                  placeholder="e.g., CAT"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5))}
                  maxLength={5}
                />
                <div className="ws-form-hint">
                  Tasks will be created as {code || name.replace(/[^A-Za-z0-9]/g, '').slice(0, 3).toUpperCase() || 'XXX'}-1, {code || name.replace(/[^A-Za-z0-9]/g, '').slice(0, 3).toUpperCase() || 'XXX'}-2, etc.
                </div>
              </div>

              {/* Color */}
              <div className="ws-form-group">
                <label className="ws-form-label">Color</label>
                <div className="flex gap-2 flex-wrap">
                  {WORKSTREAM_COLORS.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center transition-transform hover:scale-110"
                      )}
                      style={{ 
                        background: c.value,
                        boxShadow: color === c.value ? `0 0 0 2px white, 0 0 0 4px ${c.value}` : 'none'
                      }}
                      onClick={() => setColor(c.value)}
                      title={c.name}
                    >
                      {color === c.value && <Check className="w-4 h-4 text-white" strokeWidth={3} />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Description */}
              <div className="ws-form-group">
                <label className="ws-form-label">Description</label>
                <textarea
                  className="ws-form-input"
                  style={{ height: '80px', resize: 'none' }}
                  placeholder="What is this workstream about?"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
            </>
          )}

          {step === 2 && (
            <div className="space-y-4">
              {/* Help Text */}
              <div className="flex items-start gap-2 p-3 rounded-lg" style={{ background: 'var(--ds-background-selected, #eff6ff)', border: '1px solid #dbeafe' }}>
                <Info className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: 'var(--ds-text-brand, #3b82f6)' }} />
                <p className="text-xs leading-relaxed" style={{ color: '#4b5563' }}>
                  Select team members from resource inventory. Click the{' '}
                  <Crown className="w-3 h-3 inline" style={{ color: 'var(--ds-text-warning, #f59e0b)' }} /> icon to designate a{' '}
                  <strong style={{ color: '#1f2937' }}>Team Lead</strong>.
                </p>
              </div>

              {/* Section Header */}
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium" style={{ color: '#374151' }}>Team Members</span>
                <span className="text-xs" style={{ color: '#6b7280' }}>
                  <strong style={{ color: 'var(--ds-text-brand, #3b82f6)' }}>{selectedIds.size}</strong> selected
                </span>
              </div>

              {/* Search */}
              <div className="ws-search-input">
                <Search className="ws-search-icon w-4 h-4" strokeWidth={2} />
                <input
                  type="text"
                  placeholder="Search by name, role, or department..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              {/* Resource List */}
              <div 
                className="rounded-lg overflow-hidden"
                style={{ border: '1px solid #e5e7eb', maxHeight: '240px', overflowY: 'auto' }}
              >
                {loadingResources ? (
                  <div className="p-8 text-center" style={{ color: '#9ca3af' }}>
                    <div 
                      className="w-6 h-6 mx-auto mb-2 rounded-full animate-spin"
                      style={{ border: '2px solid #e5e7eb', borderTopColor: 'var(--ds-text-brand, #3b82f6)' }} 
                    />
                    <p className="text-sm">Loading resources...</p>
                  </div>
                ) : filteredResources.length === 0 ? (
                  <div className="p-8 text-center" style={{ color: '#9ca3af' }}>
                    <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">
                      {searchTerm ? `No resources found for "${searchTerm}"` : 'No resources available'}
                    </p>
                  </div>
                ) : (
                  filteredResources.map((resource) => {
                    const isSelected = selectedIds.has(resource.id);
                    const isLead = leadId === resource.id;

                    return (
                      <div
                        key={resource.id}
                        onClick={() => toggleResource(resource.id)}
                        className={cn(
                          "flex items-center gap-3 px-3 py-3 cursor-pointer transition-colors",
                          isSelected ? "bg-blue-50" : "hover:bg-gray-50"
                        )}
                        style={{ borderBottom: '1px solid #f3f4f6' }}
                      >
                        {/* Checkbox */}
                        <div 
                          className={cn(
                            "w-5 h-5 rounded flex items-center justify-center flex-shrink-0 transition-colors",
                            isSelected ? "bg-primary" : ""
                          )}
                          style={{ 
                            border: isSelected ? 'none' : '2px solid #d1d5db',
                            background: isSelected ? 'var(--ds-text-brand, #3b82f6)' : 'white'
                          }}
                        >
                          {isSelected && <Check className="w-3 h-3 text-white" />}
                        </div>

                        {/* Avatar */}
                        {(() => {
                          const avatarUrl = resource.profile_id ? profileAvatars.get(resource.profile_id) : undefined;
                          return avatarUrl ? (
                            <img src={avatarUrl} alt={resource.name} className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
                          ) : (
                            <div 
                              className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold text-white flex-shrink-0"
                              style={{ background: getAvatarColor(resource.name) }}
                            >
                              {resource.initials}
                            </div>
                          );
                        })()}

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium truncate" style={{ color: '#111827' }}>
                              {resource.name}
                            </span>
                            {isLead && (
                              <span 
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded uppercase"
                                style={{ 
                                  background: 'var(--ds-text-warning, #f59e0b)', 
                                  color: 'white', 
                                  fontSize: '10px', 
                                  fontWeight: 600 
                                }}
                              >
                                <Crown className="w-2.5 h-2.5" />
                                Lead
                              </span>
                            )}
                            {!resource.email && (
                              <span 
                                className="px-1.5 py-0.5 rounded uppercase"
                                style={{ 
                                  background: '#f3f4f6', 
                                  color: '#6b7280', 
                                  fontSize: '9px', 
                                  fontWeight: 500 
                                }}
                              >
                                No Email
                              </span>
                            )}
                          </div>
                          <p className="text-xs truncate" style={{ color: '#6b7280' }}>
                            {resource.role || 'No role'} · {resource.department || 'No dept'}
                          </p>
                        </div>

                        {/* Allocation */}
                        <div className="flex flex-col items-end gap-1 flex-shrink-0">
                          <div 
                            className="w-12 h-1 rounded-full overflow-hidden"
                            style={{ background: 'var(--ds-border, #e5e7eb)' }}
                          >
                            <div
                              className="h-full rounded-full"
                              style={{ 
                                width: `${resource.capacity}%`,
                                background: resource.capacity > 80 ? 'var(--ds-text-warning, #f59e0b)' : 'var(--ds-text-brand, #3b82f6)'
                              }}
                            />
                          </div>
                          <span style={{ fontSize: '10px', color: '#9ca3af' }}>
                            {resource.capacity}%
                          </span>
                        </div>

                        {/* Lead Toggle */}
                        {isSelected && (
                          <button
                            onClick={(e) => toggleLead(resource.id, e)}
                            className={cn(
                              "w-7 h-7 flex items-center justify-center rounded-md transition-colors flex-shrink-0"
                            )}
                            style={{
                              background: isLead ? 'var(--ds-text-warning, #f59e0b)' : 'white',
                              border: isLead ? '1px solid #f59e0b' : '1px solid #e5e7eb',
                              color: isLead ? 'white' : '#9ca3af'
                            }}
                            title={isLead ? 'Remove as Lead' : 'Set as Lead'}
                          >
                            <Crown className="w-4 h-4" fill={isLead ? 'currentColor' : 'none'} />
                          </button>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Selected Preview */}
              {selectedResources.length > 0 && (
                <div 
                  className="p-3 rounded-lg"
                  style={{ background: '#f9fafb', border: '1px solid #e5e7eb' }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span 
                      className="text-xs font-semibold uppercase tracking-wide"
                      style={{ color: '#6b7280' }}
                    >
                      Selected Team
                    </span>
                    <span className="text-xs" style={{ color: '#6b7280' }}>
                      {selectedResources.length} member{selectedResources.length > 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedResources.map((resource) => {
                      const isLead = resource.id === leadId;
                      return (
                        <div
                          key={resource.id}
                          className="inline-flex items-center gap-1.5 pl-1 pr-2 py-1 rounded-full text-xs font-medium"
                          style={{
                            background: isLead ? '#fef3c7' : 'white',
                            border: isLead ? '1px solid #fcd34d' : '1px solid #e5e7eb'
                          }}
                        >
                          {(() => {
                            const avatarUrl = resource.profile_id ? profileAvatars.get(resource.profile_id) : undefined;
                            return avatarUrl ? (
                              <img src={avatarUrl} alt={resource.name} className="w-5 h-5 rounded-full object-cover" />
                            ) : (
                              <div 
                                className="w-5 h-5 rounded-full flex items-center justify-center text-white"
                                style={{ 
                                  background: getAvatarColor(resource.name),
                                  fontSize: '9px',
                                  fontWeight: 600
                                }}
                              >
                                {resource.initials}
                              </div>
                            );
                          })()}
                          {isLead && <Crown className="w-3 h-3" style={{ color: 'var(--ds-text-warning, #f59e0b)' }} />}
                          <span style={{ color: '#374151' }}>{resource.name.split(' ')[0]}</span>
                          <button
                            onClick={() => removeResource(resource.id)}
                            className="w-4 h-4 flex items-center justify-center rounded-full transition-colors"
                            style={{ background: 'var(--ds-border, #e5e7eb)', color: '#6b7280' }}
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div 
          className="flex items-center justify-end gap-3"
          style={{ 
            padding: '1rem 1.25rem', 
            borderTop: '1px solid #f3f4f6', 
            background: '#f9fafb' 
          }}
        >
          {step === 1 ? (
            <>
              <button className="ws-btn ws-btn-secondary" onClick={resetAndClose}>
                Cancel
              </button>
              <button 
                className="ws-btn ws-btn-primary" 
                onClick={handleNext} 
                disabled={!isBasicsValid}
                style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}
              >
                Next <ChevronRight className="w-4 h-4" />
              </button>
            </>
          ) : (
            <>
              <button className="ws-btn ws-btn-secondary" onClick={() => setStep(1)}>
                Back
              </button>
              <button
                className="ws-btn ws-btn-primary"
                onClick={handleCreate}
                disabled={createWorkstream.isPending}
              >
                {createWorkstream.isPending ? 'Creating...' : 'Create Workstream'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default CreateWorkstreamModal;
