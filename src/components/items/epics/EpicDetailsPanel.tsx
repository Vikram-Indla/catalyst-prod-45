import { useState } from 'react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator 
} from '@/components/ui/dropdown-menu';
import { 
  MoreVertical, 
  MessageSquare, 
  Bell, 
  RefreshCw, 
  Users,
  GitBranch,
  FileText,
  ListTree,
  History,
  Link as LinkIcon,
  ArrowDown,
  Split,
  Trash2,
  XCircle,
  Copy,
  Kanban,
  LayoutGrid
} from 'lucide-react';
import { EpicDetailsTab } from './tabs/EpicDetailsTab';
import { EpicDesignTab } from './tabs/EpicDesignTab';
import { EpicIntakeTab } from './tabs/EpicIntakeTab';
import { EpicBenefitsTab } from './tabs/EpicBenefitsTab';
import { EpicValueTab } from './tabs/EpicValueTab';
import { EpicMilestonesTab } from './tabs/EpicMilestonesTab';
import { EpicSpendTab } from './tabs/EpicSpendTab';
import { EpicForecastTab } from './tabs/EpicForecastTab';
import { EpicWSJFTab } from './tabs/EpicWSJFTab';
import { EpicLinksTab } from './tabs/EpicLinksTab';
import { EpicChildrenTab } from './tabs/EpicChildrenTab';
import { EpicDiscussionsTab } from './tabs/EpicDiscussionsTab';
import { toast } from 'sonner';

interface EpicDetailsPanelProps {
  epic: any;
  open: boolean;
  onClose: () => void;
}

