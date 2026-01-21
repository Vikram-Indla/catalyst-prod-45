/**
 * Module 5A-4: CI/CD Pipeline Integration - Types
 */

export type PipelineProvider = 'github' | 'gitlab' | 'jenkins' | 'azure' | 'circleci' | 'custom';

export interface PipelineConfig {
  provider: PipelineProvider;
  name: string;
  url?: string;
  branch_filter?: string;
}

export interface PipelineRun {
  id: string;
  connector_id: string;
  pipeline_name: string;
  pipeline_url?: string;
  commit_sha?: string;
  branch?: string;
  status: 'success' | 'failure' | 'running' | 'cancelled';
  started_at: string;
  completed_at?: string;
  total_tests: number;
  passed: number;
  failed: number;
  skipped: number;
}

export interface WebhookEndpoint {
  url: string;
  secret: string | null;
  connector_id: string;
  connector_name: string;
}

export const PIPELINE_PROVIDER_CONFIG: Record<PipelineProvider, {
  label: string;
  icon: string;
  color: string;
  docUrl: string;
}> = {
  github: { 
    label: 'GitHub Actions', 
    icon: '🐙', 
    color: 'hsl(var(--foreground))',
    docUrl: 'https://docs.github.com/en/actions/using-workflows/events-that-trigger-workflows#webhook-events'
  },
  gitlab: { 
    label: 'GitLab CI', 
    icon: '🦊', 
    color: 'hsl(var(--warning))',
    docUrl: 'https://docs.gitlab.com/ee/user/project/integrations/webhooks.html'
  },
  jenkins: { 
    label: 'Jenkins', 
    icon: '🔧', 
    color: 'hsl(var(--destructive))',
    docUrl: 'https://www.jenkins.io/doc/book/pipeline/jenkinsfile/'
  },
  azure: { 
    label: 'Azure Pipelines', 
    icon: '☁️', 
    color: 'hsl(var(--info))',
    docUrl: 'https://docs.microsoft.com/en-us/azure/devops/pipelines/'
  },
  circleci: { 
    label: 'CircleCI', 
    icon: '⚡', 
    color: 'hsl(var(--primary))',
    docUrl: 'https://circleci.com/docs/webhooks/'
  },
  custom: { 
    label: 'Custom', 
    icon: '⚙️', 
    color: 'hsl(var(--muted-foreground))',
    docUrl: ''
  }
};

// Webhook payload example for documentation
export const WEBHOOK_PAYLOAD_EXAMPLE = `{
  "connector_id": "uuid-of-connector",
  "pipeline_name": "CI Pipeline",
  "pipeline_url": "https://github.com/org/repo/actions/runs/123",
  "commit_sha": "abc123",
  "branch": "main",
  "results": [
    {
      "external_test_id": "test_login_success",
      "external_test_name": "Login - Success Flow",
      "status": "passed",
      "duration_ms": 1234
    },
    {
      "external_test_id": "test_login_failure",
      "external_test_name": "Login - Invalid Credentials",
      "status": "failed",
      "duration_ms": 567,
      "error_message": "Expected 401, got 200"
    }
  ]
}`;