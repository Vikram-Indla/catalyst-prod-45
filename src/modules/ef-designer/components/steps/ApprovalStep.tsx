import React, { useMemo } from 'react';
import { EFDSession } from '../../types/efd.types';
import { useEFDEpics, useEFDFeatures, useEFDAtoms } from '../../hooks/useEFDSession';
import { useSubmitForApproval, useApproveSession } from '../../hooks/useEFDMutations';
import { useAuth } from '@/lib/auth';
import { 
  CheckCircle, Send, Shield, AlertTriangle, 
  User, Clock, FileCheck, Loader2 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

export const ApprovalStep: React.FC<{ session: EFDSession }> = ({ session }) => {
  const { user } = useAuth();
  const { data: epics = [] } = useEFDEpics(session.id);
  const { data: features = [] } = useEFDFeatures(session.id);
  const { data: atoms = [] } = useEFDAtoms(session.id);
  
  const submitForApproval = useSubmitForApproval();
  const approveSession = useApproveSession();

  // Check critical gates
  const criticalGates = useMemo(() => {
    const hasTheme = !!session.theme_id;
    const hasEpics = epics.length > 0;
    const hasFeatures = features.length > 0;
    const mappedCount = atoms.filter((a: any) => a.status === 'mapped').length;
    const coverage = atoms.length > 0 ? (mappedCount / atoms.length) * 100 : 0;
    
    return {
      hasTheme,
      hasEpics,
      hasFeatures,
      coverageMet: coverage >= 50,
      allPassed: hasTheme && hasEpics && hasFeatures && coverage >= 50,
    };
  }, [session, epics, features, atoms]);

  const handleSubmit = () => {
    submitForApproval.mutate(session.id);
  };

  const handleApprove = () => {
    approveSession.mutate(session.id);
  };

  // Summary stats
  const stats = [
    { label: 'Epics', value: epics.length },
    { label: 'Features', value: features.length },
    { label: 'Requirements', value: atoms.length },
    { label: 'Mapped', value: atoms.filter((a: any) => a.status === 'mapped').length },
  ];

  if (session.is_approved) {
    return (
      <div className="max-w-3xl space-y-6">
        <div>
          <h2 className="text-xl font-semibold mb-1">Approval</h2>
          <p className="text-muted-foreground">This session has been approved</p>
        </div>

        <div className="border border-green-200 rounded-xl p-8 bg-gradient-to-br from-green-50 to-emerald-50 text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 mb-4">
            <CheckCircle className="h-10 w-10 text-green-600" />
          </div>
          <h3 className="text-2xl font-bold text-green-700 mb-2">Approved</h3>
          <p className="text-green-600 mb-4">
            This session was approved and is ready for publishing
          </p>
          
          <div className="flex items-center justify-center gap-6 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <User className="h-4 w-4" />
              <span>Approved by: {session.approved_by || 'System'}</span>
            </div>
            {session.approved_at && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>{format(new Date(session.approved_at), 'PPp')}</span>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4">
          {stats.map((stat) => (
            <div key={stat.label} className="border rounded-lg p-4 text-center bg-card">
              <div className="text-2xl font-bold">{stat.value}</div>
              <div className="text-sm text-muted-foreground">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-1">Approval</h2>
        <p className="text-muted-foreground">
          Review and approve this session before publishing
        </p>
      </div>

      {/* Pre-approval Checklist */}
      <div className="border rounded-xl overflow-hidden">
        <div className="p-4 bg-muted/50 flex items-center gap-2">
          <FileCheck className="h-5 w-5" />
          <h3 className="font-semibold">Pre-Approval Checklist</h3>
        </div>
        <div className="divide-y">
          <ChecklistItem 
            label="Strategic theme linked" 
            passed={criticalGates.hasTheme} 
          />
          <ChecklistItem 
            label="Epics generated" 
            passed={criticalGates.hasEpics} 
          />
          <ChecklistItem 
            label="Features generated" 
            passed={criticalGates.hasFeatures} 
          />
          <ChecklistItem 
            label="Minimum coverage (50%)" 
            passed={criticalGates.coverageMet} 
          />
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="border rounded-lg p-4 text-center bg-card">
            <div className="text-2xl font-bold">{stat.value}</div>
            <div className="text-sm text-muted-foreground">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Action */}
      {!criticalGates.allPassed ? (
        <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <AlertTriangle className="h-6 w-6 text-amber-600 mt-0.5" />
          <div>
            <h4 className="font-medium text-amber-700">Cannot approve yet</h4>
            <p className="text-sm text-amber-600">
              Please complete all checklist items before submitting for approval
            </p>
          </div>
        </div>
      ) : session.status === 'in_progress' ? (
        <div className="border rounded-xl p-8 text-center bg-gradient-to-br from-violet-50 to-violet-100">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-violet-200 mb-4">
            <Shield className="h-8 w-8 text-violet-600" />
          </div>
          <h3 className="text-xl font-semibold mb-2">Pending Approval</h3>
          <p className="text-muted-foreground mb-6">
            This session is awaiting approval
          </p>
          <Button size="lg" onClick={handleApprove} disabled={approveSession.isPending}>
            {approveSession.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            <CheckCircle className="h-4 w-4 mr-2" />
            Approve Session
          </Button>
        </div>
      ) : (
        <div className="border rounded-xl p-8 text-center bg-card">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
            <Send className="h-8 w-8 text-primary" />
          </div>
          <h3 className="text-xl font-semibold mb-2">Ready for Submission</h3>
          <p className="text-muted-foreground mb-6">
            All checklist items are complete. Submit this session for approval.
          </p>
          <Button size="lg" onClick={handleSubmit} disabled={submitForApproval.isPending}>
            {submitForApproval.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            <Send className="h-4 w-4 mr-2" />
            Submit for Approval
          </Button>
        </div>
      )}
    </div>
  );
};

const ChecklistItem: React.FC<{ label: string; passed: boolean }> = ({ label, passed }) => (
  <div className={`flex items-center gap-3 p-4 ${passed ? 'bg-green-50/50' : 'bg-background'}`}>
    {passed ? (
      <CheckCircle className="h-5 w-5 text-green-600" />
    ) : (
      <div className="w-5 h-5 rounded-full border-2 border-muted-foreground/30" />
    )}
    <span className={passed ? 'text-green-700' : 'text-muted-foreground'}>{label}</span>
    {passed && (
      <Badge variant="secondary" className="ml-auto bg-green-100 text-green-700">
        Complete
      </Badge>
    )}
  </div>
);
