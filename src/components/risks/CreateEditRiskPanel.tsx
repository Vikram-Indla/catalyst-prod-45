// Create/Edit Risk Panel - Slide-out drawer for creating/editing risks
// Source: Implementation Spec Section 5.8

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Risk, RiskFormData } from "@/types/risks";
import { ROAM_STATUSES, RISK_STATUSES, SEVERITY_LEVELS, RELATIONSHIP_TYPES } from "@/constants/risks";
import { RiskLinksSection } from "./RiskLinksSection";

interface CreateEditRiskPanelProps {
  risk?: Risk;
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<RiskFormData>) => void;
  isSubmitting: boolean;
}

export function CreateEditRiskPanel({
  risk,
  isOpen,
  onClose,
  onSave,
  isSubmitting,
}: CreateEditRiskPanelProps) {
  const [formData, setFormData] = useState<Partial<RiskFormData>>({
    title: "",
    description: "",
    resolution_method: "Owned",
    status: "Open",
    occurrence: null,
    impact: null,
    critical_path: null,
    consequence: "",
    mitigation: "",
    contingency: "",
    resolution_status: "",
    target_resolution_date: null,
    relationship: null,
    related_item_id: null,
    owner_id: null,
    program_id: null,
    program_increment_id: null,
  });

  const [links, setLinks] = useState<any[]>([]);

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

  // Fetch programs
  const { data: programs = [] } = useQuery({
    queryKey: ['programs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('programs')
        .select('id, name')
        .order('name');
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch program increments
  const { data: programIncrements = [] } = useQuery({
    queryKey: ['program-increments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('program_increments')
        .select('id, name, start_date, end_date')
        .order('start_date', { ascending: false })
        .limit(10);
      if (error) throw error;
      return data || [];
    },
  });

  useEffect(() => {
    if (risk) {
      setFormData({
        title: risk.title,
        description: risk.description,
        resolution_method: risk.resolution_method,
        status: risk.status,
        occurrence: risk.occurrence,
        impact: risk.impact,
        critical_path: risk.critical_path,
        consequence: risk.consequence || "",
        mitigation: risk.mitigation || "",
        contingency: risk.contingency || "",
        resolution_status: risk.resolution_status || "",
        target_resolution_date: risk.target_resolution_date,
        relationship: risk.relationship,
        related_item_id: risk.related_item_id,
        owner_id: risk.owner_id,
        program_id: risk.program_id,
        program_increment_id: risk.program_increment_id,
      });
      setLinks([]); // TODO: Load links from database
    } else {
      setFormData({
        title: "",
        description: "",
        resolution_method: "Owned",
        status: "Open",
        occurrence: null,
        impact: null,
        critical_path: null,
        consequence: "",
        mitigation: "",
        contingency: "",
        resolution_status: "",
        target_resolution_date: null,
        relationship: null,
        related_item_id: null,
        owner_id: null,
        program_id: null,
        program_increment_id: null,
      });
      setLinks([]);
    }
  }, [risk]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-full sm:w-[600px] bg-background border-l shadow-xl z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b bg-card">
        <h2 className="text-lg font-heading font-semibold text-text-primary">
          {risk ? `Edit Risk #${risk.risk_number}` : "Create New Risk"}
        </h2>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
        <div className="px-6 py-4 space-y-4">
          {/* Title */}
          <div>
            <Label className="text-sm mb-2">
              Title <span className="text-destructive">*</span>
            </Label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Risk title"
              required
              maxLength={100}
            />
          </div>

          {/* Description */}
          <div>
            <Label className="text-sm mb-2">
              Description <span className="text-destructive">*</span>
            </Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe the risk..."
              className="min-h-[100px]"
              required
            />
          </div>

          {/* Status and Resolution Method */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm mb-2">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData({ ...formData, status: value as any })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RISK_STATUSES.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm mb-2">Resolution Method (ROAM)</Label>
              <Select
                value={formData.resolution_method}
                onValueChange={(value) =>
                  setFormData({ ...formData, resolution_method: value as any })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
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
            <div>
              <Label className="text-sm mb-2">Occurrence</Label>
              <Select
                value={formData.occurrence || undefined}
                onValueChange={(value) =>
                  setFormData({ ...formData, occurrence: value as any })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="—" />
                </SelectTrigger>
                <SelectContent>
                  {SEVERITY_LEVELS.map((level) => (
                    <SelectItem key={level} value={level}>
                      {level}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm mb-2">Impact</Label>
              <Select
                value={formData.impact || undefined}
                onValueChange={(value) => setFormData({ ...formData, impact: value as any })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="—" />
                </SelectTrigger>
                <SelectContent>
                  {SEVERITY_LEVELS.map((level) => (
                    <SelectItem key={level} value={level}>
                      {level}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm mb-2">Critical Path</Label>
              <Select
                value={formData.critical_path || undefined}
                onValueChange={(value) =>
                  setFormData({ ...formData, critical_path: value as any })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="—" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Yes">Yes</SelectItem>
                  <SelectItem value="No">No</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Target Resolution Date */}
          <div>
            <Label className="text-sm mb-2">Target Resolution Date</Label>
            <Input
              type="date"
              value={formData.target_resolution_date || ""}
              onChange={(e) =>
                setFormData({ ...formData, target_resolution_date: e.target.value || null })
              }
            />
          </div>

          {/* Consequence */}
          <div>
            <Label className="text-sm mb-2">Consequence</Label>
            <Textarea
              value={formData.consequence}
              onChange={(e) => setFormData({ ...formData, consequence: e.target.value })}
              placeholder="What happens if this risk occurs..."
              className="min-h-[80px]"
              maxLength={2000}
            />
          </div>

          {/* Mitigation Plan */}
          <div>
            <Label className="text-sm mb-2">Mitigation Plan</Label>
            <Textarea
              value={formData.mitigation}
              onChange={(e) => setFormData({ ...formData, mitigation: e.target.value })}
              placeholder="Steps to mitigate this risk..."
              className="min-h-[80px]"
              maxLength={2000}
            />
          </div>

          {/* Contingency Plan */}
          <div>
            <Label className="text-sm mb-2">Contingency Plan</Label>
            <Textarea
              value={formData.contingency}
              onChange={(e) => setFormData({ ...formData, contingency: e.target.value })}
              placeholder="Backup plan if risk occurs..."
              className="min-h-[80px]"
              maxLength={2000}
            />
          </div>

          {/* Resolution Status */}
          <div>
            <Label className="text-sm mb-2">Resolution Status</Label>
            <Textarea
              value={formData.resolution_status}
              onChange={(e) => setFormData({ ...formData, resolution_status: e.target.value })}
              placeholder="Current status of resolution efforts..."
              className="min-h-[60px]"
              maxLength={2000}
            />
          </div>

          {/* Owner, Program, PI */}
          <div className="space-y-4">
            <div>
              <Label className="text-sm mb-2">Owner</Label>
              <Select
                value={formData.owner_id || undefined}
                onValueChange={(value) =>
                  setFormData({ ...formData, owner_id: value || null })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select owner" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.full_name || user.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-sm mb-2">Program</Label>
              <Select
                value={formData.program_id || undefined}
                onValueChange={(value) =>
                  setFormData({ ...formData, program_id: value || null })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select program" />
                </SelectTrigger>
                <SelectContent>
                  {programs.map((program) => (
                    <SelectItem key={program.id} value={program.id}>
                      {program.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-sm mb-2">Program Increment</Label>
              <Select
                value={formData.program_increment_id || undefined}
                onValueChange={(value) =>
                  setFormData({ ...formData, program_increment_id: value || null })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select PI" />
                </SelectTrigger>
                <SelectContent>
                  {programIncrements.map((pi) => (
                    <SelectItem key={pi.id} value={pi.id}>
                      {pi.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Relationship */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm mb-2">Relationship Type</Label>
              <Select
                value={formData.relationship || undefined}
                onValueChange={(value) =>
                  setFormData({ ...formData, relationship: value as any })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="—" />
                </SelectTrigger>
                <SelectContent>
                  {RELATIONSHIP_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm mb-2">Related Item ID</Label>
              <Input
                value={formData.related_item_id || ""}
                onChange={(e) =>
                  setFormData({ ...formData, related_item_id: e.target.value || null })
                }
                placeholder="Related item ID"
              />
            </div>
          </div>

          {/* Links Section */}
          <RiskLinksSection links={links} onChange={setLinks} />
        </div>

        {/* Footer Actions */}
        <div className="border-t px-6 py-4 bg-card flex gap-2 justify-end">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting || !formData.title || !formData.description}
            className="bg-brand-gold hover:bg-brand-gold-hover text-white"
          >
            {isSubmitting ? "Saving..." : risk ? "Update Risk" : "Create Risk"}
          </Button>
        </div>
      </form>
    </div>
  );
}