export function EpicDetailsPanel({ epic, open, onClose }: EpicDetailsPanelProps) {
  const [activeTab, setActiveTab] = useState('details');

  const handleAdditionalOption = (action: string) => {
    switch (action) {
      case 'discussions':
        setActiveTab('discussions');
        break;
      case 'subscribe':
        toast.success('Subscribed to epic notifications');
        break;
      case 'update-child-steps':
        toast.info('Update Child Process Steps - Coming soon');
        break;
      case 'responsibility-matrix':
        toast.info('Responsibility Matrix - Coming soon');
        break;
      case 'trace':
        toast.info('Trace This Epic - Coming soon');
        break;
      case 'status-report':
        toast.info('Status Report - Coming soon');
        break;
      case 'requirement-hierarchy':
        toast.info('Requirement Hierarchy - Coming soon');
        break;
      case 'audit-log':
        toast.info('Audit Log - Coming soon');
        break;
      case 'links':
        setActiveTab('links');
        break;
      case 'drop':
        toast.info('Drop - Coming soon');
        break;
      case 'split':
        toast.info('Split Epic - Coming soon');
        break;
      case 'delete':
        toast.info('Delete - Coming soon');
        break;
      case 'cancel':
        toast.info('Cancel Item - Coming soon');
        break;
      case 'copy':
        toast.info('Copy Epic - Coming soon');
        break;
      case 'add-to-kanban':
        toast.info('Add to Kanban Board - Coming soon');
        break;
      case 'epic-planning':
        toast.info('Epic Planning - Coming soon');
        break;
      case 'work-tree':
        toast.info('Work Tree - Coming soon');
        break;
    }
  };

  return (
    <Sheet open={open} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-full sm:w-[600px] md:w-[700px] lg:w-[800px] sm:max-w-[90vw] p-0 flex flex-col overflow-hidden">
        <SheetHeader className="border-b flex-row items-start justify-between space-y-0 shrink-0 px-[var(--s3)] sm:px-[var(--s4)] md:px-[var(--s6)] py-[var(--s4)]">
          <div className="flex-1 pr-2 sm:pr-4 min-w-0">
            <SheetTitle className="text-base sm:text-lg md:text-xl truncate">{epic.name}</SheetTitle>
            <SheetDescription className="text-xs sm:text-sm mt-1 truncate">
              Epic {epic.epic_key || epic.id?.slice(0, 8)}
            </SheetDescription>
          </div>
          <div className="flex items-center gap-[var(--s2)] flex-shrink-0">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64 bg-popover">
                <DropdownMenuItem onSelect={() => handleAdditionalOption('discussions')}>
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Discussions
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => handleAdditionalOption('subscribe')}>
                  <Bell className="h-4 w-4 mr-2" />
                  Subscribe
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => handleAdditionalOption('update-child-steps')}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Update Child Process Steps
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => handleAdditionalOption('responsibility-matrix')}>
                  <Users className="h-4 w-4 mr-2" />
                  Responsibility Matrix
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => handleAdditionalOption('trace')}>
                  <GitBranch className="h-4 w-4 mr-2" />
                  Trace This Epic
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => handleAdditionalOption('status-report')}>
                  <FileText className="h-4 w-4 mr-2" />
                  Status Report
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => handleAdditionalOption('requirement-hierarchy')}>
                  <ListTree className="h-4 w-4 mr-2" />
                  Requirement Hierarchy
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => handleAdditionalOption('audit-log')}>
                  <History className="h-4 w-4 mr-2" />
                  Audit Log
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => handleAdditionalOption('links')}>
                  <LinkIcon className="h-4 w-4 mr-2" />
                  Links
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => handleAdditionalOption('drop')}>
                  <ArrowDown className="h-4 w-4 mr-2" />
                  Drop
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => handleAdditionalOption('split')}>
                  <Split className="h-4 w-4 mr-2" />
                  Split
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => handleAdditionalOption('delete')}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => handleAdditionalOption('cancel')}>
                  <XCircle className="h-4 w-4 mr-2" />
                  Cancel Item
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => handleAdditionalOption('copy')}>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => handleAdditionalOption('add-to-kanban')}>
                  <Kanban className="h-4 w-4 mr-2" />
                  Add To Kanban Board
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => handleAdditionalOption('epic-planning')}>
                  <LayoutGrid className="h-4 w-4 mr-2" />
                  Epic Planning
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => handleAdditionalOption('work-tree')}>
                  <ListTree className="h-4 w-4 mr-2" />
                  Work Tree
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </SheetHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="w-full justify-start rounded-none border-b px-[var(--s3)] sm:px-[var(--s4)] md:px-[var(--s6)] shrink-0 overflow-x-auto flex-nowrap">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="children">Children</TabsTrigger>
            <TabsTrigger value="design">Design</TabsTrigger>
            <TabsTrigger value="intake">Intake</TabsTrigger>
            <TabsTrigger value="benefits">Benefits</TabsTrigger>
            <TabsTrigger value="value">Value</TabsTrigger>
            <TabsTrigger value="milestones">Milestones</TabsTrigger>
            <TabsTrigger value="spend">Spend</TabsTrigger>
            <TabsTrigger value="forecast">Forecast</TabsTrigger>
            <TabsTrigger value="wsjf">WSJF</TabsTrigger>
            <TabsTrigger value="links">Links</TabsTrigger>
            <TabsTrigger value="discussions">Discussions</TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto">
            <TabsContent value="details" className="m-0 p-[var(--s3)] sm:p-[var(--s4)] md:p-[var(--s6)] focus-visible:outline-none">
              <EpicDetailsTab epic={epic} />
            </TabsContent>
            <TabsContent value="children" className="m-0 p-[var(--s3)] sm:p-[var(--s4)] md:p-[var(--s6)] focus-visible:outline-none">
              <EpicChildrenTab epic={epic} />
            </TabsContent>
            <TabsContent value="design" className="m-0 p-[var(--s3)] sm:p-[var(--s4)] md:p-[var(--s6)] focus-visible:outline-none">
              <EpicDesignTab epic={epic} />
            </TabsContent>
            <TabsContent value="intake" className="m-0 p-[var(--s3)] sm:p-[var(--s4)] md:p-[var(--s6)] focus-visible:outline-none">
              <EpicIntakeTab epic={epic} />
            </TabsContent>
            <TabsContent value="benefits" className="m-0 p-[var(--s3)] sm:p-[var(--s4)] md:p-[var(--s6)] focus-visible:outline-none">
              <EpicBenefitsTab epic={epic} />
            </TabsContent>
            <TabsContent value="value" className="m-0 p-[var(--s3)] sm:p-[var(--s4)] md:p-[var(--s6)] focus-visible:outline-none">
              <EpicValueTab epic={epic} />
            </TabsContent>
            <TabsContent value="milestones" className="m-0 p-[var(--s3)] sm:p-[var(--s4)] md:p-[var(--s6)] focus-visible:outline-none">
              <EpicMilestonesTab epic={epic} />
            </TabsContent>
            <TabsContent value="spend" className="m-0 p-[var(--s3)] sm:p-[var(--s4)] md:p-[var(--s6)] focus-visible:outline-none">
              <EpicSpendTab epic={epic} />
            </TabsContent>
            <TabsContent value="forecast" className="m-0 p-[var(--s3)] sm:p-[var(--s4)] md:p-[var(--s6)] focus-visible:outline-none">
              <EpicForecastTab epic={epic} />
            </TabsContent>
            <TabsContent value="wsjf" className="m-0 p-[var(--s3)] sm:p-[var(--s4)] md:p-[var(--s6)] focus-visible:outline-none">
              <EpicWSJFTab epic={epic} />
            </TabsContent>
            <TabsContent value="links" className="m-0 p-[var(--s3)] sm:p-[var(--s4)] md:p-[var(--s6)] focus-visible:outline-none">
              <EpicLinksTab epic={epic} />
            </TabsContent>
            <TabsContent value="discussions" className="m-0 p-[var(--s3)] sm:p-[var(--s4)] md:p-[var(--s6)] focus-visible:outline-none h-[500px]">
              <EpicDiscussionsTab epic={epic} />
            </TabsContent>
          </div>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
