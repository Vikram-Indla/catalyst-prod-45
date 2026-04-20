/**
 * BulkEditCommandBar — Floating command bar for bulk editing selected users
 * Premium UX with smooth animations and clear field editors
 */

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Users, 
  Building2, 
  Briefcase, 
  MapPin, 
  Globe, 
  Tag,
  UserCog,
  Check,
  Loader2,
  ChevronDown,
  Trash2,
  Download
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Lozenge } from '@/components/ads';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
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
      icon: <Briefcase className="h-4 w-4" />,
      type: 'select',
      options: referenceData.assignments.map(a => ({ value: a.id, label: a.name })),
    },
    {
      key: 'department_id',
      label: 'Department',
      icon: <Building2 className="h-4 w-4" />,
      type: 'select',
      options: referenceData.departments.map(d => ({ value: d.id, label: d.name })),
    },
    {
      key: 'vendor_id',
      label: 'Vendor',
      icon: <Tag className="h-4 w-4" />,
      type: 'select',
      options: referenceData.vendors.map(v => ({ value: v.id, label: v.name })),
    },
    {
      key: 'resource_type',
      label: 'Resource Type',
      icon: <UserCog className="h-4 w-4" />,
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
      icon: <Globe className="h-4 w-4" />,
      type: 'select',
      options: referenceData.countries.map(c => ({ value: c.id, label: c.name })),
    },
    {
      key: 'location_id',
      label: 'Location',
      icon: <MapPin className="h-4 w-4" />,
      type: 'select',
      options: referenceData.locations.map(l => ({ value: l.id, label: l.name })),
    },
    {
      key: 'job_role',
      label: 'Job Role',
      icon: <Users className="h-4 w-4" />,
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
              <Users className="h-4 w-4 text-primary" />
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
                      variant={hasValue ? 'default' : 'outline'}
                      size="sm"
                      className={cn(
                        "h-8 gap-1.5 text-xs shrink-0 whitespace-nowrap",
                        hasValue && "bg-primary text-primary-foreground"
                      )}
                    >
                      {field.icon}
                      <span>{field.label}</span>
                      {hasValue && (
                        <span className="ml-1">
                          <Lozenge appearance="inprogress">✓</Lozenge>
                        </span>
                      )}
                      <ChevronDown className="h-3 w-3 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64 p-3" align="center" side="top">
                    <div className="space-y-3">
                      <Label className="text-xs font-medium flex items-center gap-2">
                        {field.icon}
                        Set {field.label}
                      </Label>
                      
                      {field.type === 'select' && field.options && (
                        <Select
                          value={currentValue ?? ''}
                          onValueChange={(value) => {
                            const option = field.options?.find(o => o.value === value);
                            handleFieldChange(field, value, option?.label);
                          }}
                        >
                          <SelectTrigger className="w-full h-9">
                            <SelectValue placeholder={`Select ${field.label.toLowerCase()}...`} />
                          </SelectTrigger>
                          <SelectContent>
                            {field.options.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}

                      {field.type === 'text' && (
                        <Input
                          placeholder={`Enter ${field.label.toLowerCase()}...`}
                          value={currentValue ?? ''}
                          onChange={(e) => handleFieldChange(field, e.target.value || null)}
                          className="h-9"
                        />
                      )}

                      {hasValue && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full h-7 text-xs text-muted-foreground"
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

          <Separator orientation="vertical" className="h-6" />

          {/* Actions */}
          <div className="flex items-center gap-2">
            {hasChanges && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted text-xs text-muted-foreground"
              >
                <span className="font-medium">{Object.keys(pendingUpdates).length}</span>
                <span>field(s)</span>
              </motion.div>
            )}

            <Button
              size="sm"
              className="h-8 gap-1.5 bg-primary hover:bg-primary/90"
              onClick={handleApply}
              disabled={!hasChanges || bulkEdit.isPending}
            >
              {bulkEdit.isPending ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <Check className="h-3.5 w-3.5" />
                  Apply
                </>
              )}
            </Button>

            {/* Export Selected */}
            {onBulkExport && (
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 text-xs"
                onClick={() => onBulkExport(Array.from(selectedIds))}
              >
                <Download className="h-3.5 w-3.5" />
                Export
              </Button>
            )}

            {/* Delete Selected */}
            {onBulkDelete && (
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => setShowDeleteDialog(true)}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete
              </Button>
            )}

            <Separator orientation="vertical" className="h-6" />

            {/* Clear button with text label */}
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1.5 text-xs text-muted-foreground"
              onClick={() => {
                handleClear();
                onClearSelection();
              }}
            >
              <X className="h-3.5 w-3.5" />
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
