/**
 * Module 3B-4: Environment list component
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Server } from 'lucide-react';
import { EnvironmentCard } from './EnvironmentCard';
import type { Environment } from '../../types/resource-allocation';

interface EnvironmentListProps {
  environments: Environment[];
  isLoading?: boolean;
  onAllocate?: (envId: string) => void;
  onDeallocate?: (envId: string) => void;
}

export function EnvironmentList({
  environments,
  isLoading,
  onAllocate,
  onDeallocate,
}: EnvironmentListProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="h-5 w-5" />
            Environments
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-20 bg-muted rounded-lg animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Server className="h-5 w-5" />
          Environments
          <span className="text-sm font-normal text-muted-foreground">
            ({environments.length})
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {environments.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Server className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No environments configured</p>
          </div>
        ) : (
          <div className="space-y-3">
            {environments.map((env) => (
              <EnvironmentCard
                key={env.id}
                environment={env}
                onAllocate={onAllocate}
                onDeallocate={onDeallocate}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
