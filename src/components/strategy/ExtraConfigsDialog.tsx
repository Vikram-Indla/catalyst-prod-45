import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';

interface ExtraConfigsDialogProps {
  open: boolean;
  onClose: () => void;
}

export function ExtraConfigsDialog({ open, onClose }: ExtraConfigsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Extra Configurations</DialogTitle>
          <DialogDescription>
            Filter the work items displayed on the Strategy Room by portfolio, program, team, program increment, release vehicle, or product.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="portfolio">Portfolio</Label>
            <Select>
              <SelectTrigger id="portfolio">
                <SelectValue placeholder="All Portfolios" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Portfolios</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="program">Program</Label>
            <Select>
              <SelectTrigger id="program">
                <SelectValue placeholder="All Programs" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Programs</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="team">Team</Label>
            <Select>
              <SelectTrigger id="team">
                <SelectValue placeholder="All Teams" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Teams</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="pi">Program Increment</Label>
            <Select>
              <SelectTrigger id="pi">
                <SelectValue placeholder="All PIs" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Program Increments</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="release">Release Vehicle</Label>
            <Select>
              <SelectTrigger id="release">
                <SelectValue placeholder="All Release Vehicles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Release Vehicles</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="product">Product</Label>
            <Select>
              <SelectTrigger id="product">
                <SelectValue placeholder="All Products" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Products</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={onClose}>
            Apply Filters
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
