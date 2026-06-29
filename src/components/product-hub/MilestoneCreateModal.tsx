import React, { useState, useEffect } from 'react';
import Modal, { ModalBody, ModalFooter, ModalHeader, ModalTitle, ModalTransition } from '@atlaskit/modal-dialog';
import Button from '@atlaskit/button/new';
import Textfield from '@atlaskit/textfield';
import TextArea from '@atlaskit/textarea';
import { CatalystDatePicker } from '@/components/ui/catalyst-date-picker';
import { productMilestoneService } from '@/services/product-milestone.service';
import type { ProductMilestone } from '@/types/product-milestone';

interface MilestoneCreateModalProps {
  isOpen: boolean;
  productId: string;
  editingMilestone?: ProductMilestone | null;
  onClose: () => void;
  onSuccess?: (milestone: any) => void;
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontWeight: 600,
  fontSize: 'var(--ds-font-size-200)',
  color: 'var(--ds-text)',
  marginBottom: 4,
};

const errStyle: React.CSSProperties = {
  fontSize: 'var(--ds-font-size-100)',
  color: 'var(--ds-text-danger)',
  marginTop: 4,
};

const asterisk = (
  <span style={{ color: 'var(--ds-text-danger)', marginLeft: 0 }}>*</span>
);

export function MilestoneCreateModal({
  isOpen,
  productId,
  editingMilestone,
  onClose,
  onSuccess,
}: MilestoneCreateModalProps) {
  const isEdit = !!editingMilestone;

  const [title, setTitle] = useState('');
  const [quarter, setQuarter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [description, setDescription] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (editingMilestone) {
        setTitle(editingMilestone.title ?? '');
        setQuarter(editingMilestone.quarter ?? '');
        setStartDate(editingMilestone.startDate ?? '');
        setTargetDate(editingMilestone.targetDate ?? '');
        setDescription(editingMilestone.description ?? '');
      } else {
        setTitle('');
        setQuarter('');
        setStartDate('');
        setTargetDate('');
        setDescription('');
      }
      setErrors({});
    }
  }, [isOpen, editingMilestone]);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!title.trim()) e.title = 'Title is required';
    if (startDate && targetDate && startDate > targetDate) {
      e.targetDate = 'Target date must be after start date';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setIsSaving(true);
    try {
      let result: any;
      if (isEdit && editingMilestone) {
        result = await productMilestoneService.updateMilestone(editingMilestone.id, {
          title,
          quarter: quarter || undefined,
          startDate: startDate || undefined,
          targetDate: targetDate || undefined,
          description: description || undefined,
        });
      } else {
        const key = `MS-${Date.now().toString(36).toUpperCase()}`;
        result = await productMilestoneService.createMilestone({
          productId,
          key,
          title,
          quarter: quarter || undefined,
          startDate: startDate || undefined,
          targetDate: targetDate || undefined,
          description: description || undefined,
          status: 'planned',
        });
      }
      onSuccess?.(result);
      onClose();
    } catch (err: any) {
      setErrors({ _global: err?.message ?? 'Save failed' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ModalTransition>
      {isOpen && (
        <Modal onClose={onClose} width="medium">
          <ModalHeader>
            <ModalTitle>{isEdit ? 'Edit milestone' : 'Create milestone'}</ModalTitle>
          </ModalHeader>
          <ModalBody>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {errors._global && (
                <div style={errStyle}>{errors._global}</div>
              )}

              <div>
                <label style={labelStyle}>Title {asterisk}</label>
                <Textfield
                  value={title}
                  onChange={(e) => setTitle(e.currentTarget.value)}
                  placeholder="e.g. Q3 2026 Launch"
                  isInvalid={!!errors.title}
                />
                {errors.title && <div style={errStyle}>{errors.title}</div>}
              </div>

              <div>
                <label style={labelStyle}>Quarter</label>
                <Textfield
                  value={quarter}
                  onChange={(e) => setQuarter(e.currentTarget.value)}
                  placeholder="e.g. Q3 2026"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={labelStyle}>Start date</label>
                  <CatalystDatePicker
                    value={startDate}
                    onChange={(v) => setStartDate(v ?? '')}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Target date</label>
                  <CatalystDatePicker
                    value={targetDate}
                    onChange={(v) => setTargetDate(v ?? '')}
                  />
                  {errors.targetDate && <div style={errStyle}>{errors.targetDate}</div>}
                </div>
              </div>

              <div>
                <label style={labelStyle}>Description</label>
                <TextArea
                  value={description}
                  onChange={(e) => setDescription(e.currentTarget.value)}
                  placeholder="Optional description"
                  resize="vertical"
                  minimumRows={3}
                />
              </div>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button appearance="subtle" onClick={onClose} isDisabled={isSaving}>
              Cancel
            </Button>
            <Button appearance="primary" onClick={handleSave} isLoading={isSaving}>
              {isEdit ? 'Save changes' : 'Create milestone'}
            </Button>
          </ModalFooter>
        </Modal>
      )}
    </ModalTransition>
  );
}
