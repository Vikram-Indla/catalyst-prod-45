import React, { useState, useEffect, useCallback } from 'react';
import Modal from '@atlaskit/modal-dialog';
import {
  ModalTransition,
  ModalHeader,
  ModalTitle,
  ModalBody,
  ModalFooter,
} from '@atlaskit/modal-dialog';
import Button from '@atlaskit/button/new';
import Textfield from '@atlaskit/textfield';
import { Field, ErrorMessage, HelperMessage } from '@atlaskit/form';
import Tabs from '@atlaskit/tabs';
import { Tab, TabList, TabPanel } from '@atlaskit/tabs';
import Checkbox from '@atlaskit/checkbox';
import Lozenge from '@atlaskit/lozenge';
import Tooltip from '@atlaskit/tooltip';
import { STATUS_CATEGORY_COLORS, STATUS_CATEGORY_LABELS, type StatusCategory } from '@/constants/statusCategoryColors';
import type { WorkflowStatusWithTypes } from '@/hooks/useWorkflowStatuses';
import { WORK_ITEM_TYPES } from '@/hooks/useTypeWorkflow';
import type { StatusConsumer } from '@/hooks/useStatusConsumers';

const CATEGORY_OPTIONS: { value: StatusCategory; label: string }[] = [
  { value: 'todo',        label: 'To do' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'done',        label: 'Done' },
];

const CONSUMER_LABELS: Record<string, string> = {
  kanban:           'Kanban board',
  jira_table:       'Work item list',
  status_lozenge:   'Status pill',
  detail_views:     'Detail views',
  filter_dropdown:  'Filter dropdown',
  bulk_change:      'Bulk change',
};

interface EditStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** When null, we're in Create mode */
  status: WorkflowStatusWithTypes | null;
  /** All registry statuses — for uniqueness check */
  allStatuses: WorkflowStatusWithTypes[];
  consumers: StatusConsumer[];
  /** Called when user saves; parent fires the mutation */
  onSave: (data: {
    name: string;
    category: StatusCategory;
    color: string;
    position: number;
    isDefault: boolean;
    typeAssignments: string[];
  }) => void;
  /** When provided, shows a Delete button in the footer (edit mode only) */
  onDelete?: () => void;
  isSaving?: boolean;
}

function ColorSwatch({ color, selected, onClick }: { color: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={color}
      style={{
        width: 24,
        height: 24,
        borderRadius: '50%',
        background: color,
        border: selected ? '2px solid var(--ds-border-selected, #0052CC)' : '2px solid transparent',
        outline: selected ? '1px solid var(--ds-border-selected, #0052CC)' : 'none',
        cursor: 'pointer',
        padding: 0,
        boxSizing: 'border-box',
      }}
    />
  );
}

const PRESET_COLORS = [
  '#64748B', '#2563EB', '#16A34A', '#DC2626',
  '#D97706', '#7C3AED', '#0891B2', '#DB2777',
  '#059669', '#EA580C',
];

