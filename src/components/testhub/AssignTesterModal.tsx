import { useState, useEffect } from 'react';
import { X, User, Users, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { catalystToast } from '@/components/ui/CatalystToast';

interface Profile {
  id: string;
  full_name: string;
  email?: string;
}

interface AssignTesterModalProps {
  isOpen: boolean;
  cycleTestCaseIds: string[];
  currentAssignee?: string | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function AssignTesterModal({
  isOpen,
  cycleTestCaseIds,
  currentAssignee,
  onClose,
  onSuccess,
}: AssignTesterModalProps) {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchProfiles();
      setSelectedProfileId(currentAssignee || null);
    }
  }, [isOpen, currentAssignee]);

  const fetchProfiles = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .order('full_name');

      if (!error && data) {
        setProfiles(data);
      }
    } catch (err) {
      console.error('Fetch profiles error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAssign = async () => {
    if (cycleTestCaseIds.length === 0) return;

    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from('th_cycle_test_cases')
        .update({ 
          assigned_to: selectedProfileId,
          updated_at: new Date().toISOString(),
        })
        .in('id', cycleTestCaseIds);

      if (error) {
        catalystToast.error(error.message || 'Failed to assign tester', {
          title: 'Assignment Failed',
        });
        return;
      }

      const assigneeName = selectedProfileId 
        ? profiles.find(p => p.id === selectedProfileId)?.full_name 
        : null;

      if (selectedProfileId) {
        catalystToast.success(
          `Assigned ${cycleTestCaseIds.length} test case${cycleTestCaseIds.length !== 1 ? 's' : ''} to ${assigneeName}`,
          { title: 'Tester Assigned' }
        );
      } else {
        catalystToast.success(
          `Unassigned ${cycleTestCaseIds.length} test case${cycleTestCaseIds.length !== 1 ? 's' : ''}`,
          { title: 'Assignment Cleared' }
        );
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      catalystToast.error(err.message || 'Failed to assign tester');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)',
      backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center',
      justifyContent: 'center', zIndex: 1000,
    }}>
      <div style={{
        width: 440, maxHeight: '80vh', backgroundColor: '#FFFFFF',
        borderRadius: 12, boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
        display: 'flex', flexDirection: 'column',
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px', borderBottom: '1px solid #E2E8F0',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 10, backgroundColor: '#E0E7FF',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Users size={20} style={{ color: '#4F46E5' }} />
            </div>
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: '#0F172A', margin: 0 }}>
                Assign Tester
              </h2>
              <p style={{ fontSize: 13, color: '#64748B', margin: '2px 0 0' }}>
                {cycleTestCaseIds.length} test case{cycleTestCaseIds.length !== 1 ? 's' : ''} selected
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            style={{
              width: 32, height: 32, padding: 0, border: 'none', borderRadius: 8,
              backgroundColor: 'transparent', color: '#94A3B8', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px' }}>
          {isLoading ? (
            <div style={{ textAlign: 'center', padding: 40, color: '#64748B' }}>
              Loading team members...
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {/* Unassign Option */}
              <button
                onClick={() => setSelectedProfileId(null)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
                  border: `1.5px solid ${selectedProfileId === null ? '#A5B4FC' : '#E2E8F0'}`,
                  borderRadius: 10, backgroundColor: selectedProfileId === null ? '#EEF2FF' : '#FFFFFF',
                  cursor: 'pointer', textAlign: 'left', width: '100%',
                }}
              >
                <div style={{
                  width: 40, height: 40, borderRadius: '50%', backgroundColor: '#F1F5F9',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <User size={20} style={{ color: '#94A3B8' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 14, fontWeight: 500, color: '#64748B', margin: 0, fontStyle: 'italic' }}>
                    Unassigned
                  </p>
                  <p style={{ fontSize: 12, color: '#94A3B8', margin: '2px 0 0' }}>
                    Clear assignment
                  </p>
                </div>
                {selectedProfileId === null && (
                  <Check size={20} style={{ color: '#4F46E5' }} />
                )}
              </button>

              {/* Divider */}
              <div style={{ height: 1, backgroundColor: '#E2E8F0', margin: '8px 0' }} />

              {/* Team Members */}
              {profiles.map((profile) => {
                const isSelected = selectedProfileId === profile.id;
                return (
                  <button
                    key={profile.id}
                    onClick={() => setSelectedProfileId(profile.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
                      border: `1.5px solid ${isSelected ? '#A5B4FC' : '#E2E8F0'}`,
                      borderRadius: 10, backgroundColor: isSelected ? '#EEF2FF' : '#FFFFFF',
                      cursor: 'pointer', textAlign: 'left', width: '100%', transition: 'all 0.15s',
                    }}
                  >
                    <div style={{
                      width: 40, height: 40, borderRadius: '50%',
                      backgroundColor: isSelected ? '#C7D2FE' : '#E0E7FF',
                      color: '#4F46E5', display: 'flex', alignItems: 'center',
                      justifyContent: 'center', fontSize: 14, fontWeight: 600,
                    }}>
                      {getInitials(profile.full_name)}
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ 
                        fontSize: 14, fontWeight: isSelected ? 600 : 500, 
                        color: isSelected ? '#4338CA' : '#0F172A', margin: 0,
                      }}>
                        {profile.full_name}
                      </p>
                      {profile.email && (
                        <p style={{ fontSize: 12, color: '#64748B', margin: '2px 0 0' }}>
                          {profile.email}
                        </p>
                      )}
                    </div>
                    {isSelected && (
                      <Check size={20} style={{ color: '#4F46E5' }} />
                    )}
                  </button>
                );
              })}

              {profiles.length === 0 && (
                <div style={{ textAlign: 'center', padding: 24, color: '#94A3B8', fontSize: 14 }}>
                  No team members found
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 24px', borderTop: '1px solid #E2E8F0',
          display: 'flex', justifyContent: 'flex-end', gap: 12,
        }}>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            style={{
              height: 40, padding: '0 20px', backgroundColor: '#FFFFFF',
              border: '1.5px solid #E2E8F0', borderRadius: 8, fontSize: 14,
              fontWeight: 500, color: '#334155', cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleAssign}
            disabled={isSubmitting}
            style={{
              height: 40, padding: '0 20px',
              background: 'linear-gradient(135deg, #4F46E5 0%, #4338CA 100%)',
              border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600,
              color: '#FFFFFF', cursor: 'pointer', opacity: isSubmitting ? 0.7 : 1,
              display: 'flex', alignItems: 'center', gap: 8,
            }}
          >
            <User size={16} />
            {isSubmitting ? 'Assigning...' : 'Assign Tester'}
          </button>
        </div>
      </div>
    </div>
  );
}
