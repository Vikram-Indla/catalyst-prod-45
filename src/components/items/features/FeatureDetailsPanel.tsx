import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
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
  X
} from 'lucide-react';
import { FeatureDetailsTab } from './tabs/FeatureDetailsTab';
import { FeaturePlanningTab } from './tabs/FeaturePlanningTab';
import { FeatureFinancialsTab } from './tabs/FeatureFinancialsTab';
import { FeatureTraceTab } from './tabs/FeatureTraceTab';
import { FeatureAttachmentsTab } from './tabs/FeatureAttachmentsTab';
import { FeatureDiscussionsTab } from './tabs/FeatureDiscussionsTab';
import { FeatureLinksTab } from './tabs/FeatureLinksTab';
import { FeatureAuditTab } from './tabs/FeatureAuditTab';
import { FeatureAdditionalOptionsTab } from './tabs/FeatureAdditionalOptionsTab';
import { toast } from 'sonner';
import type { Feature } from '@/types/feature.types';

interface FeatureDetailsPanelProps {
  feature?: Feature;
  open: boolean;
  onClose: () => void;
}

export function FeatureDetailsPanel({ feature, open, onClose }: FeatureDetailsPanelProps) {
  const [activeTab, setActiveTab] = useState('details');

  const handleAdditionalOption = (action: string) => {
    switch (action) {
      case 'drop':
        toast.info('Drop feature to backlog');
        break;
      case 'split':
        toast.info('Opening Split Feature dialog');
        break;
      case 'delete':
        toast.info('Move feature to recycle bin');
        break;
      case 'cancel':
        toast.info('Cancel feature and move to canceled items');
        break;
      case 'copy':
        toast.info('Opening Copy Feature dialog');
        break;
      case 'add-to-kanban':
        toast.info('Opening Add to Kanban Board dialog');
        break;
      case 'trace':
        window.open(`/items/features/${feature?.id}/trace`, '_blank');
        break;
      default:
        toast.info(`Action: ${action}`);
    }
  };

  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <SheetContent className="sm:max-w-2xl w-full overflow-y-auto">
        <SheetHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div className="flex-1">
            <SheetTitle className="text-xl">
              {feature ? `Feature: ${feature.name}` : 'New Feature'}
            </SheetTitle>
            {feature?.display_id && (
              <div className="text-sm text-muted-foreground font-mono mt-1">
                {feature.display_id}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              Save
            </Button>
            <Button size="sm" onClick={onClose}>
              Save & Close
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleAdditionalOption('copy')}>
                  Copy Feature
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleAdditionalOption('split')}>
                  Split Feature
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleAdditionalOption('trace')}>
                  Trace Feature
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleAdditionalOption('drop')}>
                  Drop to Backlog
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => handleAdditionalOption('cancel')}
                  className="text-yellow-600"
                >
                  Cancel Item
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => handleAdditionalOption('delete')}
                  className="text-destructive"
                >
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </SheetHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
          <TabsList className="inline-flex flex-wrap h-auto w-full gap-1">
            <TabsTrigger value="details" className="flex-shrink-0">Details</TabsTrigger>
            <TabsTrigger value="planning" className="flex-shrink-0">Planning</TabsTrigger>
            <TabsTrigger value="financials" className="flex-shrink-0">Financials</TabsTrigger>
            <TabsTrigger value="trace" className="flex-shrink-0">Trace</TabsTrigger>
            <TabsTrigger value="attachments" className="flex-shrink-0">Attachments</TabsTrigger>
            <TabsTrigger value="discussions" className="flex-shrink-0">Discussions</TabsTrigger>
            <TabsTrigger value="links" className="flex-shrink-0">Links</TabsTrigger>
            <TabsTrigger value="audit" className="flex-shrink-0">Audit</TabsTrigger>
            <TabsTrigger value="options" className="flex-shrink-0">Options</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="mt-4">
            <FeatureDetailsTab feature={feature} />
          </TabsContent>

          <TabsContent value="planning" className="mt-4">
            <FeaturePlanningTab feature={feature} />
          </TabsContent>

          <TabsContent value="financials" className="mt-4">
            <FeatureFinancialsTab feature={feature} />
          </TabsContent>

          <TabsContent value="trace" className="mt-4">
            <FeatureTraceTab feature={feature} />
          </TabsContent>

          <TabsContent value="attachments" className="mt-4">
            <FeatureAttachmentsTab featureId={feature?.id} />
          </TabsContent>

          <TabsContent value="discussions" className="mt-4">
            <FeatureDiscussionsTab featureId={feature?.id} />
          </TabsContent>

          <TabsContent value="links" className="mt-4">
            <FeatureLinksTab feature={feature} />
          </TabsContent>

          <TabsContent value="audit" className="mt-4">
            <FeatureAuditTab featureId={feature?.id} />
          </TabsContent>

          <TabsContent value="options" className="mt-4">
            <FeatureAdditionalOptionsTab 
              feature={feature}
              onAction={handleAdditionalOption}
            />
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
