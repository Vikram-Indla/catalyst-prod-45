/**
 * RiskDrawer - Unified Drawer vNext
 * 
 * Follows Business Drawer pattern exactly:
 * - Same header structure, tab bar, spacing, paddings
 * - 4 tabs: Details, Mitigation, Linked Items, Discussions
 * - NO PI references - uses Quarter / Target Date only
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator 
} from '@/components/ui/dropdown-menu';
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
  X, 
  Pencil, 
  Link as LinkIcon, 
  ChevronDown, 
  Maximize2, 
  Minimize2,
  MoreVertical,
  Trash2,
  Copy,
  Star
} from 'lucide-react';
import { Risk, RiskFormData, RoamStatus, RiskStatus, SeverityLevel, YesNo } from '@/types/risks';
import { RiskDetailsTab } from './drawer-tabs/RiskDetailsTab';
import { RiskMitigationTab } from './drawer-tabs/RiskMitigationTab';
import { RiskLinkedItemsTab } from './drawer-tabs/RiskLinkedItemsTab';
import { RiskDiscussionsTab } from './RiskDiscussionsTab';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface RiskDrawerProps {
  risk: Risk | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate?: (updates: Partial<Risk>) => void;
}

const TABS = [
  { value: 'details', label: 'Details' },
  { value: 'mitigation', label: 'Mitigation' },
  { value: 'linked-items', label: 'Linked Items' },
  { value: 'discussions', label: 'Discussions' },
];

export function RiskDrawer({ risk, isOpen, onClose, onUpdate }: RiskDrawerProps) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState('details');
  const [formData, setFormData] = useState<Partial<RiskFormData>>({});
  const [originalData, setOriginalData] = useState<Partial<RiskFormData>>({});
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showUnsavedChangesDialog, setShowUnsavedChangesDialog] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Reset to default tab when drawer opens
  useEffect(() => {
    if (isOpen) {
      setActiveTab('details');
      setIsEditing(false);
    }
  }, [isOpen]);

  // Sync form data when risk changes
  useEffect(() => {
    if (risk) {
      const data: Partial<RiskFormData> = {
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
        owner_id: risk.owner_id,
        program_id: risk.program_id,
      };
      setFormData(data);
      setOriginalData(data);
      setEditedName(risk.title || '');
      setHasChanges(false);
    }
  }, [risk]);

  const handleFieldChange = useCallback((field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (!hasChanges) {
      setHasChanges(true);
    }
  }, [hasChanges]);

  const handleSave = async () => {
    if (!risk?.id || !onUpdate) return;
    
    onUpdate({ id: risk.id, ...formData });
    setOriginalData(formData);
    setHasChanges(false);
    setIsEditing(false);
    queryClient.invalidateQueries({ queryKey: ['risks'] });
    toast.success('Risk saved');
  };

  const handleAttemptClose = () => {
    if (hasChanges) {
      setShowUnsavedChangesDialog(true);
    } else {
      handleClose();
    }
  };

  const handleClose = () => {
    setHasChanges(false);
    setShowUnsavedChangesDialog(false);
    setIsEditing(false);
    onClose();
  };

  const handleDiscardAndClose = () => {
    setFormData(originalData);
    setHasChanges(false);
    setShowUnsavedChangesDialog(false);
    setIsEditing(false);
    onClose();
  };

  const handleSaveAndClose = async () => {
    if (!risk?.id || !onUpdate) return;
    
    setShowUnsavedChangesDialog(false);
    setHasChanges(false);
    onClose();
    
    onUpdate({ id: risk.id, ...formData });
    queryClient.invalidateQueries({ queryKey: ['risks'] });
    toast.success('Risk saved');
  };

  // Copy link handler
  const handleCopyLink = () => {
    const url = `${window.location.origin}/enterprise/risks?riskId=${risk?.id}`;
    navigator.clipboard.writeText(url);
    toast.success('Link copied to clipboard');
  };

  // Edit name handlers
  const handleStartEditName = () => {
    setIsEditingName(true);
    setEditedName(risk?.title || '');
    setTimeout(() => nameInputRef.current?.focus(), 0);
  };

  const handleSaveName = () => {
    if (editedName.trim() && editedName !== risk?.title && risk?.id && onUpdate) {
      onUpdate({ id: risk.id, title: editedName.trim() });
      setIsEditingName(false);
      queryClient.invalidateQueries({ queryKey: ['risks'] });
    } else {
      setIsEditingName(false);
    }
  };

  const handleNameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveName();
    } else if (e.key === 'Escape') {
      setIsEditingName(false);
      setEditedName(risk?.title || '');
    }
  };

  // Toggle expand/collapse
  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  // Get risk level label
  const getRiskLevel = () => {
    if (risk?.related_item_id) {
      return `${risk.relationship || 'Item'} Risk`;
    }
    return 'Enterprise Risk';
  };

  // Get drawer width classes
  const drawerWidthClass = isExpanded 
    ? 'w-screen sm:w-[70vw] sm:max-w-[1120px]' 
    : 'w-screen sm:w-[65vw] sm:max-w-[980px]';

  if (!isOpen || !risk) return null;

  return (
    <>
      <Sheet open={isOpen} onOpenChange={(open) => !open && handleAttemptClose()}>
        <SheetContent side="right" hideClose className={`executive-drawer ${drawerWidthClass} p-0 flex flex-col overflow-hidden bg-white`}>
          <SheetHeader className="executive-drawer-header flex-col space-y-0 shrink-0 p-0 bg-white">
            {/* Header row - identical structure to BusinessRequestDrawer */}
            <div className="flex items-center justify-between px-4 md:px-5 pt-4 pb-3 border-b border-brand-gold bg-white">
              {/* Left side: Favourite + Risk Key + Title */}
              <div className="flex items-center gap-2.5 flex-1 min-w-0">
                <button className="text-muted-foreground hover:text-brand-gold transition-colors p-0.5 shrink-0">
                  <Star className="h-4 w-4" />
                </button>
                <div className="flex items-center gap-1 shrink-0">
                  <span className="text-sm font-medium text-brand-gold">Risk #{risk.risk_number}</span>
                  <button
                    onClick={handleCopyLink}
                    className="text-muted-foreground/60 hover:text-brand-gold transition-colors p-0.5"
                    title="Copy link"
                  >
                    <LinkIcon className="h-3 w-3" />
                  </button>
                </div>
                
                {/* Editable title */}
                <div className="flex items-center gap-1.5 flex-1 min-w-0 group">
                  {isEditingName ? (
                    <Input
                      ref={nameInputRef}
                      value={editedName}
                      onChange={(e) => setEditedName(e.target.value)}
                      onBlur={handleSaveName}
                      onKeyDown={handleNameKeyDown}
                      className="text-base font-medium h-auto py-1 px-2 border-brand-gold/50 focus:border-brand-gold"
                    />
                  ) : (
                    <>
                      <SheetTitle className="truncate text-base font-medium text-foreground">
                        {risk.title}
                      </SheetTitle>
                      <button
                        onClick={handleStartEditName}
                        className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-brand-gold transition-all p-0.5"
                        title="Rename"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                    </>
                  )}
                </div>
              </div>
              
              {/* Right side: Save button + action icons */}
              <div className="flex items-center gap-2 shrink-0">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      size="sm"
                      className="h-8 px-3 text-sm font-medium bg-brand-gold hover:bg-brand-gold-hover text-white"
                    >
                      Save
                      <ChevronDown className="h-3.5 w-3.5 ml-1" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-popover">
                    <DropdownMenuItem onSelect={handleSave}>
                      Save
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={handleSaveAndClose}>
                      Save & Close
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                
                {/* More options dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted/50">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56 bg-popover">
                    <DropdownMenuItem>
                      <Copy className="h-4 w-4 mr-2" />
                      Duplicate Risk
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onSelect={() => setShowDeleteConfirm(true)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Risk
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleExpand}
                  className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  title={isExpanded ? 'Collapse' : 'Expand'}
                >
                  {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                </Button>
                
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={handleAttemptClose}
                  className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted/50"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            {/* Sub-header: Level label */}
            <div className="px-4 md:px-5 py-1.5 bg-white shrink-0">
              <span className="text-xs text-muted-foreground">{getRiskLevel()}</span>
            </div>
            
            <SheetDescription className="sr-only">Risk details panel</SheetDescription>
          </SheetHeader>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
            <TabsList className="executive-tabs-list w-full justify-start rounded-none border-b border-border h-10 shrink-0 overflow-x-auto flex-nowrap bg-white px-4 md:px-5">
              {TABS.map((tab) => (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className="executive-tab whitespace-nowrap"
                >
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>

            <div className="executive-drawer-content flex-1 flex flex-col min-h-0 overflow-y-auto">
              <TabsContent value="details" className="m-0 focus-visible:outline-none flex-1 p-4 md:p-5 pb-6">
                <RiskDetailsTab 
                  risk={risk} 
                  formData={formData} 
                  onChange={handleFieldChange}
                  isEditing={isEditing}
                />
              </TabsContent>
              <TabsContent value="mitigation" className="m-0 focus-visible:outline-none flex-1 p-4 md:p-5 pb-6">
                <RiskMitigationTab 
                  risk={risk}
                  formData={formData}
                  onChange={handleFieldChange}
                  isEditing={isEditing}
                />
              </TabsContent>
              <TabsContent value="linked-items" className="m-0 focus-visible:outline-none flex-1 p-4 md:p-5 pb-6">
                <RiskLinkedItemsTab risk={risk} />
              </TabsContent>
              <TabsContent value="discussions" className="m-0 focus-visible:outline-none h-[500px]">
                <RiskDiscussionsTab riskId={risk.id} />
              </TabsContent>
            </div>
          </Tabs>

          {/* Footer */}
          <div className="border-t px-4 md:px-5 py-3 bg-white flex gap-2 justify-end shrink-0">
            <Button variant="outline" onClick={handleAttemptClose}>
              Close
            </Button>
            <Button 
              className="bg-brand-gold hover:bg-brand-gold-hover text-white"
              onClick={() => setIsEditing(!isEditing)}
            >
              {isEditing ? 'View Mode' : 'Edit Risk'}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Unsaved Changes Dialog */}
      <AlertDialog open={showUnsavedChangesDialog} onOpenChange={setShowUnsavedChangesDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes. Are you sure you want to leave? Your changes will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowUnsavedChangesDialog(false)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDiscardAndClose}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Discard Changes
            </AlertDialogAction>
            <AlertDialogAction 
              onClick={handleSaveAndClose}
              className="bg-brand-gold text-white hover:bg-brand-gold-hover"
            >
              Save & Close
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Risk</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <span className="font-semibold">Risk #{risk.risk_number}</span>? 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
