import { useState, useEffect } from 'react';
import { Eye, EyeOff, Globe, Mail, Key, RefreshCw, Pencil } from 'lucide-react';
import { ReadOnlyBanner } from './ReadOnlyBanner';
import { ConnectionStatusBadge } from './ConnectionStatusBadge';
import { TestConnectionModal } from './TestConnectionModal';
import { useJiraConnection, useUpdateJiraConnection, useTestConnection } from '../hooks/useJiraConnection';

import '../../shared/tokens/workhub-tokens.css';

export function JiraConnection() {
  const { data: connection, isLoading } = useJiraConnection();
  const updateMutation = useUpdateJiraConnection();
  const testMutation = useTestConnection();

  const [siteUrl, setSiteUrl] = useState('');
  const [authEmail, setAuthEmail] = useState('');
  const [authToken, setAuthToken] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);
  const [errors, setErrors] = useState<{ url?: string; email?: string; token?: string }>({});

  // Sync from DB
  useEffect(() => {
    if (connection) {
      setSiteUrl(connection.site_url);
      setAuthEmail(connection.auth_email);
      // Don't expose token - show placeholder
      setAuthToken('');
    }
  }, [connection]);

  const status = connection?.status || 'not_configured';
  const showForm = status === 'not_configured' || status === 'error' || isEditing;

  const validate = () => {
    const newErrors: typeof errors = {};
    if (!siteUrl.startsWith('https://') || !siteUrl.includes('.atlassian.net')) {
      newErrors.url = 'Must be https://yourorg.atlassian.net';
    }
    if (!authEmail.includes('@')) {
      newErrors.email = 'Enter a valid email address';
    }
    if (!authToken && status !== 'connected') {
      newErrors.token = 'API token is required';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSaveAndTest = async () => {
    if (!validate()) return;

    try {
      await updateMutation.mutateAsync({
        site_url: siteUrl,
        auth_method: 'api_token',
        auth_email: authEmail,
        auth_token_encrypted: authToken,
      });

      setIsEditing(false);
      setIsTestModalOpen(true);
      testMutation.mutate();
    } catch (err: any) {
      setErrors({ url: err.message });
    }
  };

  const handleTestOnly = () => {
    setIsTestModalOpen(true);
    testMutation.mutate();
  };

  const formatTimeAgo = (dateStr: string | null) => {
    if (!dateStr) return 'Never';
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins} min ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  if (isLoading) {
    return (
      <div className="wh-page">
        <div style={{ color: 'var(--wh-tx3)', fontSize: 13 }}>Loading connection settings...</div>
      </div>
    );
  }

  return (
    <div className="wh-page">
      <h1 className="wh-page-title">Jira Connection</h1>
      <p className="wh-page-subtitle">Configure your Jira Cloud connection for read-only data synchronization.</p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Read-only banner */}
        <ReadOnlyBanner />

        {/* Status card - shown when connected or error */}
        {status !== 'not_configured' && (
          <div className="wh-card" style={{ padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                {/* Jira logo placeholder */}
                <div style={{
                  width: 48, height: 48, borderRadius: 'var(--wh-rad)',
                  background: 'linear-gradient(135deg, #0052CC, #2684FF)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', fontWeight: 800, fontSize: 14, fontFamily: 'var(--wh-fh)',
                }}>
                  JIRA
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                    <ConnectionStatusBadge status={status} />
                    <span style={{ fontSize: 12, color: 'var(--wh-tx4)' }}>
                      Last tested {formatTimeAgo(connection?.last_tested_at ?? null)}
                    </span>
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--wh-tx2)', fontFamily: 'var(--wh-mo)' }}>
                    {connection?.site_url}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--wh-tx3)', marginTop: 2 }}>
                    {connection?.project_count || 0} projects accessible · {connection?.permissions_level === 'read_write' ? 'Read-write' : 'Read-only'} access
                  </div>
                </div>
              </div>
            </div>

            {/* Error details */}
            {status === 'error' && connection?.last_test_result?.checks && (
              <div style={{
                marginTop: 16, padding: '12px 14px',
                background: 'var(--wh-dng-bg)', borderRadius: 'var(--wh-rad)',
                border: '1px solid rgba(239,68,68,0.2)',
              }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--wh-dng)', marginBottom: 8 }}>
                  Failed checks:
                </div>
                {connection.last_test_result.checks
                  .filter((c: any) => !c.passed)
                  .map((c: any) => (
                    <div key={c.name} style={{ fontSize: 12, color: 'var(--wh-tx2)', marginBottom: 2 }}>
                      • {c.name}: {c.message}
                    </div>
                  ))
                }
              </div>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button className="wh-btn-secondary" onClick={handleTestOnly} disabled={testMutation.isPending}>
                <RefreshCw style={{ width: 14, height: 14 }} /> Test Connection
              </button>
              <button className="wh-btn-secondary" onClick={() => setIsEditing(true)}>
                <Pencil style={{ width: 14, height: 14 }} /> Edit Credentials
              </button>
            </div>
          </div>
        )}

        {/* Credentials form */}
        {showForm && (
          <div className="wh-card" style={{ padding: 24 }}>
            <h3 style={{
              fontFamily: 'var(--wh-fh)', fontSize: 15, fontWeight: 700,
              color: 'var(--wh-tx)', marginBottom: 20,
            }}>
              {isEditing ? 'Edit Credentials' : 'Configure Connection'}
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 480 }}>
              {/* Site URL */}
              <div>
                <label className="wh-label" htmlFor="wh-site-url">
                  Site URL <span className="wh-required">*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <Globe style={{
                    position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
                    width: 15, height: 15, color: 'var(--wh-tx4)',
                  }} />
                  <input
                    id="wh-site-url"
                    className={`wh-input ${errors.url ? 'error' : ''}`}
                    style={{ paddingLeft: 36 }}
                    placeholder="https://myorg.atlassian.net"
                    value={siteUrl}
                    onChange={(e) => { setSiteUrl(e.target.value); setErrors(p => ({ ...p, url: undefined })); }}
                    aria-describedby={errors.url ? 'wh-url-error' : undefined}
                  />
                </div>
                {errors.url && <span id="wh-url-error" style={{ fontSize: 12, color: 'var(--wh-dng)', marginTop: 4, display: 'block' }}>{errors.url}</span>}
              </div>

              {/* Email */}
              <div>
                <label className="wh-label" htmlFor="wh-auth-email">
                  Email <span className="wh-required">*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <Mail style={{
                    position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
                    width: 15, height: 15, color: 'var(--wh-tx4)',
                  }} />
                  <input
                    id="wh-auth-email"
                    className={`wh-input ${errors.email ? 'error' : ''}`}
                    style={{ paddingLeft: 36 }}
                    type="email"
                    placeholder="admin@company.com"
                    value={authEmail}
                    onChange={(e) => { setAuthEmail(e.target.value); setErrors(p => ({ ...p, email: undefined })); }}
                    aria-describedby={errors.email ? 'wh-email-error' : undefined}
                  />
                </div>
                {errors.email && <span id="wh-email-error" style={{ fontSize: 12, color: 'var(--wh-dng)', marginTop: 4, display: 'block' }}>{errors.email}</span>}
              </div>

              {/* API Token */}
              <div>
                <label className="wh-label" htmlFor="wh-auth-token">
                  API Token <span className="wh-required">*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <Key style={{
                    position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
                    width: 15, height: 15, color: 'var(--wh-tx4)',
                  }} />
                  <input
                    id="wh-auth-token"
                    className={`wh-input ${errors.token ? 'error' : ''}`}
                    style={{ paddingLeft: 36, paddingRight: 40 }}
                    type={showToken ? 'text' : 'password'}
                    placeholder={status === 'connected' ? '••••••••••••••••' : 'Paste your Jira API token'}
                    value={authToken}
                    onChange={(e) => { setAuthToken(e.target.value); setErrors(p => ({ ...p, token: undefined })); }}
                    aria-describedby={errors.token ? 'wh-token-error' : undefined}
                  />
                  <button
                    type="button"
                    onClick={() => setShowToken(!showToken)}
                    style={{
                      position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                      border: 'none', background: 'none', cursor: 'pointer', padding: 4,
                      color: 'var(--wh-tx4)',
                    }}
                  >
                    {showToken ? <EyeOff style={{ width: 16, height: 16 }} /> : <Eye style={{ width: 16, height: 16 }} />}
                  </button>
                </div>
                {errors.token && <span id="wh-token-error" style={{ fontSize: 12, color: 'var(--wh-dng)', marginTop: 4, display: 'block' }}>{errors.token}</span>}
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                <button
                  className="wh-btn-primary"
                  onClick={handleSaveAndTest}
                  disabled={updateMutation.isPending || !siteUrl || !authEmail}
                >
                  {updateMutation.isPending ? 'Saving...' : 'Save & Test Connection'}
                </button>
                {isEditing && (
                  <button className="wh-btn-secondary" onClick={() => setIsEditing(false)}>
                    Cancel
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Test Modal */}
      <TestConnectionModal
        isOpen={isTestModalOpen}
        onClose={() => setIsTestModalOpen(false)}
        checks={testMutation.data?.checks || []}
        isRunning={testMutation.isPending}
        error={testMutation.error?.message}
      />
    </div>
  );
}
