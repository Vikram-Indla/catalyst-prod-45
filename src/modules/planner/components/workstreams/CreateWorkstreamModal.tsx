// ============================================================
// WORKSTREAMS V10 - Create Modal Component
// Uses resource_inventory for team selection (BUG #1 & #2 FIX)
// ============================================================

import '@/styles/workstreams.css';
import { useState, useMemo } from 'react';
import { X, Check, ChevronRight, Search } from 'lucide-react';
import { useCreateWorkstream, useAddWorkstreamMember } from '../../hooks/usePlannerWorkstreams';
import { useResourceInventory, Resource } from '../../hooks/useResourceInventory';
import { catalystToast } from '@/lib/catalystToast';

const WORKSTREAM_COLORS = [
  '#06b6d4', '#8b5cf6', '#6366f1', '#f97316', '#ec4899', 
  '#84cc16', '#14b8a6', '#2563eb', '#ef4444', '#10b981'
];

interface CreateWorkstreamModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateWorkstreamModal({ isOpen, onClose }: CreateWorkstreamModalProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState(WORKSTREAM_COLORS[0]);
  const [selectedLead, setSelectedLead] = useState<Resource | null>(null);
  const [selectedMembers, setSelectedMembers] = useState<Resource[]>([]);
  const [memberSearch, setMemberSearch] = useState('');
  const [leadSearch, setLeadSearch] = useState('');

  const { data: resources = [], isLoading: loadingResources } = useResourceInventory();
  const createWorkstream = useCreateWorkstream();
  const addMember = useAddWorkstreamMember();

  // Filter resources for member selection (exclude lead and already selected)
  const filteredResources = useMemo(() => {
    const selectedIds = new Set([
      selectedLead?.id,
      ...selectedMembers.map(m => m.id)
    ].filter(Boolean));
    
    return resources.filter(r => 
      !selectedIds.has(r.id) &&
      r.name.toLowerCase().includes(memberSearch.toLowerCase())
    );
  }, [resources, selectedLead, selectedMembers, memberSearch]);

  // Filter resources for lead selection
  const filteredLeadResources = useMemo(() => {
    return resources.filter(r =>
      r.profile_id && // Only show resources with profile_id (can be set as lead)
      r.name.toLowerCase().includes(leadSearch.toLowerCase())
    );
  }, [resources, leadSearch]);

  const handleNext = () => {
    if (!name.trim()) {
      catalystToast.error('Name required', 'Please enter a workstream name');
      return;
    }
    if (!code.trim()) {
      setCode(name.slice(0, 3).toUpperCase());
    }
    setStep(2);
  };

  const handleCreate = async () => {
    try {
      // FIX: Use resource_inventory.id for lead_id (FK constraint)
      const result = await createWorkstream.mutateAsync({
        name: name.trim(),
        description: description.trim() || undefined,
        color,
        leadId: selectedLead?.id || null, // Use resource_inventory.id, NOT profile_id!
        keyPrefix: code.trim() || undefined, // Pass key_prefix for task keys
      });

      // Add members (only those with profile_id)
      for (const member of selectedMembers) {
        if (member.profile_id) {
          await addMember.mutateAsync({
            workstreamId: result.id,
            userId: member.profile_id, // Use profile_id!
            role: 'member',
          });
        }
      }

      // Add lead as member with lead role
      if (selectedLead?.profile_id) {
        await addMember.mutateAsync({
          workstreamId: result.id,
          userId: selectedLead.profile_id,
          role: 'lead',
        });
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
    setColor(WORKSTREAM_COLORS[0]);
    setSelectedLead(null);
    setSelectedMembers([]);
    setMemberSearch('');
    setLeadSearch('');
    onClose();
  };

  const toggleMember = (resource: Resource) => {
    setSelectedMembers(prev => 
      prev.some(m => m.id === resource.id)
        ? prev.filter(m => m.id !== resource.id)
        : [...prev, resource]
    );
  };

  if (!isOpen) return null;

  return (
    <div className={`ws-modal-overlay ${isOpen ? 'open' : ''}`}>
      <div className="ws-modal">
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
        <div className="ws-modal-body">
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
                      key={c}
                      className="w-8 h-8 rounded-full flex items-center justify-center transition-transform hover:scale-110"
                      style={{ 
                        background: c,
                        boxShadow: color === c ? `0 0 0 2px white, 0 0 0 4px ${c}` : 'none'
                      }}
                      onClick={() => setColor(c)}
                    >
                      {color === c && <Check className="w-4 h-4 text-white" strokeWidth={3} />}
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
            <>
              {/* Lead Selection - BUG #2 FIX: Use resource_inventory */}
              <div className="ws-form-group">
                <label className="ws-form-label">Team Lead</label>
                {selectedLead ? (
                  <div 
                    className="flex items-center justify-between p-3 rounded-lg"
                    style={{ background: 'var(--ws-bg-secondary)', border: '1px solid var(--ws-border-primary)' }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="ws-avatar" style={{ background: color }}>
                        {selectedLead.initials}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, color: 'var(--ws-text-primary)' }}>
                          {selectedLead.name}
                        </div>
                        <div style={{ fontSize: '0.6875rem', color: 'var(--ws-text-tertiary)' }}>
                          {selectedLead.role} · {selectedLead.department || 'No dept'}
                        </div>
                      </div>
                    </div>
                    <button 
                      className="ws-btn ws-btn-ghost ws-btn-icon ws-btn-sm"
                      onClick={() => setSelectedLead(null)}
                    >
                      <X className="w-4 h-4" strokeWidth={2} />
                    </button>
                  </div>
                ) : (
                  <div>
                    {/* Search Lead */}
                    <div className="ws-search-input mb-2">
                      <Search className="ws-search-icon w-4 h-4" strokeWidth={2} />
                      <input
                        type="text"
                        placeholder="Search for team lead..."
                        value={leadSearch}
                        onChange={(e) => setLeadSearch(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {loadingResources ? (
                        <div style={{ fontSize: 'var(--ws-text-sm)', color: 'var(--ws-text-muted)', padding: '1rem', textAlign: 'center' }}>
                          Loading resources...
                        </div>
                      ) : filteredLeadResources.length === 0 ? (
                        <div style={{ fontSize: 'var(--ws-text-sm)', color: 'var(--ws-text-muted)', padding: '1rem', textAlign: 'center' }}>
                          No resources found with profile
                        </div>
                      ) : (
                        filteredLeadResources.slice(0, 8).map(resource => (
                          <button
                            key={resource.id}
                            className="w-full flex items-center justify-between gap-3 p-2 rounded-lg hover:bg-[var(--ws-bg-secondary)] transition-colors text-left"
                            onClick={() => setSelectedLead(resource)}
                          >
                            <div className="flex items-center gap-3">
                              <div className="ws-avatar ws-avatar-sm" style={{ background: color }}>
                                {resource.initials}
                              </div>
                              <div>
                                <span style={{ fontSize: 'var(--ws-text-base)', color: 'var(--ws-text-primary)' }}>
                                  {resource.name}
                                </span>
                                <div style={{ fontSize: '0.6875rem', color: 'var(--ws-text-tertiary)' }}>
                                  {resource.role}
                                </div>
                              </div>
                            </div>
                            {/* Capacity Bar */}
                            <div className="w-16">
                              <div className="ws-capacity-bar">
                                <div 
                                  className="ws-capacity-fill" 
                                  style={{ 
                                    width: `${resource.capacity}%`,
                                    background: resource.capacity > 80 ? 'var(--ws-warning)' : 'var(--ws-primary)'
                                  }} 
                                />
                              </div>
                              <div style={{ fontSize: '0.5rem', color: 'var(--ws-text-muted)', textAlign: 'right' }}>
                                {resource.capacity}%
                              </div>
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Members - BUG #2 FIX: Use resource_inventory */}
              <div className="ws-form-group">
                <div className="flex justify-between mb-2">
                  <label className="ws-form-label" style={{ marginBottom: 0 }}>
                    Team Members
                  </label>
                  <span style={{ fontSize: '0.6875rem', color: 'var(--ws-text-muted)' }}>
                    {selectedMembers.length} selected
                  </span>
                </div>

                {/* Selected Members */}
                {selectedMembers.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {selectedMembers.map(member => (
                      <div 
                        key={member.id}
                        className="flex items-center gap-2 px-2 py-1 rounded-full"
                        style={{ background: 'var(--ws-bg-tertiary)' }}
                      >
                        <div className="ws-avatar" style={{ width: 20, height: 20, fontSize: '0.5rem', background: color }}>
                          {member.initials}
                        </div>
                        <span style={{ fontSize: 'var(--ws-text-sm)', color: 'var(--ws-text-primary)' }}>
                          {member.name}
                        </span>
                        <button onClick={() => toggleMember(member)}>
                          <X className="w-3 h-3" style={{ color: 'var(--ws-text-muted)' }} strokeWidth={2} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Search */}
                <div className="ws-search-input mb-2">
                  <Search className="ws-search-icon w-4 h-4" strokeWidth={2} />
                  <input
                    type="text"
                    placeholder="Search team members..."
                    value={memberSearch}
                    onChange={(e) => setMemberSearch(e.target.value)}
                  />
                </div>

                {/* Available Resources */}
                <div className="space-y-1 mt-2 max-h-40 overflow-y-auto">
                  {loadingResources ? (
                    <div style={{ fontSize: 'var(--ws-text-sm)', color: 'var(--ws-text-muted)', padding: '1rem', textAlign: 'center' }}>
                      Loading resources...
                    </div>
                  ) : filteredResources.length === 0 ? (
                    <div style={{ fontSize: 'var(--ws-text-sm)', color: 'var(--ws-text-muted)', padding: '1rem', textAlign: 'center' }}>
                      No more resources available
                    </div>
                  ) : (
                    filteredResources.slice(0, 10).map(resource => (
                      <button
                        key={resource.id}
                        className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-[var(--ws-bg-secondary)] transition-colors text-left"
                        onClick={() => toggleMember(resource)}
                      >
                        <div className="flex items-center gap-3">
                          <div className="ws-avatar ws-avatar-sm" style={{ background: color }}>
                            {resource.initials}
                          </div>
                          <div>
                            <div style={{ fontSize: 'var(--ws-text-base)', color: 'var(--ws-text-primary)' }}>
                              {resource.name}
                            </div>
                            <div style={{ fontSize: '0.6875rem', color: 'var(--ws-text-tertiary)' }}>
                              {resource.role} · {resource.department || 'No dept'}
                            </div>
                          </div>
                        </div>
                        {/* Capacity Bar */}
                        <div className="w-16">
                          <div className="ws-capacity-bar">
                            <div 
                              className="ws-capacity-fill" 
                              style={{ 
                                width: `${resource.capacity}%`,
                                background: resource.capacity > 80 ? 'var(--ws-warning)' : 'var(--ws-primary)'
                              }} 
                            />
                          </div>
                          <div style={{ fontSize: '0.5rem', color: 'var(--ws-text-muted)', textAlign: 'right' }}>
                            {resource.capacity}%
                          </div>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="ws-modal-footer">
          {step === 1 ? (
            <>
              <button className="ws-btn ws-btn-secondary" onClick={resetAndClose}>
                Cancel
              </button>
              <button className="ws-btn ws-btn-primary" onClick={handleNext}>
                Next
                <ChevronRight className="w-4 h-4" strokeWidth={2} />
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
