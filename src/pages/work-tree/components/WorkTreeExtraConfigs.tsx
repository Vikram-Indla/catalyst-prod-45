import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface WorkTreeExtraConfigsProps {
  open: boolean;
  onClose: () => void;
  view: string;
}

export function WorkTreeExtraConfigs({ open, onClose, view }: WorkTreeExtraConfigsProps) {
  const isStrategyView = view === 'strategy';
  const isTeamView = view === 'team';

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Extra Configs</SheetTitle>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          {/* Show Health */}
          <div className="flex items-center justify-between">
            <Label htmlFor="show-health">Show Health</Label>
            <Switch id="show-health" defaultChecked />
          </div>

          {/* Theme Group (Strategy View only) */}
          {isStrategyView && (
            <div className="space-y-2">
              <Label>Theme Group</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select theme group" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Theme Groups</SelectItem>
                  <SelectItem value="innovation">Innovation</SelectItem>
                  <SelectItem value="growth">Growth</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Epic Filter */}
          <div className="space-y-2">
            <Label>Epic</Label>
            <Select>
              <SelectTrigger>
                <SelectValue placeholder="Select epic" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Epics</SelectItem>
                <SelectItem value="epic-1">Epic 1</SelectItem>
                <SelectItem value="epic-2">Epic 2</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label>Category</Label>
            <Select>
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="feature">Feature</SelectItem>
                <SelectItem value="defect">Defect</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Sprint Filter */}
          <div className="space-y-2">
            <Label>Sprint</Label>
            <Select>
              <SelectTrigger>
                <SelectValue placeholder="Select sprint" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sprints</SelectItem>
                <SelectItem value="current">Current Sprint</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Product Filter */}
          <div className="space-y-2">
            <Label>Product</Label>
            <Select>
              <SelectTrigger>
                <SelectValue placeholder="Select product" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Products</SelectItem>
                <SelectItem value="product-1">Product 1</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Team Filter (Team View only) */}
          {isTeamView && (
            <div className="space-y-2">
              <Label>Team</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select team" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Teams</SelectItem>
                  <SelectItem value="team-1">Team Alpha</SelectItem>
                  <SelectItem value="team-2">Team Beta</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Bottom-Up option (Strategy View only) */}
          {isStrategyView && (
            <div className="flex items-center justify-between">
              <Label htmlFor="bottom-up">Bottom-Up</Label>
              <Switch id="bottom-up" />
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
