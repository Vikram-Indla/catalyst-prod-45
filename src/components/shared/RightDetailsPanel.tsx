import { ReactNode } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface Tab {
  id: string;
  label: string;
  content: ReactNode;
}

interface RightDetailsPanelProps {
  open: boolean;
  onClose: () => void;
  title: string;
  tabs: Tab[];
}

export function RightDetailsPanel({ open, onClose, title, tabs }: RightDetailsPanelProps) {
  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:max-w-2xl p-0 flex flex-col overflow-hidden">
        <SheetHeader className="px-6 py-4 border-b flex-shrink-0">
          <SheetTitle>{title}</SheetTitle>
        </SheetHeader>

        <Tabs defaultValue={tabs[0]?.id} className="flex-1 flex flex-col overflow-hidden">
          <div className="border-b px-6 overflow-x-auto flex-shrink-0">
            <TabsList className="h-12 inline-flex w-auto">
              {tabs.map(tab => (
                <TabsTrigger key={tab.id} value={tab.id} className="whitespace-nowrap">
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          <div className="flex-1 overflow-auto">
            {tabs.map(tab => (
              <TabsContent key={tab.id} value={tab.id} className="m-0 p-6">
                {tab.content}
              </TabsContent>
            ))}
          </div>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
