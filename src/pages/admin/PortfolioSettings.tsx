import { useState } from 'react';
import { AdminGuard } from '@/components/admin/AdminGuard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { toast } from 'sonner';

/**
 * Portfolio Settings Page - Configure portfolio-level settings
 * Source: Administration guide PDF, Page 21
 */
export default function PortfolioSettings() {
  const [estimationSystem, setEstimationSystem] = useState<string>('points');
  const [displayWeeksIn, setDisplayWeeksIn] = useState<string>('member_weeks');
  
  const handleSave = () => {
    // TODO: Save to portfolio_estimation_settings table
    toast.success('Portfolio estimation settings saved');
  };

  return (
    <AdminGuard>
      <div className="h-full w-full flex flex-col bg-background">
        <div className="border-b bg-card px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-foreground">Portfolio Settings</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Configure portfolio-level estimation and forecasting settings
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
                <CardTitle>Estimation System</CardTitle>
                <CardDescription>
                  Select the default estimation method for Epics, Capabilities, and Features
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>Default Estimation Method</Label>
                  <Select value={estimationSystem} onValueChange={setEstimationSystem}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="tshirt">T-Shirt Sizing (XS, S, M, L, XL)</SelectItem>
                      <SelectItem value="points">Story Points</SelectItem>
                      <SelectItem value="member_weeks">Member Weeks</SelectItem>
                      <SelectItem value="team_weeks">Team Weeks</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    This system will be used across all work items in the portfolio unless overridden
                  </p>
                </div>

                {(estimationSystem === 'member_weeks' || estimationSystem === 'team_weeks') && (
                  <div className="space-y-2">
                    <Label>Display Week Estimates In</Label>
                    <RadioGroup value={displayWeeksIn} onValueChange={setDisplayWeeksIn}>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="member_weeks" id="member" />
                        <Label htmlFor="member" className="font-normal cursor-pointer">
                          Member Weeks (base unit)
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="team_weeks" id="team" />
                        <Label htmlFor="team" className="font-normal cursor-pointer">
                          Team Weeks (1 team = 6 members)
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Portfolio Configuration</CardTitle>
                <CardDescription>
                  Additional portfolio-specific settings
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Additional configuration options will be available here
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AdminGuard>
  );
}
