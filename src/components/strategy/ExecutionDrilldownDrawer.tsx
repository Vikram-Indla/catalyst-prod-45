import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Search, CheckCircle2, AlertTriangle, Unlink } from 'lucide-react';
import { useExecutionAgainstOutcomes, type ExecutionMetrics } from '@/hooks/useExecutionMetrics';

interface ExecutionDrilldownDrawerProps {
  open: boolean;
  onClose: () => void;
  level: ExecutionMetrics | null;
  snapshotId?: string;
}

export function ExecutionDrilldownDrawer({
  open,
  onClose,
  level,
  snapshotId,
}: ExecutionDrilldownDrawerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'aligned' | 'misaligned'>('aligned');
  
  const { data } = useExecutionAgainstOutcomes(snapshotId);

  // Filter items for this level
  const levelItems = data?.alignedItems.filter(item =>
    item.objectiveIds.some(objId => {
      // This is a simplified filter - in production would need tier mapping
      return true;
    })
  ) || [];

  const misalignedItems = data?.misalignedItems || [];

  // Apply search filter
  const filteredAligned = levelItems.filter(item =>
    !searchQuery || item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredMisaligned = misalignedItems.filter(item =>
    !searchQuery || item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusBadge = (status: string, isAccepted: boolean) => {
    if (isAccepted) {
      return <Badge className="bg-green-100 text-green-700 text-xs">Accepted</Badge>;
    }
    return <Badge variant="outline" className="text-xs">{status}</Badge>;
  };

  const getTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      epic: 'bg-purple-100 text-purple-700',
      feature: 'bg-blue-100 text-blue-700',
      story: 'bg-green-100 text-green-700',
    };
    return (
      <Badge className={`${colors[type] || 'bg-gray-100 text-gray-700'} text-xs capitalize`}>
        {type}
      </Badge>
    );
  };

  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <SheetContent className="w-full sm:max-w-2xl flex flex-col p-0">
        <SheetHeader className="p-4 pb-3 border-b border-border">
          <SheetTitle className="flex items-center gap-2">
            Execution — {level?.levelLabel}
            <Badge 
              variant="outline" 
              className={`ml-2 ${
                level?.color === 'green' ? 'text-green-700 border-green-300' :
                level?.color === 'yellow' ? 'text-amber-700 border-amber-300' :
                level?.color === 'red' ? 'text-red-700 border-red-300' :
                ''
              }`}
            >
              {level?.color === 'na' ? 'N/A' : `${level?.percentage}%`}
            </Badge>
          </SheetTitle>
        </SheetHeader>

        {/* Search */}
        <div className="p-4 pb-2 border-b border-border">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'aligned' | 'misaligned')} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="mx-4 mt-2 grid grid-cols-2 h-9">
            <TabsTrigger value="aligned" className="text-xs gap-1">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Aligned ({filteredAligned.length})
            </TabsTrigger>
            <TabsTrigger value="misaligned" className="text-xs gap-1">
              <AlertTriangle className="h-3.5 w-3.5" />
              Misaligned ({filteredMisaligned.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="aligned" className="flex-1 overflow-auto m-0 p-0">
            {filteredAligned.length === 0 ? (
              <div className="text-center py-12 text-sm text-muted-foreground">
                <Unlink className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
                No aligned items found
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead>Item</TableHead>
                    <TableHead className="w-20">Type</TableHead>
                    <TableHead className="w-32">Program</TableHead>
                    <TableHead className="w-24">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAligned.map((item) => (
                    <TableRow key={item.id} className="hover:bg-muted/30">
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell>{getTypeBadge(item.type)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {item.programName || '—'}
                      </TableCell>
                      <TableCell>{getStatusBadge(item.status, item.isAccepted)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </TabsContent>

          <TabsContent value="misaligned" className="flex-1 overflow-auto m-0 p-0">
            {filteredMisaligned.length === 0 ? (
              <div className="text-center py-12 text-sm text-muted-foreground">
                <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-500/40" />
                No misaligned items
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead>Item</TableHead>
                    <TableHead className="w-20">Type</TableHead>
                    <TableHead className="w-32">Program</TableHead>
                    <TableHead className="w-24">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMisaligned.map((item) => (
                    <TableRow key={item.id} className="hover:bg-muted/30">
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell>{getTypeBadge(item.type)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {item.programName || '—'}
                      </TableCell>
                      <TableCell>{getStatusBadge(item.status, item.isAccepted)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
