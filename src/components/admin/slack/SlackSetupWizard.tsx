// ============================================================
// CATALYST SLACK ADMIN - Setup Wizard
// ============================================================

import React, { useState } from 'react';
import AlertIcon from '@atlaskit/icon/core/alert';
import AutomationIcon from '@atlaskit/icon/core/automation';
import CheckCircleIcon from '@atlaskit/icon/core/check-circle';
import CheckMarkIcon from '@atlaskit/icon/core/check-mark';
import CopyIcon from '@atlaskit/icon/core/copy';
import LinkIcon from '@atlaskit/icon/core/link';
import LinkExternalIcon from '@atlaskit/icon/core/link-external';
import LockLockedIcon from '@atlaskit/icon/core/lock-locked';
import SettingsIcon from '@atlaskit/icon/core/settings';
import ToolsIcon from '@atlaskit/icon/core/tools';
import ChevronLeftIcon from '@atlaskit/icon/glyph/chevron-left';
import ChevronRightIcon from '@atlaskit/icon/glyph/chevron-right';
import {
  useSaveSlackConfig,
  useSlackInstallUrl,
  useTestSlackConnection,
  SlackConfig,
} from '@/hooks/useSlackAdmin';
import Button, { IconButton } from '@atlaskit/button/new';
import Textfield from '@atlaskit/textfield';
import { Checkbox } from '@/components/ui/checkbox';
import { Lozenge } from '@/components/ads';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { catalystToast } from '@/lib/catalystToast';

