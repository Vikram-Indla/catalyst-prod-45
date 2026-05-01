/**
 * CreateEditRiskDialog - Modal dialog for creating/editing risks
 * 
 * Matches Create Objective modal pattern exactly:
 * - Centered modal with overlay
 * - Header with title + X close
 * - Sticky footer with Cancel + Create/Save
 * - ESC/outside-click closes (with unsaved confirm if dirty)
 */

import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CatalystDatePicker } from "@/components/ui/catalyst-date-picker";
import { Risk, RiskFormData } from "@/types/risks";
import { ROAM_STATUSES, RISK_STATUSES, SEVERITY_LEVELS } from "@/constants/risks";
import { format, parseISO } from "date-fns";

interface CreateEditRiskDialogProps {
  risk?: Risk | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: Partial<RiskFormData>) => void;
  isSubmitting: boolean;
}

const getInitialFormData = (risk?: Risk | null): Partial<RiskFormData> => ({
  title: risk?.title || "",
  description: risk?.description || "",
  resolution_method: risk?.resolution_method || "Owned",
  status: risk?.status || "Open",
  occurrence: risk?.occurrence || null,
  impact: risk?.impact || null,
  critical_path: risk?.critical_path || null,
  consequence: risk?.consequence || "",
  mitigation: risk?.mitigation || "",
  contingency: risk?.contingency || "",
  resolution_status: risk?.resolution_status || "",
  target_resolution_date: risk?.target_resolution_date || null,
  owner_id: risk?.owner_id || null,
});

