// ============================================================
// CATALYST SLACK ADMIN - Setup Wizard
// ============================================================

import React, { useState } from 'react';
import {
  useSaveSlackConfig,
  useSlackInstallUrl,
  useTestSlackConnection,
  SlackConfig,
} from '@/hooks/useSlackAdmin';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Lozenge } from '@/components/ads';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  CheckCircle,
  ChevronRight,
  ChevronLeft,
  Copy,
  ExternalLink,
  Key,
  Link2,
  Settings,
  TestTube,
  Zap,
  AlertCircle,
  Check,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// Slack icon component
const SlackIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zm1.271 0a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zm0 1.271a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zm10.123 2.521a2.528 2.528 0 0 1 2.521-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.521V8.834zm-1.271 0a2.528 2.528 0 0 1-2.521 2.521 2.528 2.528 0 0 1-2.521-2.521V2.522A2.528 2.528 0 0 1 15.165 0a2.528 2.528 0 0 1 2.521 2.522v6.312zm-2.521 10.123a2.528 2.528 0 0 1 2.521 2.521A2.528 2.528 0 0 1 15.165 24a2.528 2.528 0 0 1-2.521-2.522v-2.521h2.521zm0-1.271a2.528 2.528 0 0 1-2.521-2.521 2.528 2.528 0 0 1 2.521-2.521h6.313A2.528 2.528 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.521h-6.313z"/>
  </svg>
);

// ============================================================
// TYPES
// ============================================================

interface WizardProps {
  existingConfig: SlackConfig | null | undefined;
}

// ============================================================
// STEP DEFINITIONS
// ============================================================

const STEPS = [
  { id: 1, title: 'Create Slack App', icon: SlackIcon },
  { id: 2, title: 'Enter Credentials', icon: Key },
  { id: 3, title: 'Configure Scopes', icon: Settings },
  { id: 4, title: 'Set Redirect URL', icon: Link2 },
  { id: 5, title: 'Install to Workspace', icon: Zap },
  { id: 6, title: 'Test Connection', icon: TestTube },
];

const DEFAULT_SCOPES = [
  { id: 'chat:write', label: 'Send messages', description: 'Send DM notifications to users', required: true },
  { id: 'im:write', label: 'Open DMs', description: 'Open direct message channels', required: true },
  { id: 'users:read', label: 'Read users', description: 'Read user profile information', required: true },
  { id: 'users:read.email', label: 'Read emails', description: 'Match users by email address', required: true },
  { id: 'channels:read', label: 'Read channels', description: 'List available channels for routing', required: false },
  { id: 'groups:read', label: 'Read private channels', description: 'Access private channels', required: false },
];

// ============================================================
// WIZARD COMPONENT
// ============================================================

