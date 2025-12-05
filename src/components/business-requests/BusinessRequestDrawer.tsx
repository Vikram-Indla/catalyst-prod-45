import { useState, useEffect, useRef } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetClose } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  Copy
} from 'lucide-react';
import { useBusinessRequest, useUpdateBusinessRequest, useDeleteBusinessRequest, useDuplicateBusinessRequest } from '@/hooks/useBusinessRequests';
import { BusinessRequest } from '@/types/business-request';
import { DemandDetailsViewTab } from './drawer-tabs/DemandDetailsViewTab';
import { BusinessScoreViewTab } from './drawer-tabs/BusinessScoreViewTab';
import { LinksViewTab } from './drawer-tabs/LinksViewTab';
import { DiscussionsViewTab } from './drawer-tabs/DiscussionsViewTab';
import { AuditHistoryTab } from './drawer-tabs/AuditHistoryTab';
import { toast } from 'sonner';

interface BusinessRequestDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  requestId: string | null;
  onRequestChange?: (newRequestId: string) => void;
}

// Four tabs for the view drawer
const VIEW_TABS = [
  { value: 'demand-details', label: 'Demand Details' },
  { value: 'business-score', label: 'Business Score' },
  { value: 'links', label: 'Links' },
  { value: 'discussions', label: 'Discussions' },
  { value: 'audit-history', label: 'Audit History' },
];

