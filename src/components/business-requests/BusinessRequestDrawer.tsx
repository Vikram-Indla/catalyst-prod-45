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
  X, 
  Pencil, 
  Link as LinkIcon, 
  ChevronDown, 
  Maximize2, 
  Minimize2,
  MoreVertical,
  Trash2,
  Copy,
  History
} from 'lucide-react';
import { useBusinessRequest, useUpdateBusinessRequest, useDeleteBusinessRequest } from '@/hooks/useBusinessRequests';
import { BusinessRequest } from '@/types/business-request';
import { OverviewTab } from './drawer-tabs/OverviewTab';
import { PortfolioTab } from './drawer-tabs/PortfolioTab';
import { TechnicalTab } from './drawer-tabs/TechnicalTab';
import { EstimationTab } from './drawer-tabs/EstimationTab';
import { ApprovalTab } from './drawer-tabs/ApprovalTab';
import { toast } from 'sonner';

interface BusinessRequestDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  requestId: string | null;
}

// Tabs for viewing/editing a request (with Process Step and Health in Overview, no Readiness/Implementation/Support/On Hold)
const VIEW_TABS = [
  { value: 'overview', label: 'Overview' },
  { value: 'portfolio', label: 'Portfolio' },
  { value: 'technical', label: 'Technical' },
  { value: 'estimation', label: 'Estimation' },
  { value: 'approval', label: 'Approval' },
];

export function BusinessRequestDrawer({ isOpen, onClose, requestId }: BusinessRequestDrawerProps) {
  const { data: request, isLoading } = useBusinessRequest(requestId);
  const updateMutation = useUpdateBusinessRequest();
  const deleteMutation = useDeleteBusinessRequest();
  
  const [activeTab, setActiveTab] = useState('overview');
  const [formData, setFormData] = useState<Partial<BusinessRequest>>({});
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Sync form data when request changes
  useEffect(() => {
    if (request) {
      setFormData(request);
      setEditedName(request.title || '');
    }
  }, [request]);

  const handleFieldChange = (field: keyof BusinessRequest, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
    // Auto-save on field change
    if (requestId) {
      updateMutation.mutate({ id: requestId, data: { [field]: value } });
    }
  };

  const handleSave = () => {
    if (!requestId) return;
    updateMutation.mutate({ id: requestId, data: formData });
    setHasChanges(false);
    toast.success('Business request saved');
  };

  const handleSaveAndClose = () => {
    handleSave();
    onClose();
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
        if (request && requestId) {
          toast.info('Duplicate functionality coming soon');
        }
        break;
      case 'delete':
        if (requestId) {
          deleteMutation.mutate(requestId, {
            onSuccess: () => {
              onClose();
            }
          });
        }
        break;
      case 'audit-log':
        toast.info('Audit log functionality coming soon');
        break;
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
          {/* Top row: Request ID with copy link, action buttons */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-border/40">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 px-2 py-1 bg-primary/10 rounded text-sm">
                <span className="text-primary font-medium">{request?.request_key || 'Loading...'}</span>
                <button
                  onClick={handleCopyLink}
                  className="text-muted-foreground hover:text-primary transition-colors p-0.5"
                  title="Copy link"
                >
                  <LinkIcon className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
            
            {/* Action buttons row */}
            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 px-3 text-sm font-medium"
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
              
              <Button
                variant="default"
                size="sm"
                onClick={handleSaveAndClose}
                className="h-8 px-3 text-sm font-medium bg-primary hover:bg-primary/90"
              >
                Save & Close
              </Button>
              
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
          
          {/* Second row: Editable title with pen icon */}
          <div className="px-5 py-3 flex items-center justify-between">
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
                    title="Edit name"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                </>
              )}
            </div>
            
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
                <DropdownMenuItem onSelect={() => handleAdditionalOption('audit-log')}>
                  <History className="h-4 w-4 mr-2" />
                  View Audit Log
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
            <TabsContent value="overview" className="m-0 focus-visible:outline-none">
              <OverviewTab data={formData} isEditMode={true} onChange={handleFieldChange} hideProcessStepHealth={false} />
            </TabsContent>
            <TabsContent value="portfolio" className="m-0 focus-visible:outline-none">
              <PortfolioTab data={formData} isEditMode={true} onChange={handleFieldChange} />
            </TabsContent>
            <TabsContent value="technical" className="m-0 focus-visible:outline-none">
              <TechnicalTab data={formData} isEditMode={true} onChange={handleFieldChange} />
            </TabsContent>
            <TabsContent value="estimation" className="m-0 focus-visible:outline-none">
              <EstimationTab data={formData} isEditMode={true} onChange={handleFieldChange} />
            </TabsContent>
            <TabsContent value="approval" className="m-0 focus-visible:outline-none">
              <ApprovalTab data={formData} isEditMode={true} onChange={handleFieldChange} />
            </TabsContent>
          </div>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
