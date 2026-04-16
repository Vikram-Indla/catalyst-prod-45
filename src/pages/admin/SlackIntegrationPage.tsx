// ============================================================
// CATALYST SLACK ADMIN - Main Page
// ============================================================

import React, { useEffect } from 'react';
import { CatalystPageHeader } from '@/components/shared/CatalystPageHeader';
import { useSearchParams } from 'react-router-dom';
import {
  useSlackConfig,
  useSlackStats,
  useSlackInstallCallback,
} from '@/hooks/useSlackAdmin';
import { SlackSetupWizard } from '@/components/admin/slack/SlackSetupWizard';
import { SlackDashboard } from '@/components/admin/slack/SlackDashboard';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

// Slack icon component
const SlackIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zm1.271 0a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zm0 1.271a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zm10.123 2.521a2.528 2.528 0 0 1 2.521-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.521V8.834zm-1.271 0a2.528 2.528 0 0 1-2.521 2.521 2.528 2.528 0 0 1-2.521-2.521V2.522A2.528 2.528 0 0 1 15.165 0a2.528 2.528 0 0 1 2.521 2.522v6.312zm-2.521 10.123a2.528 2.528 0 0 1 2.521 2.521A2.528 2.528 0 0 1 15.165 24a2.528 2.528 0 0 1-2.521-2.522v-2.521h2.521zm0-1.271a2.528 2.528 0 0 1-2.521-2.521 2.528 2.528 0 0 1 2.521-2.521h6.313A2.528 2.528 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.521h-6.313z"/>
  </svg>
);

// ============================================================
// MAIN PAGE COMPONENT
// ============================================================

export function SlackIntegrationPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: config, isLoading: configLoading, error: configError } = useSlackConfig();
  const { data: stats } = useSlackStats();
  const installCallback = useSlackInstallCallback();

  // Handle OAuth callback
  useEffect(() => {
    const code = searchParams.get('code');
    const error = searchParams.get('error');

    if (error) {
      // Clear params
      setSearchParams({});
      return;
    }

    if (code) {
      installCallback.mutate(code, {
        onSettled: () => {
          setSearchParams({});
        },
      });
    }
  }, [searchParams]);

  // Loading state
  if (configLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-3 mb-6">
          <Skeleton className="w-10 h-10 rounded-lg" />
          <div>
            <Skeleton className="h-6 w-48 mb-2" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>
        <Skeleton className="h-96 w-full rounded-xl" />
      </div>
    );
  }

  // Error state
  if (configError) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error loading Slack configuration</AlertTitle>
          <AlertDescription>
            {configError instanceof Error ? configError.message : 'Unknown error'}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Determine which view to show
  const showWizard = !config || !config.is_configured;
  const showDashboard = config && config.is_configured;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Page Header */}
      <div className="flex items-center gap-4 mb-8">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: '#4A154B' }}
        >
          <SlackIcon className="w-6 h-6 text-white" />
        </div>
        <CatalystPageHeader title="Slack Integration" />
      </div>

      {/* Processing callback */}
      {installCallback.isPending && (
        <Card className="mb-6">
          <CardContent className="py-8 text-center">
            <div className="w-8 h-8 border-2 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-slate-600">Connecting to Slack workspace...</p>
          </CardContent>
        </Card>
      )}

      {/* Main Content */}
      {showWizard && <SlackSetupWizard existingConfig={config} />}
      {showDashboard && <SlackDashboard config={config} stats={stats} />}
    </div>
  );
}

export default SlackIntegrationPage;