// Slack icon component (accepts both Lucide-style className and ADS-style label/size props)
const SlackIcon = ({ className, label: _label, size: _size }: { className?: string; label?: string; size?: string }) => (
  <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
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
  { id: 2, title: 'Enter Credentials', icon: LockLockedIcon },
  { id: 3, title: 'Configure Scopes', icon: SettingsIcon },
  { id: 4, title: 'Set Redirect URL', icon: LinkIcon },
  { id: 5, title: 'Install to Workspace', icon: AutomationIcon },
  { id: 6, title: 'Test Connection', icon: CheckCircleIcon },
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
      catalystToast.error('Failed to generate install URL');
    }
  };

  const handleTest = async () => {
    await testConnection.mutateAsync({});
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    catalystToast.success('Copied to clipboard');
  };

  return (
    <div className="space-y-6">
      {/* Progress Steps */}
      <div style={{ background: 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated, #ffffff)))', border: '1px solid var(--ds-border, #DCDFE4)', borderRadius: '3px', padding: '24px' }}>
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
                      <CheckCircleIcon label="" size="small" />
                    ) : (
                      <Icon label="" size="small" />
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
      </div>

      {/* Step Content */}
      <div style={{ background: 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated, #ffffff)))', border: '1px solid var(--ds-border, #DCDFE4)', borderRadius: '3px', padding: '32px' }}>
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
                appearance="primary"
                iconAfter={ChevronRightIcon}
                onClick={handleNext}
                shouldFitContainer
              >
                I've Created the App
              </Button>

              <Button
                appearance="default"
                iconBefore={LinkExternalIcon}
                onClick={() => window.open('https://api.slack.com/apps', '_blank')}
                shouldFitContainer
              >
                Open Slack API Console
              </Button>
            </div>
          )}

          {/* Step 2: Enter Credentials */}
          {currentStep === 2 && (
            <div className="max-w-2xl mx-auto space-y-6">
              <div className="text-center mb-8">
                <div className="w-16 h-16 rounded-2xl bg-blue-100 flex items-center justify-center mx-auto mb-4">
                  <LockLockedIcon label="" size="small" />
                </div>
                <h2 className="text-xl font-semibold text-slate-900">Enter App Credentials</h2>
                <p className="text-slate-500 mt-2">
                  Copy credentials from your Slack App's "Basic Information" page
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label htmlFor="app_id" style={{ fontSize: '14px', fontWeight: 500, color: 'var(--ds-text, var(--cp-text-primary, var(--cp-text-inverse, #172B4D)))' }}>App ID</label>
                  <div className="mt-1.5">
                    <Textfield
                      id="app_id"
                      placeholder="A0A92EJ6TFZ"
                      value={formData.app_id}
                      onChange={(e) => updateFormData('app_id', (e.target as HTMLInputElement).value)}
                    />
                  </div>
                  <p className="text-xs text-slate-500 mt-1">Found at the top of Basic Information</p>
                </div>

                <div>
                  <label htmlFor="client_id" style={{ fontSize: '14px', fontWeight: 500, color: 'var(--ds-text, var(--cp-text-primary, var(--cp-text-inverse, #172B4D)))' }}>
                    Client ID <span style={{ color: 'var(--ds-text-danger, #AE2A19)' }}>*</span>
                  </label>
                  <div className="mt-1.5">
                    <Textfield
                      id="client_id"
                      placeholder="6918807045377.10308494231543"
                      value={formData.client_id}
                      onChange={(e) => updateFormData('client_id', (e.target as HTMLInputElement).value)}
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="client_secret" style={{ fontSize: '14px', fontWeight: 500, color: 'var(--ds-text, var(--cp-text-primary, var(--cp-text-inverse, #172B4D)))' }}>
                    Client Secret <span style={{ color: 'var(--ds-text-danger, #AE2A19)' }}>*</span>
                  </label>
                  <div className="mt-1.5">
                    <Textfield
                      id="client_secret"
                      type="password"
                      placeholder="Click 'Show' in Slack to reveal, then paste here"
                      value={formData.client_secret}
                      onChange={(e) => updateFormData('client_secret', (e.target as HTMLInputElement).value)}
                    />
                  </div>
                  <p className="text-xs text-slate-500 mt-1">Click "Show" button in Slack to reveal</p>
                </div>

                <div>
                  <label htmlFor="signing_secret" style={{ fontSize: '14px', fontWeight: 500, color: 'var(--ds-text, var(--cp-text-primary, var(--cp-text-inverse, #172B4D)))' }}>Signing Secret (optional)</label>
                  <div className="mt-1.5">
                    <Textfield
                      id="signing_secret"
                      type="password"
                      placeholder="For verifying Slack requests"
                      value={formData.signing_secret}
                      onChange={(e) => updateFormData('signing_secret', (e.target as HTMLInputElement).value)}
                    />
                  </div>
                </div>
              </div>

              <Alert>
                <AlertIcon label="" size="small" />
                <AlertDescription>
                  Your credentials are encrypted before storage and never exposed in the UI.
                </AlertDescription>
              </Alert>

              <div className="flex gap-3">
                <Button appearance="subtle" iconBefore={ChevronLeftIcon} onClick={handleBack} shouldFitContainer>
                  Back
                </Button>
                <Button
                  appearance="primary"
                  iconAfter={ChevronRightIcon}
                  onClick={handleNext}
                  isDisabled={!formData.client_id || !formData.client_secret}
                  shouldFitContainer
                >
                  Continue
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Configure Scopes */}
          {currentStep === 3 && (
            <div className="max-w-2xl mx-auto space-y-6">
              <div className="text-center mb-8">
                <div className="w-16 h-16 rounded-2xl bg-blue-100 flex items-center justify-center mx-auto mb-4">
                  <SettingsIcon label="" size="small" />
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
                      <IconButton
                        appearance="subtle"
                        icon={CopyIcon}
                        onClick={() => copyToClipboard(scope.id)}
                      label="" />
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
                <Button appearance="subtle" iconBefore={ChevronLeftIcon} onClick={handleBack} shouldFitContainer>
                  Back
                </Button>
                <Button appearance="primary" iconAfter={ChevronRightIcon} onClick={handleNext} shouldFitContainer>
                  I've Added the Scopes
                </Button>
              </div>
            </div>
          )}

          {/* Step 4: Set Redirect URL */}
          {currentStep === 4 && (
            <div className="max-w-2xl mx-auto space-y-6">
              <div className="text-center mb-8">
                <div className="w-16 h-16 rounded-2xl bg-blue-100 flex items-center justify-center mx-auto mb-4">
                  <LinkIcon label="" size="small" />
                </div>
                <h2 className="text-xl font-semibold text-slate-900">Set Redirect URL</h2>
                <p className="text-slate-500 mt-2">
                  Add this URL to your Slack App's OAuth & Permissions → Redirect URLs
                </p>
              </div>

              <div>
                <label style={{ fontSize: '14px', fontWeight: 500, color: 'var(--ds-text, var(--cp-text-primary, var(--cp-text-inverse, #172B4D)))' }}>Redirect URL</label>
                <div className="flex gap-2 mt-1.5">
                  <div className="flex-1">
                    <Textfield
                      value={formData.redirect_uri}
                      onChange={(e) => updateFormData('redirect_uri', (e.target as HTMLInputElement).value)}
                    />
                  </div>
                  <IconButton
                    appearance="default"
                    icon={CopyIcon}
                    onClick={() => copyToClipboard(formData.redirect_uri)}
                  label="" />
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
                <Button appearance="subtle" iconBefore={ChevronLeftIcon} onClick={handleBack} shouldFitContainer>
                  Back
                </Button>
                <Button
                  appearance="primary"
                  iconAfter={ChevronRightIcon}
                  onClick={handleSaveAndContinue}
                  isDisabled={saveConfig.isPending}
                  shouldFitContainer
                >
                  {saveConfig.isPending ? 'Saving...' : 'Save & Continue'}
                </Button>
              </div>
            </div>
          )}

          {/* Step 5: Install to Workspace */}
          {currentStep === 5 && (
            <div className="max-w-2xl mx-auto space-y-6">
              <div className="text-center mb-8">
                <div className="w-16 h-16 rounded-2xl bg-blue-100 flex items-center justify-center mx-auto mb-4">
                  <AutomationIcon label="" size="small" />
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
                  appearance="primary"
                  onClick={handleInstall}
                  isDisabled={getInstallUrl.isPending}
                >
                  {getInstallUrl.isPending ? 'Preparing...' : 'Add to Slack'}
                </Button>
              </div>

              <div className="flex gap-3">
                <Button appearance="subtle" iconBefore={ChevronLeftIcon} onClick={handleBack} shouldFitContainer>
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
                  <CheckCircleIcon label="" size="small" />
                </div>
                <h2 className="text-xl font-semibold text-slate-900">Setup Complete!</h2>
                <p className="text-slate-500 mt-2">
                  Your Slack integration is configured. Send a test notification to verify.
                </p>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
                <CheckMarkIcon label="" size="small" />
                <p className="text-green-800 font-medium">Slack Integration Active</p>
                <p className="text-green-600 text-sm mt-1">
                  Users can now connect their Slack accounts to receive notifications
                </p>
              </div>

              <Button
                appearance="default"
                iconBefore={ToolsIcon}
                onClick={handleTest}
                isDisabled={testConnection.isPending}
                shouldFitContainer
              >
                {testConnection.isPending ? 'Sending...' : 'Send Test Notification'}
              </Button>

              {testConnection.isSuccess && (
                <Alert className="border-green-200 bg-green-50">
                  <CheckCircleIcon label="" size="small" />
                  <AlertDescription className="text-green-800">
                    Test notification sent successfully! Check your Slack.
                  </AlertDescription>
                </Alert>
              )}

              <Button
                appearance="primary"
                iconAfter={ChevronRightIcon}
                onClick={() => window.location.reload()}
                shouldFitContainer
              >
                Go to Dashboard
              </Button>
            </div>
          )}
        </div>
      </div>
  );
}

export default SlackSetupWizard;
