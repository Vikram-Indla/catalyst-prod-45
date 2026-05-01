/**
 * Change Status Modal — TestHub Module
 * Allows changing status for one or more test cases
 */

import { useState, useEffect } from 'react';
import { X, Clock, FileCheck, CheckCircle, Archive, Loader2 } from 'lucide-react';
import { supabase, typedQuery } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ChangeStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  testCaseIds: string[];
  currentStatus?: string;
}

const STATUSES = [
  { value: 'draft', label: 'Draft', icon: Clock, color: 'var(--fg-3)', bg: 'var(--cp-bd-zone)' },
  { value: 'ready', label: 'Ready for Review', icon: FileCheck, color: 'var(--cp-blue)', bg: 'color-mix(in srgb, var(--cp-blue) 8%, transparent)' },
  { value: 'approved', label: 'Approved', icon: CheckCircle, color: 'var(--sem-success)', bg: '#ECFDF5' },
  { value: 'deprecated', label: 'Deprecated', icon: Archive, color: 'var(--sem-danger)', bg: 'var(--ds-background-danger, var(--ds-background-danger, #FEF2F2))' },
];

export function ChangeStatusModal({
  isOpen,
  onClose,
  onSuccess,
  testCaseIds,
  currentStatus,
}: ChangeStatusModalProps) {
  const { toast } = useToast();
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  // Reset selection every time modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedStatus(null);
    }
  }, [isOpen]);

  const handleUpdate = async () => {
    if (!selectedStatus) {
      toast({ title: 'Error', description: 'Please select a status', variant: 'destructive' });
      return;
    }

    setIsUpdating(true);
    try {
      const { error } = await typedQuery('tm_test_cases')
        .update({ status: selectedStatus, updated_at: new Date().toISOString() })
        .in('id', testCaseIds);

      if (error) throw new Error(error.message);

      const statusLabel = STATUSES.find(s => s.value === selectedStatus)?.label;
      toast({
        title: 'Status Updated',
        description: `Updated ${testCaseIds.length} test case${testCaseIds.length > 1 ? 's' : ''} to ${statusLabel}`,
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to update status', variant: 'destructive' });
    } finally {
      setIsUpdating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      onClick={(e) => e.target === e.currentTarget && onClose()}
      style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100 }}
    >
      <div onClick={(e) => e.stopPropagation()} style={{ width: 400, backgroundColor: 'var(--cp-float)', borderRadius: 12, boxShadow: '0 20px 60px rgba(0,0,0,0.15)', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--divider)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ fontFamily: 'var(--cp-font-body)', fontSize: 18, fontWeight: 700, color: 'var(--fg-1)', margin: 0 }}>Change Status</h2>
            <p style={{ fontFamily: 'var(--cp-font-body)', fontSize: 13, color: 'var(--fg-3)', margin: '4px 0 0 0' }}>
              {testCaseIds.length} test case{testCaseIds.length > 1 ? 's' : ''} selected
            </p>
          </div>
          <button onClick={onClose} style={{ width: 32, height: 32, border: 'none', borderRadius: 8, backgroundColor: 'transparent', color: 'var(--fg-4)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X style={{ width: 20, height: 20 }} />
          </button>
        </div>

        {/* Status options */}
        <div style={{ padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {STATUSES.map(status => {
            const Icon = status.icon;
            const isSelected = selectedStatus === status.value;
            const isCurrent = currentStatus?.toLowerCase() === status.value;

            return (
              <button
                key={status.value}
                onClick={() => !isCurrent && setSelectedStatus(status.value)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '12px 16px',
                  borderRadius: 8,
                  border: isSelected ? `2px solid ${status.color}` : '1.5px solid var(--bd-default, #E2E8F0)',
                  backgroundColor: isSelected ? status.bg : 'var(--cp-float)',
                  cursor: isCurrent ? 'not-allowed' : 'pointer',
                  opacity: isCurrent ? 0.5 : 1,
                  transition: 'all 0.15s',
                  width: '100%',
                  textAlign: 'left',
                }}
              >
                <Icon style={{ width: 18, height: 18, color: status.color, flexShrink: 0 }} />
                <span style={{ fontSize: 14, fontWeight: isSelected ? 600 : 500, color: 'var(--fg-1)', flex: 1 }}>
                  {status.label}
                </span>
                {isCurrent && (
                  <span style={{ fontSize: 11, color: 'var(--fg-4)', fontStyle: 'italic' }}>current</span>
                )}
                {isSelected && (
                  <div style={{ width: 18, height: 18, borderRadius: '50%', backgroundColor: status.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <path d="M2 5L4 7L8 3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--divider)', display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
          <button onClick={onClose} style={{ height: 40, padding: '0 20px', backgroundColor: 'var(--cp-float)', border: '1.5px solid var(--divider)', borderRadius: 8, fontSize: 14, fontWeight: 500, color: 'var(--fg-2)', cursor: 'pointer' }}>
            Cancel
          </button>
          <button
            onClick={handleUpdate}
            disabled={!selectedStatus || isUpdating}
            style={{
              height: 40, padding: '0 20px',
              background: !selectedStatus || isUpdating ? 'var(--fg-4)' : 'linear-gradient(135deg, var(--ds-text-brand, #2563EB) 0%, var(--ds-background-brand-bold-hovered, #1D4ED8) 100%)',
              border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, color: 'var(--ds-text-inverse, #FFFFFF)',
              cursor: !selectedStatus || isUpdating ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            {isUpdating ? <><Loader2 style={{ width: 16, height: 16, animation: 'spin 1s linear infinite' }} /> Updating...</> : 'Update Status'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ChangeStatusModal;
