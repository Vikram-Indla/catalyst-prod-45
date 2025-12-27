import React from 'react';
import { EFDSession } from '../../types/efd.types';
import { Button } from '@/components/ui/button';
import { CheckCircle, Send } from 'lucide-react';

export const ApprovalStep: React.FC<{ session: EFDSession }> = ({ session }) => (
  <div className="max-w-4xl space-y-6">
    <h2 className="text-xl font-semibold">Approval</h2>
    {session.is_approved ? (
      <div className="flex items-center gap-2 p-4 bg-green-50 border border-green-200 rounded-lg">
        <CheckCircle className="h-5 w-5 text-green-600" />
        <span className="text-green-700">Approved</span>
      </div>
    ) : (
      <div className="border rounded-xl p-8 text-center bg-card">
        <p className="text-muted-foreground mb-4">Submit this session for approval</p>
        <Button><Send className="h-4 w-4 mr-2" />Submit for Approval</Button>
      </div>
    )}
  </div>
);
