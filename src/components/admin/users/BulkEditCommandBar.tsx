/**
 * BulkEditCommandBar — Floating command bar for bulk editing selected users
 * Premium UX with smooth animations and clear field editors
 */

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Button from '@atlaskit/button/new';
import AdsSelect from '@atlaskit/select';
import Textfield from '@atlaskit/textfield';
import { Lozenge } from '@/components/ads';
import Spinner from '@atlaskit/spinner';
import BriefcaseIcon from '@atlaskit/icon/core/briefcase';
import CheckMarkIcon from '@atlaskit/icon/core/check-mark';
import DownloadIcon from '@atlaskit/icon/core/download';
import GlobeIcon from '@atlaskit/icon/core/globe';
import OfficeBuildingIcon from '@atlaskit/icon/core/office-building';
import PeopleGroupIcon from '@atlaskit/icon/core/people-group';
import PersonIcon from '@atlaskit/icon/core/person';
import TagIcon from '@atlaskit/icon/core/tag';
import ChevronDownIcon from '@atlaskit/icon/glyph/chevron-down';
import CrossIcon from '@atlaskit/icon/glyph/cross';
import LocationIcon from '@atlaskit/icon/glyph/location';
import TrashIcon from '@atlaskit/icon/glyph/trash';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/admin/admin-alert-dialog';
import { cn } from '@/lib/utils';
import { useBulkEditUsers, BulkEditableField } from '@/hooks/useBulkEditUsers';
import { UserProfile } from '@/hooks/useUsers';

interface BulkEditCommandBarProps {
  selectedIds: Set<string>;
  onClearSelection: () => void;
  referenceData: {
    vendors: Array<{ id: string; name: string }>;
    locations: Array<{ id: string; name: string }>;
    countries: Array<{ id: string; name: string; code?: string }>;
    departments: Array<{ id: string; name: string }>;
    assignments: Array<{ id: string; name: string }>;
  };
  users?: UserProfile[];
  onBulkDelete?: (userIds: string[]) => void;
  onBulkExport?: (userIds: string[]) => void;
}

interface FieldConfig {
  key: BulkEditableField;
  label: string;
  icon: React.ReactNode;
  type: 'select' | 'text';
  options?: Array<{ value: string; label: string }>;
}