export function SlackSetupWizard({ existingConfig }: WizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    app_id: existingConfig?.app_id || '',
    client_id: existingConfig?.client_id || '',
    client_secret: '',
    signing_secret: '',
    redirect_uri: existingConfig?.redirect_uri || `${window.location.origin}/admin/slack`,
    bot_scopes: existingConfig?.bot_scopes || DEFAULT_SCOPES.filter(s => s.required).map(s => s.id),
    send_dm_by_default: existingConfig?.send_dm_by_default ?? true,
    send_to_channel: existingConfig?.send_to_channel ?? false,
  });

  const saveConfig = useSaveSlackConfig();
  const getInstallUrl = useSlackInstallUrl();
  const testConnection = useTestSlackConnection();

  const updateFormData = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleNext = () => {
    if (currentStep < STEPS.length) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleSaveAndContinue = async () => {
    try {
      await saveConfig.mutateAsync({
        app_id: formData.app_id,
        client_id: formData.client_id,
        client_secret: formData.client_secret,
        signing_secret: formData.signing_secret,
        redirect_uri: formData.redirect_uri,
        bot_scopes: formData.bot_scopes,
        send_dm_by_default: formData.send_dm_by_default,
        send_to_channel: formData.send_to_channel,
      });
      handleNext();
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleInstall = async () => {
    try {
      const { url } = await getInstallUrl.mutateAsync();
      window.location.href = url;
    } catch (error) {
      toast.error('Failed to generate install URL');
    }
  };

  const handleTest = async () => {
    await testConnection.mutateAsync({});
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  return (
    <div className="space-y-6">
      {/* Progress Steps */}
      <Card>
        <CardContent className="py-6">
          <div className="flex items-center justify-between">
            {STEPS.map((step, index) => {
              const Icon = step.icon;
              const isActive = step.id === currentStep;
              const isCompleted = step.id < currentStep;

              return (
                <React.Fragment key={step.id}>
                  <div className="flex flex-col items-center">
                    <div
                      className={cn(
                        'w-10 h-10 rounded-full flex items-center justify-center transition-colors',
                        isCompleted && 'bg-green-500 text-white',
                        isActive && 'bg-blue-600 text-white',
                        !isCompleted && !isActive && 'bg-slate-100 text-slate-400'
                      )}
                    >
                      {isCompleted ? (
                        <CheckCircle className="w-5 h-5" />
                      ) : (
                        <Icon className="w-5 h-5" />
                      )}
                    </div>
                    <span
                      className={cn(
                        'text-xs mt-2 font-medium',
                        isActive ? 'text-blue-600' : 'text-slate-500'
                      )}
                    >
                      {step.title}
                    </span>
                  </div>
                  {index < STEPS.length - 1 && (
                    <div
                      className={cn(
                        'flex-1 h-0.5 mx-2',
                        step.id < currentStep ? 'bg-green-500' : 'bg-slate-200'
                      )}
                    />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Step Content */}
      <Card>
        <CardContent className="py-8">
          {/* Step 1: Create Slack App */}
          {currentStep === 1 && (
            <div className="max-w-2xl mx-auto space-y-6">
              <div className="text-center mb-8">
                <div className="w-16 h-16 rounded-2xl bg-blue-100 flex items-center justify-center mx-auto mb-4">
                  <SlackIcon className="w-8 h-8 text-blue-600" />
                </div>
                <h2 className="text-xl font-semibold text-slate-900">Create a Slack App</h2>
                <p className="text-slate-500 mt-2">
                  First, you need to create a Slack App in your workspace
                </p>
              </div>

              <div className="bg-slate-50 rounded-lg p-6 space-y-4">
                <h3 className="font-medium text-slate-900">Follow these steps:</h3>
                <ol className="space-y-3 text-sm text-slate-600">
                  <li className="flex gap-3">
                    <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold flex-shrink-0">1</span>
                    <span>Go to <a href="https://api.slack.com/apps" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-medium">api.slack.com/apps</a></span>
                  </li>
                  <li className="flex gap-3">
                    <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold flex-shrink-0">2</span>
                    <span>Click <strong>"Create New App"</strong> → <strong>"From scratch"</strong></span>
                  </li>
                  <li className="flex gap-3">
                    <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold flex-shrink-0">3</span>
                    <span>Enter app name (e.g., "Catalyst Notifications") and select your workspace</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold flex-shrink-0">4</span>
                    <span>Click <strong>"Create App"</strong></span>
                  </li>
                </ol>
              </div>

              <Button
                onClick={handleNext}
                className="w-full"
                style={{ backgroundColor: 'var(--cp-blue)' }}
              >
                I've Created the App
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>

              <Button
                variant="outline"
                className="w-full"
                onClick={() => window.open('https://api.slack.com/apps', '_blank')}
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Open Slack API Console
              </Button>
            </div>
          )}

          {/* Step 2: Enter Credentials */}
          {currentStep === 2 && (
            <div className="max-w-2xl mx-auto space-y-6">
              <div className="text-center mb-8">
                <div className="w-16 h-16 rounded-2xl bg-blue-100 flex items-center justify-center mx-auto mb-4">
                  <Key className="w-8 h-8 text-blue-600" />
                </div>
                <h2 className="text-xl font-semibold text-slate-900">Enter App Credentials</h2>
                <p className="text-slate-500 mt-2">
                  Copy credentials from your Slack App's "Basic Information" page
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="app_id">App ID</Label>
                  <Input
                    id="app_id"
                    placeholder="A0A92EJ6TFZ"
                    value={formData.app_id}
                    onChange={(e) => updateFormData('app_id', e.target.value)}
                    className="mt-1.5"
                  />
                  <p className="text-xs text-slate-500 mt-1">Found at the top of Basic Information</p>
                </div>

                <div>
                  <Label htmlFor="client_id">Client ID <span className="text-red-500">*</span></Label>
                  <Input
                    id="client_id"
                    placeholder="6918807045377.10308494231543"
                    value={formData.client_id}
                    onChange={(e) => updateFormData('client_id', e.target.value)}
                    className="mt-1.5"
                  />
                </div>

                <div>
                  <Label htmlFor="client_secret">Client Secret <span className="text-red-500">*</span></Label>
                  <Input
                    id="client_secret"
                    type="password"
                    placeholder="Click 'Show' in Slack to reveal, then paste here"
                    value={formData.client_secret}
                    onChange={(e) => updateFormData('client_secret', e.target.value)}
                    className="mt-1.5"
                  />
                  <p className="text-xs text-slate-500 mt-1">Click "Show" button in Slack to reveal</p>
                </div>

                <div>
                  <Label htmlFor="signing_secret">Signing Secret (optional)</Label>
                  <Input
                    id="signing_secret"
                    type="password"
                    placeholder="For verifying Slack requests"
                    value={formData.signing_secret}
                    onChange={(e) => updateFormData('signing_secret', e.target.value)}
                    className="mt-1.5"
                  />
                </div>
              </div>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Your credentials are encrypted before storage and never exposed in the UI.
                </AlertDescription>
              </Alert>

              <div className="flex gap-3">
                <Button variant="outline" onClick={handleBack} className="flex-1">
                  <ChevronLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                <Button
                  onClick={handleNext}
                  disabled={!formData.client_id || !formData.client_secret}
                  className="flex-1"
                  style={{ backgroundColor: 'var(--cp-blue)' }}
                >
                  Continue
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Configure Scopes */}
          {currentStep === 3 && (
            <div className="max-w-2xl mx-auto space-y-6">
              <div className="text-center mb-8">
                <div className="w-16 h-16 rounded-2xl bg-blue-100 flex items-center justify-center mx-auto mb-4">
                  <Settings className="w-8 h-8 text-blue-600" />
                </div>
                <h2 className="text-xl font-semibold text-slate-900">Configure OAuth Scopes</h2>
                <p className="text-slate-500 mt-2">
                  Add these scopes in Slack App → OAuth & Permissions → Bot Token Scopes
                </p>
              </div>

              <div className="space-y-3">
                {DEFAULT_SCOPES.map((scope) => {
                  const isSelected = formData.bot_scopes.includes(scope.id);
                  return (
                    <div
                      key={scope.id}
                      className={cn(
                        'flex items-center justify-between p-4 rounded-lg border transition-colors',
                        isSelected ? 'border-blue-200 bg-blue-50' : 'border-slate-200'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <Checkbox
                          checked={isSelected}
                          disabled={scope.required}
                          onCheckedChange={(checked) => {
                            if (scope.required) return;
                            if (checked) {
                              updateFormData('bot_scopes', [...formData.bot_scopes, scope.id]);
                            } else {
                              updateFormData('bot_scopes', formData.bot_scopes.filter(s => s !== scope.id));
                            }
                          }}
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <code className="text-sm font-mono bg-slate-100 px-2 py-0.5 rounded">
                              {scope.id}
                            </code>
                            {scope.required && (
                              <Lozenge appearance="default">Required</Lozenge>
                            )}
                          </div>
                          <p className="text-sm text-slate-500 mt-0.5">{scope.description}</p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(scope.id)}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  );
                })}
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <p className="text-sm text-amber-800">
                  <strong>Important:</strong> Add these scopes in Slack before continuing. 
                  Go to OAuth & Permissions → Scroll to "Bot Token Scopes" → Add each scope.
                </p>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={handleBack} className="flex-1">
                  <ChevronLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                <Button
                  onClick={handleNext}
                  className="flex-1"
                  style={{ backgroundColor: 'var(--cp-blue)' }}
                >
                  I've Added the Scopes
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 4: Set Redirect URL */}
          {currentStep === 4 && (
            <div className="max-w-2xl mx-auto space-y-6">
              <div className="text-center mb-8">
                <div className="w-16 h-16 rounded-2xl bg-blue-100 flex items-center justify-center mx-auto mb-4">
                  <Link2 className="w-8 h-8 text-blue-600" />
                </div>
                <h2 className="text-xl font-semibold text-slate-900">Set Redirect URL</h2>
                <p className="text-slate-500 mt-2">
                  Add this URL to your Slack App's OAuth & Permissions → Redirect URLs
                </p>
              </div>

              <div>
                <Label>Redirect URL</Label>
                <div className="flex gap-2 mt-1.5">
                  <Input
                    value={formData.redirect_uri}
                    onChange={(e) => updateFormData('redirect_uri', e.target.value)}
                    className="flex-1 font-mono text-sm"
                  />
                  <Button
                    variant="outline"
                    onClick={() => copyToClipboard(formData.redirect_uri)}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="bg-slate-50 rounded-lg p-6 space-y-3">
                <h3 className="font-medium text-slate-900">In Slack App Console:</h3>
                <ol className="space-y-2 text-sm text-slate-600">
                  <li className="flex gap-3">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold flex-shrink-0">1</span>
                    <span>Go to <strong>OAuth & Permissions</strong></span>
                  </li>
                  <li className="flex gap-3">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold flex-shrink-0">2</span>
                    <span>Scroll to <strong>Redirect URLs</strong></span>
                  </li>
                  <li className="flex gap-3">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold flex-shrink-0">3</span>
                    <span>Click <strong>Add New Redirect URL</strong></span>
                  </li>
                  <li className="flex gap-3">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold flex-shrink-0">4</span>
                    <span>Paste the URL above and click <strong>Save URLs</strong></span>
                  </li>
                </ol>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={handleBack} className="flex-1">
                  <ChevronLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                <Button
                  onClick={handleSaveAndContinue}
                  disabled={saveConfig.isPending}
                  className="flex-1"
                  style={{ backgroundColor: 'var(--cp-blue)' }}
                >
                  {saveConfig.isPending ? 'Saving...' : 'Save & Continue'}
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 5: Install to Workspace */}
          {currentStep === 5 && (
            <div className="max-w-2xl mx-auto space-y-6">
              <div className="text-center mb-8">
                <div className="w-16 h-16 rounded-2xl bg-blue-100 flex items-center justify-center mx-auto mb-4">
                  <Zap className="w-8 h-8 text-blue-600" />
                </div>
                <h2 className="text-xl font-semibold text-slate-900">Install to Workspace</h2>
                <p className="text-slate-500 mt-2">
                  Connect Catalyst to your Slack workspace
                </p>
              </div>

              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-8 text-center">
                <SlackIcon className="w-12 h-12 mx-auto mb-4 text-blue-600" />
                <p className="text-slate-600 mb-6">
                  Click below to authorize Catalyst to send notifications to your Slack workspace.
                  You'll be redirected to Slack to approve the permissions.
                </p>
                <Button
                  onClick={handleInstall}
                  disabled={getInstallUrl.isPending}
                  size="lg"
                  className="px-8"
                  style={{ backgroundColor: 'var(--cp-blue)' }}
                >
                  {getInstallUrl.isPending ? (
                    'Preparing...'
                  ) : (
                    <>
                      <SlackIcon className="w-5 h-5 mr-2" />
                      Add to Slack
                    </>
                  )}
                </Button>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={handleBack} className="flex-1">
                  <ChevronLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
              </div>
            </div>
          )}

          {/* Step 6: Test Connection */}
          {currentStep === 6 && (
            <div className="max-w-2xl mx-auto space-y-6">
              <div className="text-center mb-8">
                <div className="w-16 h-16 rounded-2xl bg-green-100 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
                <h2 className="text-xl font-semibold text-slate-900">Setup Complete!</h2>
                <p className="text-slate-500 mt-2">
                  Your Slack integration is configured. Send a test notification to verify.
                </p>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
                <Check className="w-8 h-8 text-green-600 mx-auto mb-3" />
                <p className="text-green-800 font-medium">Slack Integration Active</p>
                <p className="text-green-600 text-sm mt-1">
                  Users can now connect their Slack accounts to receive notifications
                </p>
              </div>

              <Button
                onClick={handleTest}
                disabled={testConnection.isPending}
                variant="outline"
                className="w-full"
              >
                {testConnection.isPending ? (
                  'Sending...'
                ) : (
                  <>
                    <TestTube className="w-4 h-4 mr-2" />
                    Send Test Notification
                  </>
                )}
              </Button>

              {testConnection.isSuccess && (
                <Alert className="border-green-200 bg-green-50">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">
                    Test notification sent successfully! Check your Slack.
                  </AlertDescription>
                </Alert>
              )}

              <Button
                onClick={() => window.location.reload()}
                className="w-full"
                style={{ backgroundColor: 'var(--cp-blue)' }}
              >
                Go to Dashboard
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default SlackSetupWizard;
