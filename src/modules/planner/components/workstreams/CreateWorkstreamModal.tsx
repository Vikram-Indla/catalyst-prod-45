// ============================================================
// WORKSTREAMS V10 - Create Modal Component
// ============================================================

import '@/styles/workstreams.css';
import { useState } from 'react';
import { X, Check, ChevronRight, UserPlus, Trash2 } from 'lucide-react';
import { useCreateWorkstream, useAddWorkstreamMember } from '../../hooks/usePlannerWorkstreams';
import { usePlannerUsers } from '../../hooks/usePlannerUsers';
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
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [memberSearch, setMemberSearch] = useState('');

  const { data: users = [] } = usePlannerUsers();
  const createWorkstream = useCreateWorkstream();
  const addMember = useAddWorkstreamMember();

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(memberSearch.toLowerCase()) &&
    !selectedMemberIds.includes(u.id) &&
    u.id !== selectedLeadId
  );

  const handleNext = () => {
    if (!name.trim()) {
      catalystToast.error('Name required', 'Please enter a workstream name');
      return;
    }
    if (!code.trim()) {
      // Auto-generate code from name
      const generatedCode = name.slice(0, 3).toUpperCase();
      setCode(generatedCode);
    }
    setStep(2);
  };

  const handleCreate = async () => {
    try {
      const result = await createWorkstream.mutateAsync({
        name: name.trim(),
        description: description.trim() || undefined,
        color,
        leadId: selectedLeadId || undefined,
      });

      // Add members
      for (const memberId of selectedMemberIds) {
        await addMember.mutateAsync({
          workstreamId: result.id,
          userId: memberId,
          role: 'member',
        });
      }

      // Add lead as member with lead role
      if (selectedLeadId) {
        await addMember.mutateAsync({
          workstreamId: result.id,
          userId: selectedLeadId,
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
    setSelectedLeadId(null);
    setSelectedMemberIds([]);
    setMemberSearch('');
    onClose();
  };

  const toggleMember = (userId: string) => {
    setSelectedMemberIds(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
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

              {/* Code */}
              <div className="ws-form-group">
                <label className="ws-form-label">
                  Code
                </label>
                <input
                  type="text"
                  className="ws-form-input"
                  placeholder="e.g., PLT"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 5))}
                  maxLength={5}
                />
                <div className="ws-form-hint">
                  3-5 characters, auto-generated if left blank
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
              {/* Lead Selection */}
              <div className="ws-form-group">
                <label className="ws-form-label">Team Lead</label>
                {selectedLeadId ? (
                  <div 
                    className="flex items-center justify-between p-3 rounded-lg"
                    style={{ background: 'var(--ws-bg-secondary)', border: '1px solid var(--ws-border-primary)' }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="ws-avatar" style={{ background: color }}>
                        {users.find(u => u.id === selectedLeadId)?.initials || '?'}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, color: 'var(--ws-text-primary)' }}>
                          {users.find(u => u.id === selectedLeadId)?.name}
                        </div>
                        <div style={{ fontSize: '0.6875rem', color: 'var(--ws-text-tertiary)' }}>
                          Will be assigned as lead
                        </div>
                      </div>
                    </div>
                    <button 
                      className="ws-btn ws-btn-ghost ws-btn-icon ws-btn-sm"
                      onClick={() => setSelectedLeadId(null)}
                    >
                      <X className="w-4 h-4" strokeWidth={2} />
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {users.slice(0, 5).map(user => (
                      <button
                        key={user.id}
                        className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-[var(--ws-bg-secondary)] transition-colors text-left"
                        onClick={() => setSelectedLeadId(user.id)}
                      >
                        <div className="ws-avatar ws-avatar-sm" style={{ background: color }}>
                          {user.initials}
                        </div>
                        <span style={{ fontSize: 'var(--ws-text-base)', color: 'var(--ws-text-primary)' }}>
                          {user.name}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Members */}
              <div className="ws-form-group">
                <div className="flex justify-between mb-2">
                  <label className="ws-form-label" style={{ marginBottom: 0 }}>
                    Team Members
                  </label>
                  <span style={{ fontSize: '0.6875rem', color: 'var(--ws-text-muted)' }}>
                    {selectedMemberIds.length} selected
                  </span>
                </div>

                {/* Selected Members */}
                {selectedMemberIds.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {selectedMemberIds.map(id => {
                      const user = users.find(u => u.id === id);
                      if (!user) return null;
                      return (
                        <div 
                          key={id}
                          className="flex items-center gap-2 px-2 py-1 rounded-full"
                          style={{ background: 'var(--ws-bg-tertiary)' }}
                        >
                          <div className="ws-avatar" style={{ width: 20, height: 20, fontSize: '0.5rem', background: color }}>
                            {user.initials}
                          </div>
                          <span style={{ fontSize: 'var(--ws-text-sm)', color: 'var(--ws-text-primary)' }}>
                            {user.name}
                          </span>
                          <button onClick={() => toggleMember(id)}>
                            <X className="w-3 h-3" style={{ color: 'var(--ws-text-muted)' }} strokeWidth={2} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Search */}
                <input
                  type="text"
                  className="ws-form-input"
                  placeholder="Search team members..."
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                />

                {/* Available Users */}
                <div className="space-y-1 mt-2 max-h-40 overflow-y-auto">
                  {filteredUsers.slice(0, 6).map(user => (
                    <button
                      key={user.id}
                      className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-[var(--ws-bg-secondary)] transition-colors text-left"
                      onClick={() => toggleMember(user.id)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="ws-avatar ws-avatar-sm" style={{ background: color }}>
                          {user.initials}
                        </div>
                        <div>
                          <div style={{ fontSize: 'var(--ws-text-base)', color: 'var(--ws-text-primary)' }}>
                            {user.name}
                          </div>
                          <div style={{ fontSize: '0.6875rem', color: 'var(--ws-text-tertiary)' }}>
                            {user.role}
                          </div>
                        </div>
                      </div>
                      {/* Capacity Bar */}
                      <div className="w-16">
                        <div className="ws-capacity-bar">
                          <div 
                            className="ws-capacity-fill" 
                            style={{ 
                              width: `${Math.random() * 60 + 20}%`,
                              background: 'var(--ws-primary)'
                            }} 
                          />
                        </div>
                      </div>
                    </button>
                  ))}
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