export function CreateEditRiskDialog({
  risk,
  open,
  onOpenChange,
  onSave,
  isSubmitting,
}: CreateEditRiskDialogProps) {
  const [formData, setFormData] = useState<Partial<RiskFormData>>(getInitialFormData(risk));
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const [pendingClose, setPendingClose] = useState(false);

  // Initial state for dirty checking
  const initialFormData = useMemo(() => getInitialFormData(risk), [risk]);

  // Reset form when dialog opens or risk changes
  useEffect(() => {
    if (open) {
      setFormData(getInitialFormData(risk));
    }
  }, [open, risk]);

  // Fetch users for owner dropdown
  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .order('full_name');
      if (error) throw error;
      return data || [];
    },
  });

  // Check if form is dirty
  const isDirty = useMemo(() => {
    return JSON.stringify(formData) !== JSON.stringify(initialFormData);
  }, [formData, initialFormData]);

  // Handle close with unsaved check
  const handleClose = (forceClose = false) => {
    if (forceClose || !isDirty) {
      setFormData(getInitialFormData(null));
      onOpenChange(false);
    } else {
      setPendingClose(true);
      setShowUnsavedDialog(true);
    }
  };

  // Handle dialog open change (triggered by ESC, outside click, X button)
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      handleClose();
    } else {
      onOpenChange(true);
    }
  };

  // Confirm discard changes
  const handleConfirmDiscard = () => {
    setShowUnsavedDialog(false);
    setPendingClose(false);
    setFormData(getInitialFormData(null));
    onOpenChange(false);
  };

  // Cancel discard
  const handleCancelDiscard = () => {
    setShowUnsavedDialog(false);
    setPendingClose(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  const isValid = formData.title && formData.description;
  const isEditing = !!risk;

  const inputClasses = "w-full px-3 py-2.5 rounded-lg text-sm bg-white dark:bg-[#0D1117] border border-[#E1E4E8] dark:border-[#30363D] text-[#24292F] dark:text-[#E6EDF3] placeholder:text-[#8B949E] dark:placeholder:text-[#6E7681] focus:border-[var(--ds-text-brand,#2563eb)] focus:ring-1 focus:ring-[rgba(37,99,235,0.3)] outline-none";
  const labelClasses = "text-sm font-medium text-[#24292F] dark:text-[#E6EDF3]";

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-hidden flex flex-col bg-white dark:bg-[#161B22] border-[#E1E4E8] dark:border-[#30363D]">
          <DialogHeader>
            <DialogTitle className="text-[#24292F] dark:text-[#E6EDF3]">
              {isEditing ? `Edit Risk #${risk.risk_number}` : "Create Risk"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              {/* Title */}
              <div className="space-y-2">
                <label className={labelClasses}>Title <span className="text-destructive">*</span></label>
                <input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Risk title"
                  required
                  maxLength={100}
                  className={inputClasses}
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <label className={labelClasses}>Description <span className="text-destructive">*</span></label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe the risk..."
                  rows={3}
                  required
                  className={inputClasses}
                />
              </div>

              {/* Status and Resolution Method */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className={labelClasses}>Status</label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => setFormData({ ...formData, status: value as any })}
                  >
                    <SelectTrigger className={inputClasses}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-[#161B22] border-[#E1E4E8] dark:border-[#30363D] z-[400]">
                      {RISK_STATUSES.map((status) => (
                        <SelectItem key={status} value={status}>
                          {status}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className={labelClasses}>Resolution Method (ROAM)</label>
                  <Select
                    value={formData.resolution_method}
                    onValueChange={(value) => setFormData({ ...formData, resolution_method: value as any })}
                  >
                    <SelectTrigger className={inputClasses}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-[#161B22] border-[#E1E4E8] dark:border-[#30363D] z-[400]">
                      {ROAM_STATUSES.map((method) => (
                        <SelectItem key={method} value={method}>
                          {method}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Risk Assessment */}
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className={labelClasses}>Occurrence</label>
                  <Select
                    value={formData.occurrence || "__none__"}
                    onValueChange={(value) => setFormData({ ...formData, occurrence: value === "__none__" ? null : value as any })}
                  >
                    <SelectTrigger className={inputClasses}>
                      <SelectValue placeholder="—" />
                    </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-[#161B22] border-[#E1E4E8] dark:border-[#30363D] z-[400]">
                      <SelectItem value="__none__">—</SelectItem>
                      {SEVERITY_LEVELS.map((level) => (
                        <SelectItem key={level} value={level}>
                          {level}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className={labelClasses}>Impact</label>
                  <Select
                    value={formData.impact || "__none__"}
                    onValueChange={(value) => setFormData({ ...formData, impact: value === "__none__" ? null : value as any })}
                  >
                    <SelectTrigger className={inputClasses}>
                      <SelectValue placeholder="—" />
                    </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-[#161B22] border-[#E1E4E8] dark:border-[#30363D] z-[400]">
                      <SelectItem value="__none__">—</SelectItem>
                      {SEVERITY_LEVELS.map((level) => (
                        <SelectItem key={level} value={level}>
                          {level}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className={labelClasses}>Critical Path</label>
                  <Select
                    value={formData.critical_path || "__none__"}
                    onValueChange={(value) => setFormData({ ...formData, critical_path: value === "__none__" ? null : value as any })}
                  >
                    <SelectTrigger className={inputClasses}>
                      <SelectValue placeholder="—" />
                    </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-[#161B22] border-[#E1E4E8] dark:border-[#30363D] z-[400]">
                      <SelectItem value="__none__">—</SelectItem>
                      <SelectItem value="Yes">Yes</SelectItem>
                      <SelectItem value="No">No</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Target Resolution Date */}
              <div className="space-y-2">
                <label className={labelClasses}>Target Resolution Date</label>
                <CatalystDatePicker
                  value={formData.target_resolution_date ? parseISO(formData.target_resolution_date) : undefined}
                  onChange={(date) =>
                    setFormData({ ...formData, target_resolution_date: date ? format(date, 'yyyy-MM-dd') : null })
                  }
                  placeholder="Select date"
                />
              </div>

              {/* Consequence */}
              <div className="space-y-2">
                <label className={labelClasses}>Consequence</label>
                <textarea
                  value={formData.consequence}
                  onChange={(e) => setFormData({ ...formData, consequence: e.target.value })}
                  placeholder="What happens if this risk occurs..."
                  rows={2}
                  maxLength={2000}
                  className={inputClasses}
                />
              </div>

              {/* Mitigation Plan */}
              <div className="space-y-2">
                <label className={labelClasses}>Mitigation Plan</label>
                <textarea
                  value={formData.mitigation}
                  onChange={(e) => setFormData({ ...formData, mitigation: e.target.value })}
                  placeholder="Steps to mitigate this risk..."
                  rows={2}
                  maxLength={2000}
                  className={inputClasses}
                />
              </div>

              {/* Contingency Plan */}
              <div className="space-y-2">
                <label className={labelClasses}>Contingency Plan</label>
                <textarea
                  value={formData.contingency}
                  onChange={(e) => setFormData({ ...formData, contingency: e.target.value })}
                  placeholder="Backup plan if risk occurs..."
                  rows={2}
                  maxLength={2000}
                  className={inputClasses}
                />
              </div>

              {/* Resolution Status */}
              <div className="space-y-2">
                <label className={labelClasses}>Resolution Status</label>
                <textarea
                  value={formData.resolution_status}
                  onChange={(e) => setFormData({ ...formData, resolution_status: e.target.value })}
                  placeholder="Current status of resolution efforts..."
                  rows={2}
                  maxLength={2000}
                  className={inputClasses}
                />
              </div>

              {/* Owner */}
              <div className="space-y-2">
                <label className={labelClasses}>Owner</label>
                <Select
                  value={formData.owner_id || "__none__"}
                  onValueChange={(value) => setFormData({ ...formData, owner_id: value === "__none__" ? null : value })}
                >
                  <SelectTrigger className={inputClasses}>
                    <SelectValue placeholder="Select owner" />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-[#161B22] border-[#E1E4E8] dark:border-[#30363D] z-[400]">
                    <SelectItem value="__none__">Unassigned</SelectItem>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.full_name || user.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

            </div>

            <DialogFooter className="mt-4 pt-4 border-t border-[#E1E4E8] dark:border-[#30363D]">
              <button
                type="button"
                onClick={() => handleClose()}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-white dark:bg-[#161B22] border border-[#E1E4E8] dark:border-[#30363D] text-[#57606A] dark:text-[#8B949E] hover:bg-[#F6F8FA] dark:hover:bg-[#21262D]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!isValid || isSubmitting}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-[var(--ds-text-brand,#2563eb)] hover:bg-[var(--ds-background-brand-bold-hovered,#1d4ed8)] text-white disabled:opacity-50"
              >
                {isSubmitting ? "Saving..." : isEditing ? "Save Risk" : "Create Risk"}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Unsaved Changes Confirmation Dialog */}
      <AlertDialog open={showUnsavedDialog} onOpenChange={setShowUnsavedDialog}>
        <AlertDialogContent className="bg-white dark:bg-[#161B22] border-[#E1E4E8] dark:border-[#30363D]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[#24292F] dark:text-[#E6EDF3]">Unsaved Changes</AlertDialogTitle>
            <AlertDialogDescription className="text-[#57606A] dark:text-[#8B949E]">
              You have unsaved changes. Are you sure you want to close without saving?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel 
              onClick={handleCancelDiscard}
              className="bg-white dark:bg-[#161B22] border border-[#E1E4E8] dark:border-[#30363D] text-[#57606A] dark:text-[#8B949E] hover:bg-[#F6F8FA] dark:hover:bg-[#21262D]"
            >
              Keep Editing
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmDiscard}
              className="bg-[var(--ds-text-brand,#2563eb)] hover:bg-[var(--ds-background-brand-bold-hovered,#1d4ed8)] text-white"
            >
              Discard Changes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
