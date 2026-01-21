/**
 * Module 5A-4: CI/CD Pipeline Integration - Webhook Setup Guide Component
 */

import { memo, useState } from 'react';
import { Copy, Check, ExternalLink, Terminal, Code } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  PIPELINE_PROVIDER_CONFIG, 
  WEBHOOK_PAYLOAD_EXAMPLE,
  type PipelineProvider 
} from '../types/pipeline';
import type { WebhookEndpoint } from '../types/pipeline';

interface WebhookSetupGuideProps {
  endpoint: WebhookEndpoint;
}

export const WebhookSetupGuide = memo(function WebhookSetupGuide({
  endpoint
}: WebhookSetupGuideProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const copyToClipboard = async (text: string, field: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const curlExample = `curl -X POST "${endpoint.url}" \\
  -H "Content-Type: application/json" \\
  -H "x-connector-id: ${endpoint.connector_id}" \\
  -d '${WEBHOOK_PAYLOAD_EXAMPLE}'`;

  const githubActionsExample = `# .github/workflows/test.yml
name: Run Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run tests
        run: npm test -- --json --outputFile=results.json
      
      - name: Report to Catalyst
        if: always()
        run: |
          curl -X POST "${endpoint.url}" \\
            -H "Content-Type: application/json" \\
            -H "x-connector-id: ${endpoint.connector_id}" \\
            -d @results.json`;

  const jenkinsExample = `// Jenkinsfile
pipeline {
    agent any
    stages {
        stage('Test') {
            steps {
                sh 'npm test -- --json > results.json'
            }
        }
    }
    post {
        always {
            script {
                def results = readJSON file: 'results.json'
                httpRequest(
                    url: '${endpoint.url}',
                    httpMode: 'POST',
                    contentType: 'APPLICATION_JSON',
                    customHeaders: [[name: 'x-connector-id', value: '${endpoint.connector_id}']],
                    requestBody: groovy.json.JsonOutput.toJson(results)
                )
            }
        }
    }
}`;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Terminal className="w-5 h-5" />
          Webhook Setup - {endpoint.connector_name}
        </CardTitle>
        <CardDescription>
          Configure your CI/CD pipeline to send test results to this endpoint
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Endpoint URL */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Webhook URL</label>
          <div className="flex items-center gap-2">
            <code className="flex-1 px-3 py-2 bg-muted rounded-md text-sm font-mono overflow-x-auto">
              {endpoint.url}
            </code>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => copyToClipboard(endpoint.url, 'url')}
            >
              {copiedField === 'url' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        {/* Connector ID */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Connector ID (Header: x-connector-id)</label>
          <div className="flex items-center gap-2">
            <code className="flex-1 px-3 py-2 bg-muted rounded-md text-sm font-mono">
              {endpoint.connector_id}
            </code>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => copyToClipboard(endpoint.connector_id, 'id')}
            >
              {copiedField === 'id' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        {/* Integration Examples */}
        <div className="space-y-2 pt-4">
          <label className="text-sm font-medium flex items-center gap-2">
            <Code className="w-4 h-4" />
            Integration Examples
          </label>
          
          <Tabs defaultValue="curl" className="w-full">
            <TabsList className="grid grid-cols-3 w-full">
              <TabsTrigger value="curl">cURL</TabsTrigger>
              <TabsTrigger value="github">GitHub Actions</TabsTrigger>
              <TabsTrigger value="jenkins">Jenkins</TabsTrigger>
            </TabsList>
            
            <TabsContent value="curl">
              <ScrollArea className="h-48 w-full rounded-md border">
                <pre className="p-4 text-xs font-mono bg-muted/50">
                  {curlExample}
                </pre>
              </ScrollArea>
              <Button 
                variant="ghost" 
                size="sm" 
                className="mt-2"
                onClick={() => copyToClipboard(curlExample, 'curl')}
              >
                {copiedField === 'curl' ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                Copy cURL command
              </Button>
            </TabsContent>
            
            <TabsContent value="github">
              <ScrollArea className="h-48 w-full rounded-md border">
                <pre className="p-4 text-xs font-mono bg-muted/50">
                  {githubActionsExample}
                </pre>
              </ScrollArea>
              <Button 
                variant="ghost" 
                size="sm" 
                className="mt-2"
                onClick={() => copyToClipboard(githubActionsExample, 'github')}
              >
                {copiedField === 'github' ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                Copy workflow
              </Button>
            </TabsContent>
            
            <TabsContent value="jenkins">
              <ScrollArea className="h-48 w-full rounded-md border">
                <pre className="p-4 text-xs font-mono bg-muted/50">
                  {jenkinsExample}
                </pre>
              </ScrollArea>
              <Button 
                variant="ghost" 
                size="sm" 
                className="mt-2"
                onClick={() => copyToClipboard(jenkinsExample, 'jenkins')}
              >
                {copiedField === 'jenkins' ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                Copy Jenkinsfile
              </Button>
            </TabsContent>
          </Tabs>
        </div>

        {/* Payload Format */}
        <div className="space-y-2 pt-4">
          <label className="text-sm font-medium">Expected Payload Format</label>
          <ScrollArea className="h-40 w-full rounded-md border">
            <pre className="p-4 text-xs font-mono bg-muted/50">
              {WEBHOOK_PAYLOAD_EXAMPLE}
            </pre>
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  );
});