export function EditStatusModal({
  isOpen,
  onClose,
  status,
  allStatuses,
  consumers,
  onSave,
  onDelete,
  isSaving = false,
}: EditStatusModalProps) {
  const isCreate = !status;

  const [name, setName] = useState('');
  const [category, setCategory] = useState<StatusCategory>('todo');
  const [color, setColor] = useState(STATUS_CATEGORY_COLORS.todo);
  const [hexInput, setHexInput] = useState(STATUS_CATEGORY_COLORS.todo);
  const [position, setPosition] = useState(0);
  const [isDefault, setIsDefault] = useState(false);
  const [typeAssignments, setTypeAssignments] = useState<string[]>([]);
  const [nameError, setNameError] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState(0);

  useEffect(() => {
    if (!isOpen) return;
    if (status) {
      setName(status.name);
      setCategory(status.category as StatusCategory);
      setColor(status.color);
      setHexInput(status.color);
      setPosition(status.position);
      setIsDefault(status.is_default);
      setTypeAssignments(status.work_item_types);
    } else {
      setName('');
      setCategory('todo');
      setColor(STATUS_CATEGORY_COLORS.todo);
      setHexInput(STATUS_CATEGORY_COLORS.todo);
      setPosition(0);
      setIsDefault(false);
      setTypeAssignments([]);
    }
    setNameError(null);
    setSelectedTab(0);
  }, [isOpen, status]);

  const validateName = useCallback(
    (value: string) => {
      const trimmed = value.trim();
      if (!trimmed) return 'Name is required.';
      const duplicate = allStatuses.find(
        (s) =>
          s.name.toLowerCase() === trimmed.toLowerCase() &&
          (!status || s.id !== status.id)
      );
      if (duplicate) {
        return `"${trimmed}" already exists in the registry. Add the existing status to this type's workflow instead.`;
      }
      return null;
    },
    [allStatuses, status]
  );

  function handleNameChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setName(val);
    setNameError(validateName(val));
  }

  function handleHexChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setHexInput(val);
    if (/^#[0-9a-fA-F]{6}$/.test(val)) {
      setColor(val);
    }
  }

  function handleColorSwatch(c: string) {
    setColor(c);
    setHexInput(c);
  }

  function toggleType(type: string) {
    setTypeAssignments((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  }

  function handleSave() {
    const err = validateName(name);
    if (err) {
      setNameError(err);
      setSelectedTab(0);
      return;
    }
    onSave({ name: name.trim(), category, color, position, isDefault, typeAssignments });
  }

  const canSave = name.trim() && !nameError;

  return (
    <ModalTransition>
      {isOpen && (
        <Modal onClose={onClose} width="medium">
          <ModalHeader>
            <ModalTitle>{isCreate ? 'Create status' : 'Edit status'}</ModalTitle>
          </ModalHeader>

          <ModalBody>
            <Tabs
              id="edit-status-tabs"
              selected={selectedTab}
              onChange={setSelectedTab}
            >
              <TabList>
                <Tab>General</Tab>
                <Tooltip
                  content={isCreate ? 'Save the status first, then assign it to work item types.' : undefined}
                >
                  {(tooltipProps) => (
                    <Tab
                      {...tooltipProps}
                      isDisabled={isCreate}
                    >
                      Work item types
                    </Tab>
                  )}
                </Tooltip>
                <Tooltip
                  content={isCreate ? 'Save the status first to view consumers.' : undefined}
                >
                  {(tooltipProps) => (
                    <Tab
                      {...tooltipProps}
                      isDisabled={isCreate}
                    >
                      Consumers
                    </Tab>
                  )}
                </Tooltip>
              </TabList>

              {/* Tab 0 — General */}
              <TabPanel>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingTop: 16 }}>
                  {/* Name */}
                  <Field name="status-name" label="Status name" isRequired>
                    {() => (
                      <>
                        <Textfield
                          name="status-name"
                          value={name}
                          onChange={handleNameChange}
                          placeholder="e.g. Ready for review"
                          autoFocus
                          isInvalid={Boolean(nameError)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && canSave) handleSave();
                          }}
                        />
                        {nameError ? (
                          <ErrorMessage>{nameError}</ErrorMessage>
                        ) : (
                          <HelperMessage>Must be unique across the entire status registry.</HelperMessage>
                        )}
                      </>
                    )}
                  </Field>

                  {/* Category */}
                  <Field name="status-category" label="Category">
                    {() => (
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {CATEGORY_OPTIONS.map((opt) => {
                          const catColor = STATUS_CATEGORY_COLORS[opt.value];
                          const isSelected = category === opt.value;
                          return (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() => {
                                setCategory(opt.value);
                                handleColorSwatch(catColor);
                              }}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                                padding: '6px 12px',
                                borderRadius: 4,
                                border: isSelected
                                  ? `2px solid ${catColor}`
                                  : '2px solid var(--ds-border, #DFE1E6)',
                                background: isSelected
                                  ? `${catColor}18`
                                  : 'var(--ds-surface, #FFFFFF)',
                                cursor: 'pointer',
                                fontSize: 13,
                                fontWeight: isSelected ? 600 : 400,
                                color: isSelected ? catColor : 'var(--ds-text, #172B4D)',
                              }}
                              aria-pressed={isSelected}
                            >
                              <span
                                style={{
                                  width: 10,
                                  height: 10,
                                  borderRadius: '50%',
                                  background: catColor,
                                  display: 'inline-block',
                                }}
                              />
                              {opt.label}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </Field>

                  {/* Color */}
                  <Field name="status-color" label="Color">
                    {() => (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          {PRESET_COLORS.map((c) => (
                            <ColorSwatch
                              key={c}
                              color={c}
                              selected={color === c}
                              onClick={() => handleColorSwatch(c)}
                            />
                          ))}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div
                            style={{
                              width: 28,
                              height: 28,
                              borderRadius: 4,
                              background: color,
                              border: '1px solid var(--ds-border, #DFE1E6)',
                              flexShrink: 0,
                            }}
                          />
                          <Textfield
                            name="hex-color"
                            value={hexInput}
                            onChange={handleHexChange}
                            placeholder="#64748B"
                            width="100px"
                          />
                        </div>
                      </div>
                    )}
                  </Field>

                  {/* Position */}
                  <Field name="status-position" label="Position">
                    {() => (
                      <>
                        <Textfield
                          name="status-position"
                          type="number"
                          value={String(position)}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                            const n = parseInt(e.target.value, 10);
                            setPosition(isNaN(n) ? 0 : Math.max(0, n));
                          }}
                          width="80px"
                        />
                        <HelperMessage>Controls sort order within this category. Lower = first.</HelperMessage>
                      </>
                    )}
                  </Field>

                  {/* Default */}
                  <Checkbox
                    label="Set as default status for this category"
                    isChecked={isDefault}
                    onChange={(e) => setIsDefault(e.target.checked)}
                    name="status-is-default"
                  />
                </div>
              </TabPanel>

              {/* Tab 1 — Work item types */}
              <TabPanel>
                <div style={{ paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <p style={{ fontSize: 13, color: 'var(--ds-text-subtle, #42526E)', margin: 0 }}>
                    Select which work item types this status is available for. Unchecked types won't see this status in their workflow.
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {WORK_ITEM_TYPES.map((type) => (
                      <Checkbox
                        key={type}
                        label={type}
                        isChecked={typeAssignments.includes(type)}
                        onChange={() => toggleType(type)}
                        name={`type-${type}`}
                      />
                    ))}
                  </div>
                </div>
              </TabPanel>

              {/* Tab 2 — Consumers */}
              <TabPanel>
                <div style={{ paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {consumers.length === 0 ? (
                    <p style={{ fontSize: 13, color: 'var(--ds-text-subtlest, #6B778C)', margin: 0 }}>
                      This status has no active consumers.
                    </p>
                  ) : (
                    <>
                      <p style={{ fontSize: 13, color: 'var(--ds-text-subtle, #42526E)', margin: 0 }}>
                        The following application surfaces currently use this status:
                      </p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {consumers.map((c) => (
                          <div
                            key={c.id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '8px 12px',
                              border: '1px solid var(--ds-border, #DFE1E6)',
                              borderRadius: 4,
                              background: 'var(--ds-surface, #FFFFFF)',
                            }}
                          >
                            <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--ds-text, #172B4D)' }}>
                              {CONSUMER_LABELS[c.consumer] ?? c.consumer}
                            </span>
                            {c.detail && (
                              <span style={{ fontSize: 12, color: 'var(--ds-text-subtlest, #6B778C)' }}>
                                {c.detail}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                      <p style={{ fontSize: 12, color: 'var(--ds-text-subtlest, #6B778C)', margin: 0 }}>
                        Deleting this status is disabled while it has consumers.
                      </p>
                    </>
                  )}
                </div>
              </TabPanel>
            </Tabs>
          </ModalBody>

          <ModalFooter>
            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
              <div>
                {!isCreate && onDelete && (
                  <Tooltip
                    content={consumers.length > 0 ? 'Cannot delete — this status has active consumers.' : undefined}
                  >
                    {(tooltipProps) => (
                      <Button
                        {...tooltipProps}
                        appearance="danger"
                        onClick={onDelete}
                        isDisabled={isSaving || consumers.length > 0}
                      >
                        Delete
                      </Button>
                    )}
                  </Tooltip>
                )}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <Button appearance="subtle" onClick={onClose} isDisabled={isSaving}>
                  Cancel
                </Button>
                <Button
                  appearance="primary"
                  onClick={handleSave}
                  isLoading={isSaving}
                  isDisabled={!canSave || isSaving}
                >
                  {isCreate ? 'Create status' : 'Save'}
                </Button>
              </div>
            </div>
          </ModalFooter>
        </Modal>
      )}
    </ModalTransition>
  );
}
