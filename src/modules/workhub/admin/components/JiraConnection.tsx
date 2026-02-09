import { useState, useEffect } from 'react';
import { Eye, EyeOff, Globe, Mail, Key, RefreshCw, Pencil } from 'lucide-react';
import { ReadOnlyBanner } from './ReadOnlyBanner';
import { ConnectionStatusBadge } from './ConnectionStatusBadge';
import { TestConnectionModal } from './TestConnectionModal';
import { WorkItemsDashboard } from './WorkItemsDashboard';
import { useJiraConnection, useUpdateJiraConnection, useTestConnection } from '../hooks/useJiraConnection';

import '../../shared/tokens/workhub-tokens.css';

const WORKSTREAM_COLORS: Record<string, string> = {
  software: '#2563EB',
  business: '#7C3AED',
  service_desk: '#F59E0B',
};

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
  const [touched, setTouched] = useState<{ url?: boolean; email?: boolean; token?: boolean }>({});

  // Sync from DB
  useEffect(() => {
    if (connection) {
      setSiteUrl(connection.site_url);
      setAuthEmail(connection.auth_email);
      setAuthToken('');
    }
  }, [connection]);

  const status = connection?.status || 'not_configured';
  const showForm = status === 'not_configured' || status === 'error' || isEditing;

  const validateField = (field: 'url' | 'email' | 'token') => {
    const newErrors = { ...errors };
    if (field === 'url' && (!siteUrl.startsWith('https://') || !siteUrl.includes('.atlassian.net'))) {
      newErrors.url = 'Must be https://yourorg.atlassian.net';
    } else if (field === 'url') {
      delete newErrors.url;
    }
    if (field === 'email' && !authEmail.includes('@')) {
      newErrors.email = 'Enter a valid email address';
    } else if (field === 'email') {
      delete newErrors.email;
    }
    if (field === 'token' && !authToken && status !== 'connected') {
      newErrors.token = 'API token is required';
    } else if (field === 'token') {
      delete newErrors.token;
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validate = () => {
    setTouched({ url: true, email: true, token: true });
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

  const handleBlur = (field: 'url' | 'email' | 'token') => {
    setTouched(p => ({ ...p, [field]: true }));
    validateField(field);
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

  const checks = connection?.last_test_result?.checks as Array<{ name: string; passed: boolean; message: string; duration_ms: number }> | undefined;
  const projects = (connection?.accessible_projects || []) as Array<{ key: string; name: string; type: string }>;

  return (
    <div className="wh-page">
      <h1 className="wh-page-title">Jira Connection</h1>
      <p className="wh-page-subtitle">Configure your Jira Cloud connection for read-only data synchronization.</p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
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
                </div>
              </div>
            </div>

            {/* Stat boxes grid — connected state */}
            {status === 'connected' && (
              <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginTop: 16,
              }}>
                {[
                  { label: 'Projects', value: connection?.project_count ?? 0 },
                  { label: 'Access Level', value: connection?.permissions_level === 'read_write' ? 'Read-Write' : 'Read-Only' },
                  { label: 'Issues', value: connection?.total_issue_count ?? '—' },
                  { label: 'Versions', value: connection?.total_version_count ?? '—' },
                ].map(stat => (
                  <div key={stat.label} style={{
                    background: 'var(--wh-sf)', borderRadius: 'var(--wh-rad)',
                    padding: '14px 12px', textAlign: 'center',
                    border: '1px solid var(--wh-bdr)',
                  }}>
                    <div style={{
                      fontFamily: 'var(--wh-fh)', fontSize: 22, fontWeight: 700,
                      color: 'var(--wh-tx)', marginBottom: 4,
                    }}>
                      {stat.value}
                    </div>
                    <div style={{
                      fontFamily: 'var(--wh-fh)', fontSize: 11, fontWeight: 600,
                      color: 'var(--wh-tx4)', textTransform: 'uppercase', letterSpacing: '0.04em',
                    }}>
                      {stat.label}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Project chips with colored dots — connected state */}
            {status === 'connected' && projects.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <div style={{
                  fontFamily: 'var(--wh-fh)', fontSize: 11, fontWeight: 600,
                  color: 'var(--wh-tx4)', textTransform: 'uppercase', letterSpacing: '0.04em',
                  marginBottom: 8,
                }}>
                  ACCESSIBLE PROJECTS
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {projects.map(p => (
                    <span key={p.key} style={{
                      display: 'inline-flex', alignItems: 'center', gap: 5,
                      background: 'var(--wh-sf)', border: '1px solid var(--wh-bdr)',
                      borderRadius: 20, padding: '3px 10px 3px 8px',
                      fontSize: 12, fontFamily: 'var(--wh-mo)', fontWeight: 500,
                      color: 'var(--wh-tx2)',
                    }}>
                      <span style={{
                        width: 6, height: 6, borderRadius: '50%',
                        background: WORKSTREAM_COLORS[p.type] || 'var(--wh-tx4)',
                      }} />
                      {p.key}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Inline test results row — connected state */}
            {status === 'connected' && checks && checks.length > 0 && (
              <div style={{
                display: 'flex', gap: 16, marginTop: 16, paddingTop: 16,
                borderTop: '1px solid var(--wh-bdr)', flexWrap: 'wrap',
              }}>
                {checks.map(c => (
                  <div key={c.name} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12 }}>
                    <span>{c.passed ? '✅' : '❌'}</span>
                    <span style={{ color: 'var(--wh-tx3)', fontFamily: 'var(--wh-fn)' }}>{c.name}</span>
                    <span style={{ color: 'var(--wh-tx4)', fontFamily: 'var(--wh-mo)', fontSize: 11 }}>
                      {c.duration_ms}ms
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Error details */}
            {status === 'error' && checks && (
              <div style={{
                marginTop: 16, padding: '12px 14px',
                background: 'var(--wh-dng-bg)', borderRadius: 'var(--wh-rad)',
                border: '1px solid rgba(239,68,68,0.2)',
              }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--wh-dng)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                  ❌ Connection failed
                </div>
                {checks
                  .filter((c: any) => !c.passed)
                  .map((c: any) => (
                    <div key={c.name} style={{ fontSize: 12, color: 'var(--wh-tx2)', marginBottom: 2 }}>
                      • {c.name}: {c.message}
                    </div>
                  ))
                }
              </div>
            )}

            {/* Inline test results row — error state */}
            {status === 'error' && checks && checks.length > 0 && (
              <div style={{
                display: 'flex', gap: 16, marginTop: 12, flexWrap: 'wrap',
              }}>
                {checks.map((c: any) => (
                  <div key={c.name} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12 }}>
                    <span>{c.passed ? '✅' : '❌'}</span>
                    <span style={{ color: 'var(--wh-tx3)', fontFamily: 'var(--wh-fn)' }}>{c.name}</span>
                    <span style={{ color: 'var(--wh-tx4)', fontFamily: 'var(--wh-mo)', fontSize: 11 }}>
                      {c.duration_ms}ms
                    </span>
                  </div>
                ))}
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
                    className={`wh-input ${touched.url && errors.url ? 'error' : ''}`}
                    style={{ paddingLeft: 36 }}
                    placeholder="https://myorg.atlassian.net"
                    value={siteUrl}
                    onChange={(e) => { setSiteUrl(e.target.value); setErrors(p => ({ ...p, url: undefined })); }}
                    onBlur={() => handleBlur('url')}
                    aria-describedby={errors.url ? 'wh-url-error' : undefined}
                  />
                </div>
                {touched.url && errors.url && <span id="wh-url-error" style={{ fontSize: 12, color: 'var(--wh-dng)', marginTop: 4, display: 'block' }}>{errors.url}</span>}
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
                    className={`wh-input ${touched.email && errors.email ? 'error' : ''}`}
                    style={{ paddingLeft: 36 }}
                    type="email"
                    placeholder="admin@company.com"
                    value={authEmail}
                    onChange={(e) => { setAuthEmail(e.target.value); setErrors(p => ({ ...p, email: undefined })); }}
                    onBlur={() => handleBlur('email')}
                    aria-describedby={errors.email ? 'wh-email-error' : undefined}
                  />
                </div>
                {touched.email && errors.email && <span id="wh-email-error" style={{ fontSize: 12, color: 'var(--wh-dng)', marginTop: 4, display: 'block' }}>{errors.email}</span>}
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
                    className={`wh-input ${touched.token && errors.token ? 'error' : ''}`}
                    style={{ paddingLeft: 36, paddingRight: 40 }}
                    type={showToken ? 'text' : 'password'}
                    placeholder={status === 'connected' ? '••••••••••••••••' : 'Paste your Jira API token'}
                    value={authToken}
                    onChange={(e) => { setAuthToken(e.target.value); setErrors(p => ({ ...p, token: undefined })); }}
                    onBlur={() => handleBlur('token')}
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
                    aria-label={showToken ? 'Hide token' : 'Show token'}
                  >
                    {showToken ? <EyeOff style={{ width: 16, height: 16 }} /> : <Eye style={{ width: 16, height: 16 }} />}
                  </button>
                </div>
                {touched.token && errors.token && <span id="wh-token-error" style={{ fontSize: 12, color: 'var(--wh-dng)', marginTop: 4, display: 'block' }}>{errors.token}</span>}
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

        {/* Work Items Dashboard */}
        <WorkItemsDashboard isConnected={status === 'connected'} siteUrl={connection?.site_url || ''} />
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
