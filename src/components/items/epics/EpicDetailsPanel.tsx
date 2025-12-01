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
        toast.info('Opening discussions');
        break;
      case 'subscribe':
        toast.success('Subscribed to epic notifications');
        break;
      case 'update-child-steps':
        toast.info('Opening Update Child Process Steps dialog');
        break;
      case 'responsibility-matrix':
        toast.info('Opening Responsibility Matrix');
        break;
      case 'trace':
        window.open(`/items/epics/${epic.id}/trace`, '_blank');
        break;
      case 'status-report':
        window.open(`/items/epics/${epic.id}/status-report`, '_blank');
        break;
      case 'requirement-hierarchy':
        window.open(`/items/epics/${epic.id}/requirement-hierarchy`, '_blank');
        break;
      case 'audit-log':
        toast.info('Opening Audit Log');
        break;
      case 'links':
        setActiveTab('links');
        break;
      case 'drop':
        toast.info('Drop epic to backlog');
        break;
      case 'split':
        toast.info('Opening Split Epic dialog');
        break;
      case 'delete':
        toast.info('Move epic to recycle bin');
        break;
      case 'cancel':
        toast.info('Cancel epic and move to canceled items');
        break;
      case 'copy':
        toast.info('Opening Copy Epic dialog');
        break;
      case 'add-to-kanban':
        toast.info('Opening Add to Kanban Board dialog');
        break;
      case 'epic-planning':
        window.open(`/items/epics/${epic.id}/epic-planning`, '_blank');
        break;
      case 'work-tree':
        window.open(`/items/epics/${epic.id}/work-tree`, '_blank');
        break;
    }
  };

  return (
    <Sheet open={open} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-[800px] sm:max-w-[800px] p-0 flex flex-col overflow-hidden">
        <SheetHeader className="px-6 py-4 border-b flex-row items-start justify-between space-y-0 shrink-0">
          <div className="flex-1 pr-4">
            <SheetTitle className="text-xl">{epic.name}</SheetTitle>
            <SheetDescription className="text-sm mt-1">
              Epic {epic.epic_key || epic.id?.slice(0, 8)}
            </SheetDescription>
          </div>
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuItem onClick={() => handleAdditionalOption('discussions')}>
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Discussions
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleAdditionalOption('subscribe')}>
                  <Bell className="h-4 w-4 mr-2" />
                  Subscribe
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleAdditionalOption('update-child-steps')}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Update Child Process Steps
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleAdditionalOption('responsibility-matrix')}>
                  <Users className="h-4 w-4 mr-2" />
                  Responsibility Matrix
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleAdditionalOption('trace')}>
                  <GitBranch className="h-4 w-4 mr-2" />
                  Trace This Epic
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleAdditionalOption('status-report')}>
                  <FileText className="h-4 w-4 mr-2" />
                  Status Report
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleAdditionalOption('requirement-hierarchy')}>
                  <ListTree className="h-4 w-4 mr-2" />
                  Requirement Hierarchy
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleAdditionalOption('audit-log')}>
                  <History className="h-4 w-4 mr-2" />
                  Audit Log
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleAdditionalOption('links')}>
                  <LinkIcon className="h-4 w-4 mr-2" />
                  Links
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleAdditionalOption('drop')}>
                  <ArrowDown className="h-4 w-4 mr-2" />
                  Drop
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleAdditionalOption('split')}>
                  <Split className="h-4 w-4 mr-2" />
                  Split
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleAdditionalOption('delete')}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleAdditionalOption('cancel')}>
                  <XCircle className="h-4 w-4 mr-2" />
                  Cancel Item
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleAdditionalOption('copy')}>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleAdditionalOption('add-to-kanban')}>
                  <Kanban className="h-4 w-4 mr-2" />
                  Add To Kanban Board
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleAdditionalOption('epic-planning')}>
                  <LayoutGrid className="h-4 w-4 mr-2" />
                  Epic Planning
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleAdditionalOption('work-tree')}>
                  <ListTree className="h-4 w-4 mr-2" />
                  Work Tree
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </SheetHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="w-full justify-start rounded-none border-b px-6 shrink-0 overflow-x-auto">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="design">Design</TabsTrigger>
            <TabsTrigger value="intake">Intake</TabsTrigger>
            <TabsTrigger value="benefits">Benefits</TabsTrigger>
            <TabsTrigger value="value">Value</TabsTrigger>
            <TabsTrigger value="milestones">Milestones</TabsTrigger>
            <TabsTrigger value="spend">Spend</TabsTrigger>
            <TabsTrigger value="forecast">Forecast</TabsTrigger>
            <TabsTrigger value="wsjf">WSJF</TabsTrigger>
            <TabsTrigger value="links">Links</TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto">
            <TabsContent value="details" className="m-0 p-6 focus-visible:outline-none">
              <EpicDetailsTab epic={epic} />
            </TabsContent>
            <TabsContent value="design" className="m-0 p-6 focus-visible:outline-none">
              <EpicDesignTab epic={epic} />
            </TabsContent>
            <TabsContent value="intake" className="m-0 p-6 focus-visible:outline-none">
              <EpicIntakeTab epic={epic} />
            </TabsContent>
            <TabsContent value="benefits" className="m-0 p-6 focus-visible:outline-none">
              <EpicBenefitsTab epic={epic} />
            </TabsContent>
            <TabsContent value="value" className="m-0 p-6 focus-visible:outline-none">
              <EpicValueTab epic={epic} />
            </TabsContent>
            <TabsContent value="milestones" className="m-0 p-6 focus-visible:outline-none">
              <EpicMilestonesTab epic={epic} />
            </TabsContent>
            <TabsContent value="spend" className="m-0 p-6 focus-visible:outline-none">
              <EpicSpendTab epic={epic} />
            </TabsContent>
            <TabsContent value="forecast" className="m-0 p-6 focus-visible:outline-none">
              <EpicForecastTab epic={epic} />
            </TabsContent>
            <TabsContent value="wsjf" className="m-0 p-6 focus-visible:outline-none">
              <EpicWSJFTab epic={epic} />
            </TabsContent>
            <TabsContent value="links" className="m-0 p-6 focus-visible:outline-none">
              <EpicLinksTab epic={epic} />
            </TabsContent>
          </div>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
