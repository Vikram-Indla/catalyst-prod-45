import { AdminGuard } from '@/components/admin/AdminGuard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';

/**
 * Estimation Configuration Page - Configure estimation systems and scales
 * Source: Administration guide PDF, Basic Structure section
 */
export default function Estimation() {
  return (
    <AdminGuard>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Estimation</h1>
            <p className="text-muted-foreground mt-2">
              Configure estimation systems, scales, and calculation methods
            </p>
          </div>
          <Button className="bg-brand-gold hover:bg-brand-gold-hover">
            Save Changes
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Story Point Scale</CardTitle>
            <CardDescription>
              Configure the story point estimation scale for stories and features
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>Default Scale</Label>
              <Select defaultValue="fibonacci">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fibonacci">Fibonacci (1, 2, 3, 5, 8, 13, 21)</SelectItem>
                  <SelectItem value="linear">Linear (1, 2, 3, 4, 5, 6, 7, 8)</SelectItem>
                  <SelectItem value="tshirt">T-Shirt (XS, S, M, L, XL, XXL)</SelectItem>
                  <SelectItem value="custom">Custom Scale</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Story Point Unit</Label>
              <Input placeholder="e.g., Points, Days, Hours" defaultValue="Points" />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Allow decimal points</Label>
                <p className="text-sm text-muted-foreground">
                  Allow fractional story point estimates
                </p>
              </div>
              <Switch />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Epic Estimation</CardTitle>
            <CardDescription>
              Configure estimation methods for epics
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>Default Estimation System</Label>
              <Select defaultValue="points">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="points">Points (Fibonacci)</SelectItem>
                  <SelectItem value="wsjf">WSJF (Prioritisation)</SelectItem>
                  <SelectItem value="tshirt">T-Shirt Sizing</SelectItem>
                  <SelectItem value="team_weeks">Team Weeks</SelectItem>
                  <SelectItem value="member_weeks">Member Weeks</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                This sets the default estimation system when creating new epics
              </p>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Auto-calculate from features</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically sum feature estimates to epic total
                </p>
              </div>
              <Switch defaultChecked />
            </div>

            <div className="space-y-2">
              <Label>T-Shirt Size Conversions (Team Weeks)</Label>
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">XS</Label>
                  <Input type="number" defaultValue="1" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">S</Label>
                  <Input type="number" defaultValue="2" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">M</Label>
                  <Input type="number" defaultValue="4" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">L</Label>
                  <Input type="number" defaultValue="8" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">XL</Label>
                  <Input type="number" defaultValue="16" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">XXL</Label>
                  <Input type="number" defaultValue="32" />
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Conversion values from T-Shirt sizes to Team Weeks
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Velocity Tracking</CardTitle>
            <CardDescription>
              Configure velocity calculation and tracking settings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>Velocity Calculation</Label>
              <Select defaultValue="average-3">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="average-3">Average of last 3 sprints</SelectItem>
                  <SelectItem value="average-5">Average of last 5 sprints</SelectItem>
                  <SelectItem value="weighted">Weighted average</SelectItem>
                  <SelectItem value="last-sprint">Last sprint only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Include unfinished work</Label>
                <p className="text-sm text-muted-foreground">
                  Count partially completed stories in velocity
                </p>
              </div>
              <Switch />
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminGuard>
  );
}
