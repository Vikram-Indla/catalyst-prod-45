import { Star, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface EpicBacklogHeaderProps {
  portfolioId: string;
  selectedPI: string | null;
  selectedSnapshot: string | null;
  onPIChange: (pi: string | null) => void;
  onSnapshotChange: (snapshot: string | null) => void;
  activeView: 'financials' | 'resources' | 'execution';
  onViewChange: (view: 'financials' | 'resources' | 'execution') => void;
}

export function EpicBacklogHeader({
  portfolioId,
  selectedPI,
  selectedSnapshot,
  onPIChange,
  onSnapshotChange,
  activeView,
  onViewChange,
}: EpicBacklogHeaderProps) {
  return (
    <div className="border-b bg-card px-6 py-4">
      <div className="flex items-center justify-between">
        {/* Left Side: Star, Dropdowns, and Tabs */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Star className="h-4 w-4" />
          </Button>

          <Select value={portfolioId} onValueChange={() => {}}>
            <SelectTrigger className="w-[200px] h-9">
              <SelectValue placeholder="Select Portfolio" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="default-portfolio">Digital Services</SelectItem>
              <SelectItem value="portfolio-2">Enterprise Apps</SelectItem>
            </SelectContent>
          </Select>

          <Select value={selectedPI || undefined} onValueChange={onPIChange}>
            <SelectTrigger className="w-[140px] h-9">
              <SelectValue placeholder="Select PI" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pi-5">PI-5</SelectItem>
              <SelectItem value="pi-6">PI-6</SelectItem>
              <SelectItem value="pi-7">PI-7</SelectItem>
            </SelectContent>
          </Select>

          <Select value={selectedSnapshot || undefined} onValueChange={onSnapshotChange}>
            <SelectTrigger className="w-[180px] h-9">
              <SelectValue placeholder="Select Snapshot" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="snapshot-2024">Corporate Strategy 2024</SelectItem>
              <SelectItem value="snapshot-2023">Acme Snapshot 2023</SelectItem>
            </SelectContent>
          </Select>

          <Tabs value={activeView} onValueChange={(v) => onViewChange(v as any)}>
            <TabsList>
              <TabsTrigger value="financials">Financials</TabsTrigger>
              <TabsTrigger value="resources">Resources</TabsTrigger>
              <TabsTrigger value="execution">Execution</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Right Side: Settings */}
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Settings className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
