/**
 * Resolves active Supabase environment at runtime.
 * Used by all Jira Integration backend operations.
 *
 * Catalyst has two Supabase projects:
 * - Production: lmqwtldpfacrrlvdnmld (catalyst-prod)
 * - Staging: cyijbdeuehohvhnsywig (catalyst-staging)
 *
 * Environment is determined by VITE_SUPABASE_URL at app load.
 * All Jira Integration operations (sync, refresh, webhooks) must use the ACTIVE environment.
 */

export type JiraEnvironment = 'staging' | 'production' | 'local';

export interface EnvironmentConfig {
  environment: JiraEnvironment;
  supabaseProjectRef: string;
  supabaseUrl: string;
  isStagingRuntime: boolean;
  isProductionRuntime: boolean;
}

export function resolveJiraEnvironment(): EnvironmentConfig {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ||
    'https://lmqwtldpfacrrlvdnmld.supabase.co';

  // Extract project ref from URL
  const projectRefMatch = supabaseUrl.match(/https:\/\/([\w]+)\.supabase\.co/);
  const projectRef = projectRefMatch?.[1] || 'unknown';

  let environment: JiraEnvironment;

  if (projectRef === 'cyijbdeuehohvhnsywig') {
    environment = 'staging';
  } else if (projectRef === 'lmqwtldpfacrrlvdnmld') {
    environment = 'production';
  } else {
    environment = 'local';
  }

  return {
    environment,
    supabaseProjectRef: projectRef,
    supabaseUrl,
    isStagingRuntime: environment === 'staging',
    isProductionRuntime: environment === 'production',
  };
}

export function assertProductionAccess(operation: string) {
  const env = resolveJiraEnvironment();
  if (env.environment !== 'production') {
    throw new Error(
      `${operation} is production-only. Current environment: ${env.environment}`
    );
  }
}

export function getEnvironmentLabel(environment: JiraEnvironment): string {
  const labels = {
    staging: '🟡 STAGING',
    production: '🔴 PRODUCTION',
    local: '⚪ LOCAL',
  };
  return labels[environment];
}

export function getEnvironmentBadgeVariant(environment: JiraEnvironment): 'destructive' | 'secondary' {
  return environment === 'production' ? 'destructive' : 'secondary';
}