export function BusinessRequestDrawer({ isOpen, onClose, requestId, onRequestChange }: BusinessRequestDrawerProps) {
  const { data: request, isLoading } = useBusinessRequest(requestId);
  const updateMutation = useUpdateBusinessRequest();
  const deleteMutation = useDeleteBusinessRequest();
  const duplicateMutation = useDuplicateBusinessRequest();
  
  const [activeTab, setActiveTab] = useState('demand-details');
  const [formData, setFormData] = useState<Partial<BusinessRequest> & Record<string, any>>({});
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Sync form data when request changes
  useEffect(() => {
    if (request) {
      setFormData(request);
      setEditedName(request.title || '');
    }
  }, [request]);

  const handleFieldChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
    // Auto-save on field change
    if (requestId) {
      updateMutation.mutate({ id: requestId, data: { [field]: value } as Partial<BusinessRequest> });
    }
  };

  const handleSave = () => {
    if (!requestId) return;
    updateMutation.mutate({ id: requestId, data: formData as Partial<BusinessRequest> });
    setHasChanges(false);
    toast.success('Business request saved');
  };

  const handleClose = () => {
    setHasChanges(false);
    onClose();
  };

  // Copy link handler
  const handleCopyLink = () => {
    const url = `${window.location.origin}/industry?request=${requestId}`;
    navigator.clipboard.writeText(url);
    toast.success('Link copied to clipboard');
  };

  // Edit name handlers
  const handleStartEditName = () => {
    setIsEditingName(true);
    setEditedName(request?.title || '');
    setTimeout(() => nameInputRef.current?.focus(), 0);
  };

  const handleSaveName = () => {
    if (editedName.trim() && editedName !== request?.title && requestId) {
      updateMutation.mutate({ id: requestId, data: { title: editedName.trim() } });
      setIsEditingName(false);
    } else {
      setIsEditingName(false);
    }
  };

  const handleNameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveName();
    } else if (e.key === 'Escape') {
      setIsEditingName(false);
      setEditedName(request?.title || '');
    }
  };

  // Toggle expand/collapse
  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  // More options handlers
  const handleAdditionalOption = (action: string) => {
    switch (action) {
      case 'duplicate':
        if (requestId) {
          duplicateMutation.mutate(requestId, {
            onSuccess: (newRequest) => {
              // Open the duplicated request in the same drawer
              if (onRequestChange) {
                onRequestChange(newRequest.id);
              }
            }
          });
        }
        break;
      case 'delete':
        setShowDeleteConfirm(true);
        break;
    }
  };

  const handleConfirmDelete = () => {
    if (requestId) {
      deleteMutation.mutate(requestId, {
        onSuccess: () => {
          setShowDeleteConfirm(false);
          onClose();
        }
      });
    }
  };

  // Get drawer width classes based on expanded state
  const drawerWidthClass = isExpanded 
    ? 'w-full sm:max-w-full' 
    : 'w-full sm:w-[700px] md:w-[800px] lg:w-[900px] sm:max-w-[90vw]';

  if (!isOpen) return null;

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <SheetContent side="right" hideClose className={`executive-drawer ${drawerWidthClass} p-0 flex flex-col overflow-hidden`}>
        <SheetHeader className="executive-drawer-header flex-col space-y-0 shrink-0 p-0">
          {/* Single header row with request ID, title, and action buttons */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-border/40">
            {/* Left side: Request ID with copy link + Title with edit */}
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="flex items-center gap-1.5 px-2 py-1 bg-primary/10 rounded text-sm shrink-0">
                <span className="text-primary font-medium">{request?.request_key || 'Loading...'}</span>
                <button
                  onClick={handleCopyLink}
                  className="text-muted-foreground hover:text-primary transition-colors p-0.5"
                  title="Copy link"
                >
                  <LinkIcon className="h-3.5 w-3.5" />
                </button>
              </div>
              
              {/* Editable title inline */}
              <div className="flex items-center gap-2 flex-1 min-w-0 group">
                {isEditingName ? (
                  <Input
                    ref={nameInputRef}
                    value={editedName}
                    onChange={(e) => setEditedName(e.target.value)}
                    onBlur={handleSaveName}
                    onKeyDown={handleNameKeyDown}
                    className="text-lg font-semibold h-auto py-1 px-2 border-primary/50 focus:border-primary"
                  />
                ) : (
                  <>
                    <SheetTitle className="executive-drawer-title truncate text-lg">
                      {request?.title || 'Loading...'}
                    </SheetTitle>
                    <button
                      onClick={handleStartEditName}
                      className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-primary transition-all p-1"
                      title="Rename"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                  </>
                )}
              </div>
            </div>
            
            {/* Right side: Save button + action icons all inline */}
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
                  <DropdownMenuItem onSelect={() => { handleSave(); onClose(); }}>
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
                  <DropdownMenuItem onSelect={() => handleAdditionalOption('duplicate')}>
                    <Copy className="h-4 w-4 mr-2" />
                    Duplicate Request
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onSelect={() => handleAdditionalOption('delete')}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Request
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
              
              <SheetClose asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted/50">
                  <X className="h-4 w-4" />
                </Button>
              </SheetClose>
            </div>
          </div>
          <SheetDescription className="sr-only">Business request details panel</SheetDescription>
        </SheetHeader>

        {/* Tabs with horizontal scroll */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="executive-tabs-list w-full justify-start rounded-none border-b h-auto shrink-0 overflow-x-auto flex-nowrap bg-[#feffff]">
            {VIEW_TABS.map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="executive-tab whitespace-nowrap"
              >
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <div className="executive-drawer-content flex-1 overflow-y-auto">
            <TabsContent value="demand-details" className="m-0 focus-visible:outline-none">
              <DemandDetailsViewTab data={formData} onChange={handleFieldChange} />
            </TabsContent>
            <TabsContent value="business-score" className="m-0 focus-visible:outline-none">
              <BusinessScoreViewTab data={formData} onChange={handleFieldChange} />
            </TabsContent>
            <TabsContent value="links" className="m-0 focus-visible:outline-none">
              {requestId && <LinksViewTab requestId={requestId} />}
            </TabsContent>
            <TabsContent value="discussions" className="m-0 focus-visible:outline-none h-[500px]">
              {requestId && <DiscussionsViewTab requestId={requestId} />}
            </TabsContent>
            <TabsContent value="audit-history" className="m-0 focus-visible:outline-none h-[500px]">
              {requestId && <AuditHistoryTab requestId={requestId} />}
            </TabsContent>
          </div>
        </Tabs>
      </SheetContent>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Request</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <span className="font-semibold">{request?.request_key}</span>? 
              This request will be moved to deleted items and can be restored within 30 days.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Sheet>
  );
}
