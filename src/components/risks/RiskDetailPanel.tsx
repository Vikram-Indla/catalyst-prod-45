// Risk Detail Panel - Slide-out drawer for viewing/editing risks
// Source: Implementation Spec Section 5.9

import { X } from "lucide-react";
import { Risk } from "@/types/risks";
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
}

export function RiskDetailPanel({ risk, isOpen, onClose }: RiskDetailPanelProps) {
  if (!isOpen) return null;

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
                <Badge variant={risk.status === 'Open' ? 'destructive' : 'default'}>
                  {risk.status}
                </Badge>
              </div>
              <div>
                <Label className="text-xs text-text-muted mb-2">Resolution Method</Label>
                <RoamBadge status={risk.resolution_method} />
              </div>
            </div>

            {/* Description */}
            <div>
              <Label className="text-xs text-text-muted mb-2">Description</Label>
              <Textarea
                value={risk.description}
                readOnly
                className="min-h-[100px] bg-background"
              />
            </div>

            {/* Risk Assessment */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label className="text-xs text-text-muted mb-2">Occurrence</Label>
                <Select value={risk.occurrence || undefined} disabled>
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
                <Select value={risk.impact || undefined} disabled>
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
                <Badge variant={risk.critical_path === 'Yes' ? 'destructive' : 'secondary'}>
                  {risk.critical_path || '—'}
                </Badge>
              </div>
            </div>

            {/* Target Resolution Date */}
            {risk.target_resolution_date && (
              <div>
                <Label className="text-xs text-text-muted mb-2">Target Resolution Date</Label>
                <Input
                  type="date"
                  value={risk.target_resolution_date}
                  readOnly
                  className="bg-background"
                />
              </div>
            )}

            {/* Consequence */}
            {risk.consequence && (
              <div>
                <Label className="text-xs text-text-muted mb-2">Consequence</Label>
                <Textarea
                  value={risk.consequence}
                  readOnly
                  className="min-h-[80px] bg-background"
                />
              </div>
            )}
          </TabsContent>

          <TabsContent value="mitigation" className="px-6 py-4 space-y-4">
            {/* Mitigation Plan */}
            {risk.mitigation && (
              <div>
                <Label className="text-xs text-text-muted mb-2">Mitigation Plan</Label>
                <Textarea
                  value={risk.mitigation}
                  readOnly
                  className="min-h-[100px] bg-background"
                />
              </div>
            )}

            {/* Contingency Plan */}
            {risk.contingency && (
              <div>
                <Label className="text-xs text-text-muted mb-2">Contingency Plan</Label>
                <Textarea
                  value={risk.contingency}
                  readOnly
                  className="min-h-[100px] bg-background"
                />
              </div>
            )}

            {/* Resolution Status */}
            {risk.resolution_status && (
              <div>
                <Label className="text-xs text-text-muted mb-2">Resolution Status</Label>
                <Textarea
                  value={risk.resolution_status}
                  readOnly
                  className="min-h-[80px] bg-background"
                />
              </div>
            )}
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
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
        <Button className="bg-brand-gold hover:bg-brand-gold-hover text-white">
          Edit Risk
        </Button>
      </div>
    </div>
  );
}
