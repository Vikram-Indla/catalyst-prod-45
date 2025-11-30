// Risk Detail Panel - Slide-out drawer for viewing/editing risks
// Source: Implementation Spec Section 5.9

import { useState } from "react";
import { X } from "lucide-react";
import { Risk, RiskFormData } from "@/types/risks";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RoamBadge } from "./RoamBadge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ROAM_STATUSES, RISK_STATUSES, SEVERITY_LEVELS } from "@/constants/risks";

interface RiskDetailPanelProps {
  risk: Risk;
  isOpen: boolean;
  onClose: () => void;
  onUpdate?: (updates: Partial<Risk>) => void;
}

export function RiskDetailPanel({ risk, isOpen, onClose, onUpdate }: RiskDetailPanelProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<RiskFormData>>({
    title: risk.title,
    description: risk.description,
    status: risk.status,
    resolution_method: risk.resolution_method,
    occurrence: risk.occurrence,
    impact: risk.impact,
    critical_path: risk.critical_path,
    target_resolution_date: risk.target_resolution_date,
    consequence: risk.consequence,
    mitigation: risk.mitigation,
    contingency: risk.contingency,
    resolution_status: risk.resolution_status,
  });

  if (!isOpen) return null;

  const handleSave = () => {
    if (onUpdate) {
      onUpdate({ id: risk.id, ...formData });
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setFormData({
      title: risk.title,
      description: risk.description,
      status: risk.status,
      resolution_method: risk.resolution_method,
      occurrence: risk.occurrence,
      impact: risk.impact,
      critical_path: risk.critical_path,
      target_resolution_date: risk.target_resolution_date,
      consequence: risk.consequence,
      mitigation: risk.mitigation,
      contingency: risk.contingency,
      resolution_status: risk.resolution_status,
    });
    setIsEditing(false);
  };

  return (
    <div className="fixed inset-y-0 right-0 w-full sm:w-[600px] bg-background border-l shadow-xl z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b bg-card">
        <div className="flex items-center gap-3">
          <span className="text-brand-gold">☆</span>
          <div>
            <h2 className="text-lg font-heading font-semibold text-text-primary">
              Risk #{risk.risk_number}
            </h2>
            <p className="text-sm text-text-secondary">{risk.title}</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <Tabs defaultValue="details" className="w-full">
          <div className="border-b px-6">
            <TabsList className="w-full justify-start h-12 bg-transparent">
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="mitigation">Mitigation</TabsTrigger>
              <TabsTrigger value="discussions">Discussions</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="details" className="px-6 py-4 space-y-4">
            {/* Status Row */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-text-muted mb-2">Status</Label>
                {isEditing ? (
                  <Select
                    value={formData.status}
                    onValueChange={(value) => setFormData({ ...formData, status: value as any })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {RISK_STATUSES.map(status => (
                        <SelectItem key={status} value={status}>{status}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Badge variant={risk.status === 'Open' ? 'destructive' : 'default'}>
                    {risk.status}
                  </Badge>
                )}
              </div>
              <div>
                <Label className="text-xs text-text-muted mb-2">Resolution Method</Label>
                {isEditing ? (
                  <Select
                    value={formData.resolution_method}
                    onValueChange={(value) => setFormData({ ...formData, resolution_method: value as any })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ROAM_STATUSES.map(status => (
                        <SelectItem key={status} value={status}>{status}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <RoamBadge status={risk.resolution_method} />
                )}
              </div>
            </div>

            {/* Description */}
            <div>
              <Label className="text-xs text-text-muted mb-2">Description</Label>
              <Textarea
                value={isEditing ? formData.description : risk.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                readOnly={!isEditing}
                className="min-h-[100px] bg-background"
              />
            </div>

            {/* Risk Assessment */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label className="text-xs text-text-muted mb-2">Occurrence</Label>
                <Select
                  value={isEditing ? formData.occurrence || undefined : risk.occurrence || undefined}
                  onValueChange={(value) => setFormData({ ...formData, occurrence: value as any })}
                  disabled={!isEditing}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="—" />
                  </SelectTrigger>
                  <SelectContent>
                    {SEVERITY_LEVELS.map(level => (
                      <SelectItem key={level} value={level}>{level}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-text-muted mb-2">Impact</Label>
                <Select
                  value={isEditing ? formData.impact || undefined : risk.impact || undefined}
                  onValueChange={(value) => setFormData({ ...formData, impact: value as any })}
                  disabled={!isEditing}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="—" />
                  </SelectTrigger>
                  <SelectContent>
                    {SEVERITY_LEVELS.map(level => (
                      <SelectItem key={level} value={level}>{level}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-text-muted mb-2">Critical Path</Label>
                {isEditing ? (
                  <Select
                    value={formData.critical_path || undefined}
                    onValueChange={(value) => setFormData({ ...formData, critical_path: value as any })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="—" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Yes">Yes</SelectItem>
                      <SelectItem value="No">No</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <Badge variant={risk.critical_path === 'Yes' ? 'destructive' : 'secondary'}>
                    {risk.critical_path || '—'}
                  </Badge>
                )}
              </div>
            </div>

            {/* Target Resolution Date */}
            <div>
              <Label className="text-xs text-text-muted mb-2">Target Resolution Date</Label>
              <Input
                type="date"
                value={isEditing ? formData.target_resolution_date || '' : risk.target_resolution_date || ''}
                onChange={(e) => setFormData({ ...formData, target_resolution_date: e.target.value })}
                readOnly={!isEditing}
                className="bg-background"
              />
            </div>

            {/* Consequence */}
            <div>
              <Label className="text-xs text-text-muted mb-2">Consequence</Label>
              <Textarea
                value={isEditing ? formData.consequence || '' : risk.consequence || ''}
                onChange={(e) => setFormData({ ...formData, consequence: e.target.value })}
                readOnly={!isEditing}
                className="min-h-[80px] bg-background"
              />
            </div>
          </TabsContent>

          <TabsContent value="mitigation" className="px-6 py-4 space-y-4">
            {/* Mitigation Plan */}
            <div>
              <Label className="text-xs text-text-muted mb-2">Mitigation Plan</Label>
              <Textarea
                value={isEditing ? formData.mitigation || '' : risk.mitigation || ''}
                onChange={(e) => setFormData({ ...formData, mitigation: e.target.value })}
                readOnly={!isEditing}
                className="min-h-[100px] bg-background"
              />
            </div>

            {/* Contingency Plan */}
            <div>
              <Label className="text-xs text-text-muted mb-2">Contingency Plan</Label>
              <Textarea
                value={isEditing ? formData.contingency || '' : risk.contingency || ''}
                onChange={(e) => setFormData({ ...formData, contingency: e.target.value })}
                readOnly={!isEditing}
                className="min-h-[100px] bg-background"
              />
            </div>

            {/* Resolution Status */}
            <div>
              <Label className="text-xs text-text-muted mb-2">Resolution Status</Label>
              <Textarea
                value={isEditing ? formData.resolution_status || '' : risk.resolution_status || ''}
                onChange={(e) => setFormData({ ...formData, resolution_status: e.target.value })}
                readOnly={!isEditing}
                className="min-h-[80px] bg-background"
              />
            </div>
          </TabsContent>

          <TabsContent value="discussions" className="px-6 py-4">
            <div className="text-center py-8 text-text-muted">
              <p className="text-sm">No discussions yet</p>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Footer Actions */}
      <div className="border-t px-6 py-4 bg-card flex gap-2 justify-end">
        {isEditing ? (
          <>
            <Button variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button 
              className="bg-brand-gold hover:bg-brand-gold-hover text-white"
              onClick={handleSave}
            >
              Save Changes
            </Button>
          </>
        ) : (
          <>
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
            <Button 
              className="bg-brand-gold hover:bg-brand-gold-hover text-white"
              onClick={() => setIsEditing(true)}
            >
              Edit Risk
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
