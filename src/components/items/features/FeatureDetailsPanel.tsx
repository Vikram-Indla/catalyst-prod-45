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
  MoreVertical
} from 'lucide-react';
import { FeatureDetailsTab } from './tabs/FeatureDetailsTab';
import { FeaturePlanningTab } from './tabs/FeaturePlanningTab';
import { FeatureFinancialsTab } from './tabs/FeatureFinancialsTab';
import { FeatureForecastTab } from './tabs/FeatureForecastTab';
import { FeatureWSJFTab } from './tabs/FeatureWSJFTab';
import { FeatureTraceTab } from './tabs/FeatureTraceTab';
import { FeatureAttachmentsTab } from './tabs/FeatureAttachmentsTab';
import { FeatureDiscussionsTab } from './tabs/FeatureDiscussionsTab';
import { FeatureLinksTab } from './tabs/FeatureLinksTab';
import { FeatureAuditTab } from './tabs/FeatureAuditTab';
import { FeatureAdditionalOptionsTab } from './tabs/FeatureAdditionalOptionsTab';
import { FeatureChildrenTab } from './tabs/FeatureChildrenTab';
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
      <SheetContent className="w-full sm:w-[600px] md:w-[700px] lg:w-[900px] sm:max-w-[90vw] p-0 flex flex-col">
        <div className="border-b flex-shrink-0 px-[var(--s3)] sm:px-[var(--s4)] md:px-[var(--s6)] py-[var(--s4)]">
          <div className="flex items-start justify-between gap-[var(--s2)] sm:gap-[var(--s4)]">
            <div className="flex-1 min-w-0">
              <h2 className="text-base sm:text-lg md:text-xl font-semibold truncate">
                {feature ? `Feature: ${feature.name}` : 'New Feature'}
              </h2>
              {feature?.display_id && (
                <div className="text-xs sm:text-sm text-muted-foreground font-mono mt-1">
                  {feature.display_id}
                </div>
              )}
            </div>
            <div className="flex items-center flex-shrink-0 gap-[var(--s2)]">
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
                <DropdownMenuContent align="end" className="z-[100]">
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
                    className="text-warning"
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
            </div>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
          <div className="border-b overflow-x-auto flex-shrink-0 px-[var(--s3)] sm:px-[var(--s4)] md:px-[var(--s6)]">
            <TabsList className="inline-flex bg-transparent w-auto min-w-full justify-start flex-nowrap" style={{ height: 'var(--toolbar-h)' }}>
              <TabsTrigger value="details" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">
                Details
              </TabsTrigger>
              <TabsTrigger value="children" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">
                Children
              </TabsTrigger>
              <TabsTrigger value="planning" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">
                Planning
              </TabsTrigger>
              <TabsTrigger value="financials" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">
                Financials
              </TabsTrigger>
              <TabsTrigger value="forecast" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">
                Forecast
              </TabsTrigger>
              <TabsTrigger value="wsjf" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">
                WSJF
              </TabsTrigger>
              <TabsTrigger value="trace" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">
                Trace
              </TabsTrigger>
              <TabsTrigger value="attachments" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">
                Attachments
              </TabsTrigger>
              <TabsTrigger value="discussions" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">
                Discussions
              </TabsTrigger>
              <TabsTrigger value="links" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">
                Links
              </TabsTrigger>
              <TabsTrigger value="audit" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">
                Audit
              </TabsTrigger>
              <TabsTrigger value="options" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">
                Options
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 overflow-y-auto">
            <TabsContent value="details" className="mt-0 p-[var(--s3)] sm:p-[var(--s4)] md:p-[var(--s6)]">
              <FeatureDetailsTab feature={feature} />
            </TabsContent>

            <TabsContent value="children" className="mt-0 p-[var(--s3)] sm:p-[var(--s4)] md:p-[var(--s6)]">
              <FeatureChildrenTab feature={feature} />
            </TabsContent>

            <TabsContent value="planning" className="mt-0 p-[var(--s3)] sm:p-[var(--s4)] md:p-[var(--s6)]">
              <FeaturePlanningTab feature={feature} />
            </TabsContent>

            <TabsContent value="financials" className="mt-0 p-[var(--s3)] sm:p-[var(--s4)] md:p-[var(--s6)]">
              <FeatureFinancialsTab feature={feature} />
            </TabsContent>

            <TabsContent value="forecast" className="mt-0 p-[var(--s3)] sm:p-[var(--s4)] md:p-[var(--s6)]">
              <FeatureForecastTab feature={feature} />
            </TabsContent>

            <TabsContent value="wsjf" className="mt-0 p-[var(--s3)] sm:p-[var(--s4)] md:p-[var(--s6)]">
              <FeatureWSJFTab feature={feature} />
            </TabsContent>

            <TabsContent value="trace" className="mt-0 p-[var(--s3)] sm:p-[var(--s4)] md:p-[var(--s6)]">
              <FeatureTraceTab feature={feature} />
            </TabsContent>

            <TabsContent value="attachments" className="mt-0 p-[var(--s3)] sm:p-[var(--s4)] md:p-[var(--s6)]">
              <FeatureAttachmentsTab featureId={feature?.id} />
            </TabsContent>

            <TabsContent value="discussions" className="mt-0 p-[var(--s3)] sm:p-[var(--s4)] md:p-[var(--s6)]">
              <FeatureDiscussionsTab featureId={feature?.id} />
            </TabsContent>

            <TabsContent value="links" className="mt-0 p-[var(--s3)] sm:p-[var(--s4)] md:p-[var(--s6)]">
              <FeatureLinksTab feature={feature} />
            </TabsContent>

            <TabsContent value="audit" className="mt-0 p-[var(--s3)] sm:p-[var(--s4)] md:p-[var(--s6)]">
              <FeatureAuditTab featureId={feature?.id} />
            </TabsContent>

            <TabsContent value="options" className="mt-0 p-[var(--s3)] sm:p-[var(--s4)] md:p-[var(--s6)]">
              <FeatureAdditionalOptionsTab 
                feature={feature}
                onAction={handleAdditionalOption}
              />
            </TabsContent>
          </div>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