export function BulkEditCommandBar({
  selectedIds,
  onClearSelection,
  referenceData,
  users,
  onBulkDelete,
  onBulkExport,
}: BulkEditCommandBarProps) {
  const [pendingUpdates, setPendingUpdates] = useState<Partial<Record<BulkEditableField, string | null>>>({});
  const [displayUpdates, setDisplayUpdates] = useState<Partial<Record<string, string | null>>>({});
  const [openField, setOpenField] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const bulkEdit = useBulkEditUsers(referenceData);

  // Field configurations
  const fields: FieldConfig[] = useMemo(() => [
    {
      key: 'assignment_id',
      label: 'Assignment',
      icon: <BriefcaseIcon label="" size="small" />,
      type: 'select',
      options: referenceData.assignments.map(a => ({ value: a.id, label: a.name })),
    },
    {
      key: 'department_id',
      label: 'Department',
      icon: <OfficeBuildingIcon label="" size="small" />,
      type: 'select',
      options: referenceData.departments.map(d => ({ value: d.id, label: d.name })),
    },
    {
      key: 'vendor_id',
      label: 'Vendor',
      icon: <TagIcon label="" size="small" />,
      type: 'select',
      options: referenceData.vendors.map(v => ({ value: v.id, label: v.name })),
    },
    {
      key: 'resource_type',
      label: 'Resource Type',
      icon: <PersonIcon label="" size="small" />,
      type: 'select',
      options: [
        { value: 'Permanent', label: 'Permanent' },
        { value: 'Fixed', label: 'Fixed' },
        { value: 'Variable', label: 'Variable' },
        { value: 'Freelance', label: 'Freelance' },
      ],
    },
    {
      key: 'country_id',
      label: 'Country',
      icon: <GlobeIcon label="" size="small" />,
      type: 'select',
      options: referenceData.countries.map(c => ({ value: c.id, label: c.name })),
    },
    {
      key: 'location_id',
      label: 'Location',
      icon: <LocationIcon label="" size="small" />,
      type: 'select',
      options: referenceData.locations.map(l => ({ value: l.id, label: l.name })),
    },
    {
      key: 'job_role',
      label: 'Job Role',
      icon: <PeopleGroupIcon label="" size="small" />,
      type: 'text',
    },
  ], [referenceData]);

  const hasChanges = Object.keys(pendingUpdates).length > 0;
  const selectedCount = selectedIds.size;

  const handleFieldChange = (field: FieldConfig, value: string | null, displayValue?: string) => {
    setPendingUpdates(prev => ({
      ...prev,
      [field.key]: value,
    }));

    // Map field to display property name
    const displayFieldMap: Record<BulkEditableField, string> = {
      department_id: 'department_name',
      assignment_id: 'assignment_name',
      vendor_id: 'vendor',
      resource_type: 'resource_type',
      country_id: 'country',
      location_id: 'location',
      job_role: 'job_role',
    };

    setDisplayUpdates(prev => ({
      ...prev,
      [displayFieldMap[field.key]]: displayValue ?? value,
    }));

    setOpenField(null);
  };

  const handleApply = async () => {
    if (!hasChanges || selectedCount === 0) return;

    await bulkEdit.mutateAsync({
      userIds: Array.from(selectedIds),
      updates: pendingUpdates,
      displayUpdates,
    });

    // Clear state
    setPendingUpdates({});
    setDisplayUpdates({});
    onClearSelection();
  };

  const handleClear = () => {
    setPendingUpdates({});
    setDisplayUpdates({});
  };

  if (selectedCount === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.95 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="fixed bottom-6 left-0 right-0 z-50 flex justify-center px-4"
      >
        <div className="bg-background border border-border shadow-2xl rounded-xl px-4 py-3 flex items-center gap-3 max-w-fit overflow-x-auto">
          {/* Selection count */}
          <div className="flex items-center gap-2 pr-3 border-r border-border shrink-0">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
              <PeopleGroupIcon label="" size="small" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold whitespace-nowrap">{selectedCount} selected</span>
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                Resources
              </span>
            </div>
          </div>

          {/* Field editors */}
          <div className="flex items-center gap-2 shrink-0">
            {fields.map((field) => {
              const currentValue = pendingUpdates[field.key];
              const hasValue = currentValue !== undefined;

              return (
                <Popover
                  key={field.key}
                  open={openField === field.key}
                  onOpenChange={(open) => setOpenField(open ? field.key : null)}
                >
                  <PopoverTrigger asChild>
                    <Button
                      appearance={hasValue ? 'primary' : 'default'}
                    >
                      {field.icon}
                      <span>{field.label}</span>
                      {hasValue && (
                        <span className="ml-1">
                          <Lozenge appearance="inprogress">✓</Lozenge>
                        </span>
                      )}
                      <ChevronDownIcon label="" size="small" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64 p-3" align="center" side="top">
                    <div className="space-y-3">
                      <label style={{ fontSize: '12px', fontWeight: 500, color: 'var(--ds-text, #172B4D)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        {field.icon}
                        Set {field.label}
                      </label>

                      {field.type === 'select' && field.options && (
                        <AdsSelect
                          value={currentValue ? field.options.find(o => o.value === currentValue) ?? null : null}
                          options={field.options}
                          placeholder={`Select ${field.label.toLowerCase()}...`}
                          onChange={(opt) => {
                            if (opt) handleFieldChange(field, opt.value, opt.label);
                          }}
                        />
                      )}

                      {field.type === 'text' && (
                        <Textfield
                          placeholder={`Enter ${field.label.toLowerCase()}...`}
                          value={currentValue ?? ''}
                          onChange={(e) => handleFieldChange(field, (e.target as HTMLInputElement).value || null)}
                        />
                      )}

                      {hasValue && (
                        <Button
                          appearance="subtle"
                          onClick={() => {
                            setPendingUpdates(prev => {
                              const next = { ...prev };
                              delete next[field.key];
                              return next;
                            });
                            setDisplayUpdates(prev => {
                              const displayFieldMap: Record<BulkEditableField, string> = {
                                department_id: 'department_name',
                                assignment_id: 'assignment_name',
                                vendor_id: 'vendor',
                                resource_type: 'resource_type',
                                country_id: 'country',
                                location_id: 'location',
                                job_role: 'job_role',
                              };
                              const next = { ...prev };
                              delete next[displayFieldMap[field.key]];
                              return next;
                            });
                            setOpenField(null);
                          }}
                        >
                          Clear
                        </Button>
                      )}
                    </div>
                  </PopoverContent>
                </Popover>
              );
            })}
          </div>

          <div style={{ width: '1px', height: '24px', background: 'var(--ds-border, #DCDFE4)', flexShrink: 0 }} />

          {/* Actions */}
          <div className="flex items-center gap-2">
            {hasChanges && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-1.5 px-2 py-1 rounded-md text-xs"
                style={{ background: 'var(--ds-background-neutral, #F7F8F9)', color: 'var(--ds-text-subtle, #44546F)' }}
              >
                <span className="font-medium">{Object.keys(pendingUpdates).length}</span>
                <span>field(s)</span>
              </motion.div>
            )}

            <Button
              appearance="primary"
              onClick={handleApply}
              isDisabled={!hasChanges || bulkEdit.isPending}
              iconBefore={CheckMarkIcon}
            >
              {bulkEdit.isPending ? (
                <>
                  <Spinner size="small" />
                  Updating...
                </>
              ) : (
                'Apply'
              )}
            </Button>

            {/* Export Selected */}
            {onBulkExport && (
              <Button
                appearance="default"
                onClick={() => onBulkExport(Array.from(selectedIds))}
                iconBefore={DownloadIcon}
              >
                Export
              </Button>
            )}

            {/* Delete Selected */}
            {onBulkDelete && (
              <Button
                appearance="danger"
                onClick={() => setShowDeleteDialog(true)}
                iconBefore={TrashIcon}
              >
                Delete
              </Button>
            )}

            <div style={{ width: '1px', height: '24px', background: 'var(--ds-border, #DCDFE4)', flexShrink: 0 }} />

            {/* Clear button with text label */}
            <Button
              appearance="subtle"
              onClick={() => {
                handleClear();
                onClearSelection();
              }}
              iconBefore={CrossIcon}
            >
              Clear
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Bulk Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Selected Users</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete <strong>{selectedCount}</strong> selected user(s)? 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                onBulkDelete?.(Array.from(selectedIds));
                setShowDeleteDialog(false);
                onClearSelection();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Users
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AnimatePresence>
  );
}
