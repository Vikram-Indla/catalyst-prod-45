/**
 * CreateModal — Issue creation dialog (F1.10)
 *
 * Modal dialog that guides users through type selection and issue creation.
 */
import React, { memo, useState } from 'react';
import { createPortal } from 'react-dom';
import { IssueTypeSelector } from './IssueTypeSelector';
import { CreateForm, CreateFormData } from './CreateForm';

export interface CreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    issueType: string;
    summary: string;
    description: string;
  }) => void;
}

export const CreateModal = memo(function CreateModal({
  isOpen,
  onClose,
  onSubmit,
}: CreateModalProps) {
  const [selectedType, setSelectedType] = useState<string | null>(null);

  const handleSubmit = (formData: CreateFormData) => {
    if (!selectedType) return;
    onSubmit({
      issueType: selectedType,
      ...formData,
    });
  };

  const handleCancel = () => {
    setSelectedType(null);
    onClose();
  };

  if (!isOpen) return null;

  return createPortal(
    <div
      data-testid="create-modal"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'var(--ds-shadow-raised, rgba(0, 0, 0, 0.5))',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10001,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) handleCancel();
      }}
    >
      <div
        style={{
          backgroundColor: 'var(--ds-surface, #FFFFFF)',
          borderRadius: '3px',
          padding: '24px',
          maxWidth: '400px',
          width: '90%',
          boxShadow: '0 8px 24px var(--ds-shadow-raised, rgba(0, 0, 0, 0.2))',
        }}
      >
        <h2
          style={{
            margin: '0 0 20px 0',
            fontSize: 'var(--ds-font-size-600)',
            fontWeight: 600,
            color: 'var(--cp-text-primary, var(--cp-text-inverse, #172B4D))',
          }}
        >
          {selectedType ? `Create ${selectedType}` : 'Create Issue'}
        </h2>

        {!selectedType ? (
          <IssueTypeSelector value={null} onChange={setSelectedType} />
        ) : (
          <>
            <CreateForm
              issueType={selectedType}
              onSubmit={handleSubmit}
              onChange={() => {}}
            />

            <div
              style={{
                marginTop: '16px',
                display: 'flex',
                gap: '8px',
                justifyContent: 'flex-end',
              }}
            >
              <button
                onClick={() => setSelectedType(null)}
                style={{
                  padding: '8px 12px',
                  backgroundColor: 'var(--ds-background-neutral, #F1F2F4)',
                  color: 'var(--cp-text-primary, var(--cp-text-inverse, #172B4D))',
                  border: 'none',
                  borderRadius: '3px',
                  fontSize: 'var(--ds-font-size-400)',
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'background-color 150ms',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--ds-border, #DCDFE6)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--ds-background-neutral, #F1F2F4)';
                }}
              >
                Back
              </button>
              <button
                onClick={handleCancel}
                style={{
                  padding: '8px 12px',
                  backgroundColor: 'var(--ds-background-neutral, #F1F2F4)',
                  color: 'var(--cp-text-primary, var(--cp-text-inverse, #172B4D))',
                  border: 'none',
                  borderRadius: '3px',
                  fontSize: 'var(--ds-font-size-400)',
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
            </div>
          </>
        )}

        {!selectedType && (
          <div
            style={{
              marginTop: '16px',
              display: 'flex',
              justifyContent: 'flex-end',
            }}
          >
            <button
              onClick={handleCancel}
              style={{
                padding: '8px 12px',
                backgroundColor: 'var(--ds-background-neutral, #F1F2F4)',
                color: 'var(--cp-text-primary, var(--cp-text-inverse, #172B4D))',
                border: 'none',
                borderRadius: '3px',
                fontSize: 'var(--ds-font-size-400)',
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
});
