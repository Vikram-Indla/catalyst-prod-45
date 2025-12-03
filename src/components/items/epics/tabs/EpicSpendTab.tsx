import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { DollarSign, TrendingUp, AlertCircle, Calculator } from 'lucide-react';
import { SpendDrilldownModal } from '../modals/SpendDrilldownModal';
import { formatCurrency } from '@/lib/currency';

interface EpicSpendTabProps {
  epic: any;
}

export function EpicSpendTab({ epic }: EpicSpendTabProps) {
  const queryClient = useQueryClient();
  const [drilldownOpen, setDrilldownOpen] = useState(false);
  const [drilldownType, setDrilldownType] = useState<'accepted' | 'forecasted' | 'estimated'>('accepted');
  const [formData, setFormData] = useState({
    budget: 0,
    forecasted_spend: 0,
    estimated_spend: 0,
    accepted_spend: 0,
    work_code: '',
    initial_investment: 0,
    return_on_investment: 0,
    discount_rate: 0,
    efficiency_dividend: 0,
    revenue_assurance: 0,
    business_impact: 'medium',
    it_risk: 'medium',
    failure_probability: 'low',
    failure_impact: 'medium',
    risk_appetite: 'moderate'
  });

  const { data: spendData } = useQuery({
    queryKey: ['epic-spend', epic.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('epic_spend')
        .select('*')
        .eq('epic_id', epic.id)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      
      if (data) {
        setFormData({
          budget: data.budget || 0,
          forecasted_spend: data.forecasted_spend || 0,
          estimated_spend: data.estimated_spend || 0,
          accepted_spend: data.accepted_spend || 0,
          work_code: data.work_code || '',
          initial_investment: data.initial_investment || 0,
          return_on_investment: data.return_on_investment || 0,
          discount_rate: data.discount_rate || 0,
          efficiency_dividend: data.efficiency_dividend || 0,
          revenue_assurance: data.revenue_assurance || 0,
          business_impact: data.business_impact || 'medium',
          it_risk: data.it_risk || 'medium',
          failure_probability: data.failure_probability || 'low',
          failure_impact: data.failure_impact || 'medium',
          risk_appetite: data.risk_appetite || 'moderate'
        });
      }
      
      return data;
    }
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('epic_spend')
        .upsert({
          epic_id: epic.id,
          ...formData
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['epic-spend'] });
      toast.success('Spend data saved');
    }
  });

  const handleSave = () => {
    saveMutation.mutate();
  };

  const totalSpend = formData.forecasted_spend + formData.estimated_spend + formData.accepted_spend;
  const budgetVariance = formData.budget - totalSpend;
  const budgetUtilization = formData.budget > 0 ? (totalSpend / formData.budget) * 100 : 0;

  return (
    <div className="space-y-6 p-6">
      <div className="text-sm text-muted-foreground mb-4">
        Track financial spend and investment metrics for this epic
      </div>

      {/* Spend Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="border border-border/60 rounded-lg cursor-pointer hover:shadow-md transition-shadow" onClick={() => { setDrilldownType('accepted'); setDrilldownOpen(true); }}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="h-4 w-4 text-brand-gold" />
              <span className="text-sm font-medium">Accepted Spend</span>
            </div>
            <div className="text-2xl font-bold">{formatCurrency(formData.accepted_spend)}</div>
            <Button variant="link" size="sm" className="mt-2 p-0 h-auto text-xs text-brand-gold">View breakdown</Button>
          </CardContent>
        </Card>

        <Card className="border border-border/60 rounded-lg cursor-pointer hover:shadow-md transition-shadow" onClick={() => { setDrilldownType('forecasted'); setDrilldownOpen(true); }}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-brand-gold" />
              <span className="text-sm font-medium">Forecasted Spend</span>
            </div>
            <div className="text-2xl font-bold">{formatCurrency(formData.forecasted_spend)}</div>
            <Button variant="link" size="sm" className="mt-2 p-0 h-auto text-xs text-brand-gold">View breakdown</Button>
          </CardContent>
        </Card>

        <Card className="border border-border/60 rounded-lg bg-success/10 cursor-pointer hover:shadow-md transition-shadow" onClick={() => { setDrilldownType('estimated'); setDrilldownOpen(true); }}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Calculator className="h-4 w-4 text-success" />
              <span className="text-sm font-medium">Estimated Spend</span>
            </div>
            <div className="text-2xl font-bold">{formatCurrency(formData.estimated_spend)}</div>
            <Button variant="link" size="sm" className="mt-2 p-0 h-auto text-xs text-brand-gold">View breakdown</Button>
          </CardContent>
        </Card>
      </div>

      {/* Budget Status Card */}
      <Card className="border border-border/60 rounded-lg">
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className={`h-5 w-5 ${budgetVariance < 0 ? 'text-destructive' : 'text-success'}`} />
              <div>
                <div className="text-sm font-medium">Budget Status</div>
                <div className="text-xs text-muted-foreground">{budgetUtilization.toFixed(1)}% utilized</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-muted-foreground">Budget</div>
              <div className="text-2xl font-bold">{formatCurrency(formData.budget)}</div>
              <div className={`text-sm font-medium ${budgetVariance < 0 ? 'text-destructive' : 'text-success'}`}>
                {budgetVariance < 0 ? 'Over' : 'Under'} by {formatCurrency(Math.abs(budgetVariance))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Budget & Spend Section */}
      <Card className="border border-border/60 rounded-lg">
        <CardContent className="p-5 space-y-4">
          <h3 className="text-sm font-semibold text-foreground">Budget & Spend</h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Budget (SAR)</Label>
              <Input
                type="number"
                value={formData.budget}
                onChange={(e) => setFormData({ ...formData, budget: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div>
              <Label>Work Code</Label>
              <Input
                value={formData.work_code}
                onChange={(e) => setFormData({ ...formData, work_code: e.target.value })}
                placeholder="e.g., WBS-12345"
              />
            </div>
            <div>
              <Label>Forecasted Spend (SAR)</Label>
              <Input
                type="number"
                value={formData.forecasted_spend}
                onChange={(e) => setFormData({ ...formData, forecasted_spend: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div>
              <Label>Estimated Spend (SAR)</Label>
              <Input
                type="number"
                value={formData.estimated_spend}
                onChange={(e) => setFormData({ ...formData, estimated_spend: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div>
              <Label>Accepted Spend (SAR)</Label>
              <Input
                type="number"
                value={formData.accepted_spend}
                onChange={(e) => setFormData({ ...formData, accepted_spend: parseFloat(e.target.value) || 0 })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Investment & ROI Section */}
      <Card className="border border-border/60 rounded-lg">
        <CardContent className="p-5 space-y-4">
          <h3 className="text-sm font-semibold text-foreground">Investment & ROI</h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Initial Investment (SAR)</Label>
              <Input
                type="number"
                value={formData.initial_investment}
                onChange={(e) => setFormData({ ...formData, initial_investment: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div>
              <Label>ROI (%)</Label>
              <Input
                type="number"
                value={formData.return_on_investment}
                onChange={(e) => setFormData({ ...formData, return_on_investment: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div>
              <Label>Discount Rate (%)</Label>
              <Input
                type="number"
                value={formData.discount_rate}
                onChange={(e) => setFormData({ ...formData, discount_rate: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div>
              <Label>Efficiency Dividend (SAR)</Label>
              <Input
                type="number"
                value={formData.efficiency_dividend}
                onChange={(e) => setFormData({ ...formData, efficiency_dividend: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div>
              <Label>Revenue Assurance (SAR)</Label>
              <Input
                type="number"
                value={formData.revenue_assurance}
                onChange={(e) => setFormData({ ...formData, revenue_assurance: parseFloat(e.target.value) || 0 })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Risk Assessment Section */}
      <Card className="border border-border/60 rounded-lg">
        <CardContent className="p-5 space-y-4">
          <h3 className="text-sm font-semibold text-foreground">Risk Assessment</h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Business Impact</Label>
              <Select value={formData.business_impact} onValueChange={(v) => setFormData({ ...formData, business_impact: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>IT Risk</Label>
              <Select value={formData.it_risk} onValueChange={(v) => setFormData({ ...formData, it_risk: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Failure Probability</Label>
              <Select value={formData.failure_probability} onValueChange={(v) => setFormData({ ...formData, failure_probability: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Failure Impact</Label>
              <Select value={formData.failure_impact} onValueChange={(v) => setFormData({ ...formData, failure_impact: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Risk Appetite</Label>
              <Select value={formData.risk_appetite} onValueChange={(v) => setFormData({ ...formData, risk_appetite: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="moderate">Moderate</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={saveMutation.isPending} className="bg-brand-gold hover:bg-brand-gold-hover text-white">
        Save Spend Data
      </Button>

      <SpendDrilldownModal
        epicId={epic.id}
        spendType={drilldownType}
        open={drilldownOpen}
        onOpenChange={setDrilldownOpen}
      />
    </div>
  );
}
