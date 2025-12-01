import { useState } from 'react';
import { AdminGuard } from '@/components/admin/AdminGuard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { EstimationConversionsModal } from '@/features/estimation/components/EstimationConversionsModal';
import { toast } from 'sonner';

/**
 * Estimation Settings Page - Configure estimation methods and scales
 * Source: Administration guide PDF, Page 25
 */
export default function EstimationSettings() {
  const [conversionsModalOpen, setConversionsModalOpen] = useState(false);

  const handleSave = () => {
    toast.success('Estimation settings saved successfully');
  };

  return (
    <AdminGuard>
      <div className="h-full w-full flex flex-col bg-background">
        <div className="border-b bg-card px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-foreground">Estimation Settings</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Configure estimation scales and methods for work items
              </p>
            </div>
            <Button onClick={handleSave} className="bg-brand-gold hover:bg-brand-gold-hover">
              Save Settings
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-6">
          <div className="mx-auto max-w-4xl space-y-6">
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
                      <SelectItem value="powers">Powers of 2 (1, 2, 4, 8, 16, 32)</SelectItem>
                    </SelectContent>
                  </Select>
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
                <CardTitle>WSJF Configuration</CardTitle>
                <CardDescription>
                  Configure Weighted Shortest Job First prioritization parameters
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>Business Value Scale</Label>
                  <Select defaultValue="1-10">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1-5">1 to 5</SelectItem>
                      <SelectItem value="1-10">1 to 10</SelectItem>
                      <SelectItem value="1-20">1 to 20</SelectItem>
                      <SelectItem value="fibonacci">Fibonacci</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Time Criticality Scale</Label>
                  <Select defaultValue="1-10">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1-5">1 to 5</SelectItem>
                      <SelectItem value="1-10">1 to 10</SelectItem>
                      <SelectItem value="1-20">1 to 20</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Risk Reduction Scale</Label>
                  <Select defaultValue="1-10">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1-5">1 to 5</SelectItem>
                      <SelectItem value="1-10">1 to 10</SelectItem>
                      <SelectItem value="1-20">1 to 20</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Job Size Scale</Label>
                  <Select defaultValue="fibonacci">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fibonacci">Fibonacci</SelectItem>
                      <SelectItem value="tshirt">T-Shirt Sizes</SelectItem>
                      <SelectItem value="1-10">1 to 10</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Auto-calculate WSJF scores</Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically recalculate WSJF when components change
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Estimation Conversions</CardTitle>
                    <CardDescription>
                      Configure T-shirt size to member weeks conversions for Epics and Features
                    </CardDescription>
                  </div>
                  <Button 
                    variant="outline"
                    onClick={() => setConversionsModalOpen(true)}
                  >
                    Configure Conversions
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Set up conversion rates between T-shirt sizes (XS, S, M, L, XL, XXL) and member weeks. 
                  These conversions are used to calculate team weeks, FTE/month, and story points for 
                  capacity planning and forecasting.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Epic Estimation</CardTitle>
                <CardDescription>
                  Configure estimation methods for epics and capabilities
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>Estimation Method</Label>
                  <Select defaultValue="swag">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="swag">SWAG (T-Shirt Sizing)</SelectItem>
                      <SelectItem value="story-points">Story Points</SelectItem>
                      <SelectItem value="hours">Hours</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Auto-calculate from child items</Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically sum child estimates to parent total
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <EstimationConversionsModal 
          open={conversionsModalOpen}
          onOpenChange={setConversionsModalOpen}
        />
      </div>
    </AdminGuard>
  );
}
