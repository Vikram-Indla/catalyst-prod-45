/**
 * Module 3C-3: Update Results Component
 */

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle, XCircle, RotateCcw, FileText, Settings, AlertTriangle } from 'lucide-react';
import type { UpdateResult } from '../../types/batch-update';

interface UpdateResultsProps {
  result: UpdateResult;
  onNewUpdate: () => void;
}

export function UpdateResults({ result, onNewUpdate }: UpdateResultsProps) {
  const hasFailures = result.failed > 0;

  return (
    <div className="flex flex-col items-center justify-center py-8 space-y-6">
      {/* Success/Warning Icon */}
      <div
        className={`flex items-center justify-center w-20 h-20 rounded-full ${
          hasFailures ? 'bg-yellow-500/10' : 'bg-green-500/10'
        }`}
      >
        {hasFailures ? (
          <AlertTriangle className="w-10 h-10 text-yellow-500" />
        ) : (
          <CheckCircle className="w-10 h-10 text-green-500" />
        )}
      </div>

      {/* Result Message */}
      <div className="text-center">
        <h3 className="text-xl font-semibold">
          {hasFailures ? 'Update Completed with Warnings' : 'Update Successful!'}
        </h3>
        <p className="text-muted-foreground mt-1">
          {hasFailures
            ? 'Some test cases could not be updated'
            : 'All test cases have been updated'}
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-3 gap-4 w-full max-w-md">
        <Card>
          <CardContent className="p-4 text-center">
            <FileText className="w-5 h-5 text-muted-foreground mx-auto mb-2" />
            <p className="text-2xl font-bold">{result.total}</p>
            <p className="text-xs text-muted-foreground">Total</p>
          </CardContent>
        </Card>

        <Card className="border-green-200 bg-green-50/50">
          <CardContent className="p-4 text-center">
            <CheckCircle className="w-5 h-5 text-green-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-green-600">{result.updated}</p>
            <p className="text-xs text-muted-foreground">Updated</p>
          </CardContent>
        </Card>

        <Card className={hasFailures ? 'border-red-200 bg-red-50/50' : ''}>
          <CardContent className="p-4 text-center">
            <XCircle className={`w-5 h-5 mx-auto mb-2 ${hasFailures ? 'text-destructive' : 'text-muted-foreground'}`} />
            <p className={`text-2xl font-bold ${hasFailures ? 'text-destructive' : ''}`}>{result.failed}</p>
            <p className="text-xs text-muted-foreground">Failed</p>
          </CardContent>
        </Card>
      </div>

      {/* Fields Changed */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Settings className="w-4 h-4" />
        <span>{result.fieldsChanged} field{result.fieldsChanged !== 1 ? 's' : ''} updated</span>
      </div>

      {/* Action Button */}
      <Button onClick={onNewUpdate}>
        <RotateCcw className="w-4 h-4 mr-2" />
        Start New Update
      </Button>
    </div>
  );
}
