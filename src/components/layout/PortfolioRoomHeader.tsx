import { Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface PortfolioRoomHeaderProps {
  portfolioId: string;
  selectedSnapshot: string | null;
  onSnapshotChange: (snapshot: string | null) => void;
}

export function PortfolioRoomHeader({
  portfolioId,
  selectedSnapshot,
  onSnapshotChange,
}: PortfolioRoomHeaderProps) {
  return (
    <header className="h-14 border-b bg-card flex items-center px-4 gap-4">
      {/* Left: Page Title */}
      <div className="flex items-center gap-2">
        <Star className="h-5 w-5 text-brand-gold fill-brand-gold" />
        <h1 className="text-lg font-semibold">Portfolio Room</h1>
      </div>

      {/* Center: Context Selectors */}
      <div className="flex items-center gap-2 flex-1 justify-center">
        <span className="text-sm text-muted-foreground">for</span>
        <Select value={portfolioId}>
          <SelectTrigger className="w-[200px] h-9">
            <SelectValue placeholder="Select portfolio" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">Digital Services</SelectItem>
            <SelectItem value="2">Mobile Platform</SelectItem>
            <SelectItem value="3">Enterprise Solutions</SelectItem>
          </SelectContent>
        </Select>

        <span className="text-sm text-muted-foreground ml-4">Snapshot:</span>
        <Select value={selectedSnapshot || undefined} onValueChange={onSnapshotChange}>
          <SelectTrigger className="w-[200px] h-9">
            <SelectValue placeholder="Select one" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="2024-q1">2024 Q1</SelectItem>
            <SelectItem value="2024-q2">2024 Q2</SelectItem>
            <SelectItem value="2024-q3">2024 Q3</SelectItem>
            <SelectItem value="2024-q4">2024 Q4</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Right: View Configuration */}
      <Button variant="ghost" size="sm" className="ml-auto">
        View Configuration
      </Button>
    </header>
  );
}
