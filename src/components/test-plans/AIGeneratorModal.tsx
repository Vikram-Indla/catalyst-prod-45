import { useState } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AIGeneratorModalProps {
  open: boolean;
  onClose: () => void;
  onGenerate: (planData: {
    name: string;
    description: string;
    objectives: string;
    entry_criteria: string;
    exit_criteria: string;
    risks_assumptions: string;
  }) => void;
}

export function AIGeneratorModal({ open, onClose, onGenerate }: AIGeneratorModalProps) {
  const [context, setContext] = useState('');
  const [planType, setPlanType] = useState('regression');
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    if (!context.trim()) {
      toast.error('Please describe what you want to test');
      return;
    }

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-test-plan', {
        body: { context, planType },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      onGenerate(data);
      onClose();
      toast.success('Test plan generated!');
    } catch (error) {
      console.error('AI generation error:', error);
      // Fallback: Generate locally
      const generated = generateLocalPlan(context, planType);
      onGenerate(generated);
      onClose();
      toast.success('Test plan generated!');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleClose = () => {
    onClose();
    setContext('');
    setPlanType('regression');
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Create with AI
          </DialogTitle>
          <DialogDescription>
            Describe your testing needs and AI will generate a test plan
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Plan Type</Label>
            <Select value={planType} onValueChange={setPlanType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="regression">Regression Testing</SelectItem>
                <SelectItem value="feature">New Feature Testing</SelectItem>
                <SelectItem value="integration">Integration Testing</SelectItem>
                <SelectItem value="performance">Performance Testing</SelectItem>
                <SelectItem value="security">Security Testing</SelectItem>
                <SelectItem value="uat">User Acceptance Testing</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Describe what you need to test</Label>
            <Textarea
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder="e.g., We're releasing a new payment module with credit card processing, refunds, and subscription billing. Need to test all payment flows, error handling, and integration with our existing checkout..."
              rows={5}
            />
            <p className="text-xs text-muted-foreground">Include features, modules, or areas to test</p>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={handleClose} disabled={isGenerating}>Cancel</Button>
            <Button onClick={handleGenerate} disabled={isGenerating || !context.trim()}>
              {isGenerating ? (
                <><Loader2 className="h-4 w-4 animate-spin mr-2" />Generating...</>
              ) : (
                <><Sparkles className="h-4 w-4 mr-2" />Generate Plan</>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Local fallback generator
function generateLocalPlan(context: string, planType: string) {
  const typeLabels: Record<string, string> = {
    regression: 'Regression', feature: 'Feature', integration: 'Integration',
    performance: 'Performance', security: 'Security', uat: 'UAT',
  };
  const planLabel = typeLabels[planType] || 'Test';
  const keywords = context.split(/\s+/).filter(w => w.length > 4).slice(0, 3);
  const featureName = keywords.length > 0 ? keywords.join(' ') : 'Application';

  return {
    name: `${planLabel} Test Plan - ${featureName}`,
    description: `${planLabel} testing for: ${context.slice(0, 200)}${context.length > 200 ? '...' : ''}`,
    objectives: generateObjectives(planType),
    entry_criteria: [
      '• Code complete and deployed to test environment',
      '• Test environment stable and accessible',
      '• Test data prepared and loaded',
      '• All dependencies available and configured',
      '• Test cases reviewed and approved',
      '• Required access and permissions granted',
    ].join('\n'),
    exit_criteria: generateExitCriteria(planType),
    risks_assumptions: [
      '**Risks:**',
      '• Test environment instability may delay execution',
      '• Resource availability constraints',
      '• Scope changes during test cycle',
      '• Third-party dependencies may be unavailable',
      '',
      '**Assumptions:**',
      '• Test environment mirrors production configuration',
      '• Test data is representative of production',
      '• All required integrations are available',
      '• Team has necessary skills and access',
    ].join('\n'),
  };
}

function generateObjectives(type: string): string {
  const map: Record<string, string[]> = {
    regression: ['Verify existing functionality remains intact after changes', 'Ensure no new defects introduced by recent updates', 'Validate backward compatibility with existing features', 'Confirm all critical user journeys function correctly'],
    feature: ['Validate new feature meets all acceptance criteria', 'Ensure proper integration with existing system components', 'Verify all user stories are implemented correctly', 'Confirm edge cases and error scenarios are handled'],
    integration: ['Verify data flows correctly between system components', 'Ensure API contracts are honored by all parties', 'Validate third-party integrations function as expected', 'Confirm error handling across integration points'],
    performance: ['Validate system meets performance requirements under load', 'Identify performance bottlenecks and optimization areas', 'Ensure response times are within acceptable thresholds', 'Verify system stability under sustained usage'],
    security: ['Verify authentication and authorization controls', 'Test for common security vulnerabilities (OWASP Top 10)', 'Validate data encryption and secure transmission', 'Ensure audit logging captures security events'],
    uat: ['Validate system meets business requirements', 'Ensure user workflows are intuitive and efficient', 'Confirm all stakeholder expectations are addressed', 'Verify production readiness from end-user perspective'],
  };
  return (map[type] || map.feature).map((o, i) => `${i + 1}. ${o}`).join('\n');
}

function generateExitCriteria(type: string): string {
  const map: Record<string, string[]> = {
    regression: ['• 100% of regression test cases executed', '• Pass rate ≥ 95%', '• No critical or high severity defects open', '• All P1 test cases passed'],
    feature: ['• All acceptance criteria verified', '• 100% of feature test cases executed', '• No critical defects open', '• Product owner sign-off obtained'],
    performance: ['• All performance targets met', '• System handles expected load + 20% buffer', '• No memory leaks or resource exhaustion', '• Response times within SLA thresholds'],
    security: ['• All security test cases executed', '• No critical or high security vulnerabilities', '• Penetration test completed', '• Security team sign-off obtained'],
  };
  return (map[type] || ['• All planned test cases executed', '• Pass rate ≥ 90%', '• No critical defects open', '• Stakeholder approval received']).join('\n');
}
