/**
 * ForcePasswordReset — ADS-compliant first-login password gate.
 * Shown when profiles.must_change_password = true.
 * No skip — user must complete here or via emailed reset link.
 */
import { useState } from 'react';
import Textfield from '@atlaskit/textfield';
import Button from '@atlaskit/button';
import SectionMessage from '@atlaskit/section-message';
import { supabase } from '@/integrations/supabase/client';

interface ForcePasswordResetProps {
  userId: string;
  email: string;
  onSuccess: () => void;
}

const RULES = [
  { id: 'len',     label: 'At least 8 characters',           test: (p: string) => p.length >= 8 },
  { id: 'upper',   label: 'One uppercase letter (A–Z)',       test: (p: string) => /[A-Z]/.test(p) },
  { id: 'lower',   label: 'One lowercase letter (a–z)',       test: (p: string) => /[a-z]/.test(p) },
  { id: 'number',  label: 'One number (0–9)',                  test: (p: string) => /[0-9]/.test(p) },
  { id: 'special', label: 'One special character (!@#$…)',    test: (p: string) => /[!@#$%^&*()\-_=+\[\]{};':"\\|,.<>\/?`~]/.test(p) },
  { id: 'notpw1',  label: 'Not the default password',         test: (p: string) => p !== 'Password1' },
];

const EyeIcon = ({ off }: { off?: boolean }) => off ? (
  <svg width="16" height="16" fill="none" viewBox="0 0 16 16" aria-hidden="true">
    <path d="M2 2l12 12M6.4 6.4a2 2 0 002.8 2.8M3.5 5C2.2 6.2 1.5 8 1.5 8s2.5 5 6.5 5c1.1 0 2.1-.3 3-.8M8 3c3.7 0 6.5 5 6.5 5-.5 1.1-1.3 2.1-2.2 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
  </svg>
) : (
  <svg width="16" height="16" fill="none" viewBox="0 0 16 16" aria-hidden="true">
    <path d="M1.5 8s2.5-5 6.5-5 6.5 5 6.5 5-2.5 5-6.5 5-6.5-5-6.5-5z" stroke="currentColor" strokeWidth="1.3"/>
    <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.3"/>
  </svg>
);

export function ForcePasswordReset({ userId: _userId, email, onSuccess }: ForcePasswordResetProps) {
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sendingLink, setSendingLink] = useState(false);
  const [linkSent, setLinkSent] = useState(false);

  const ruleResults = RULES.map(r => ({ ...r, passed: r.test(newPwd) }));
  const allRulesPassed = ruleResults.every(r => r.passed);
  const passwordsMatch = confirmPwd.length > 0 && newPwd === confirmPwd;
  const canSubmit = allRulesPassed && passwordsMatch && !submitting;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setError(null);
    setSubmitting(true);
    try {
      const { data, error: invokeError } = await supabase.functions.invoke('user-update-password', {
        body: { newPassword: newPwd },
      });
      if (invokeError || !data?.success) {
        throw new Error(data?.error || 'Failed to update password. Please try again.');
      }
      onSuccess();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendResetLink = async () => {
    setSendingLink(true);
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    await supabase.auth.signOut();
    setSendingLink(false);
    setLinkSent(true);
  };

  if (linkSent) {
    return (
      <SectionMessage appearance="success" title="Reset link sent">
        <p>
          Check your inbox at <strong>{email}</strong>. Click the link to set your
          password, then sign in.
        </p>
      </SectionMessage>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Header */}
      <div style={{ textAlign: 'center' }}>
        <h2 style={{
          margin: '0 0 6px',
          fontSize: 'var(--ds-font-size-700)',
          fontWeight: 600,
          color: 'var(--ds-text, var(--cp-text-primary, var(--cp-text-inverse)))',
        }}>
          Create your password
        </h2>
        <p style={{
          margin: 0,
          fontSize: 'var(--ds-font-size-400)',
          color: 'var(--ds-text-subtle, var(--cp-text-secondary, var(--cp-text-secondary)))',
        }}>
          Set a strong password to access your account.
        </p>
      </div>

      {error && (
        <SectionMessage appearance="error">
          <p>{error}</p>
        </SectionMessage>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* New password */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label
            htmlFor="fpr-new"
            style={{ fontSize: 'var(--ds-font-size-200)', fontWeight: 600, color: 'var(--ds-text-subtle, var(--cp-text-secondary, var(--cp-text-secondary)))' }}
          >
            New password
          </label>
          <Textfield
            id="fpr-new"
            name="new-password"
            type={showNew ? 'text' : 'password'}
            value={newPwd}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewPwd(e.currentTarget.value)}
            autoFocus
            isRequired
            autoComplete="new-password"
            elemAfterInput={
              <button
                type="button"
                className="clmp-pwd-toggle"
                onClick={() => setShowNew(v => !v)}
                aria-label={showNew ? 'Hide password' : 'Show password'}
                tabIndex={-1}
              >
                <EyeIcon off={showNew} />
              </button>
            }
          />
        </div>

        {/* Live rule checklist — appears as soon as user starts typing */}
        {newPwd.length > 0 && (
          <ul style={{
            margin: 0,
            padding: '8px 12px',
            listStyle: 'none',
            background: 'var(--ds-background-neutral)',
            borderRadius: 'var(--ds-border-radius, 3px)',
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
          }}>
            {ruleResults.map(r => (
              <li
                key={r.id}
                style={{
                  fontSize: 'var(--ds-font-size-200)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  color: r.passed
                    ? 'var(--ds-text-success)'
                    : 'var(--ds-text-subtle, var(--cp-text-secondary, var(--cp-text-secondary)))',
                  transition: 'color 0.15s',
                }}
              >
                <span style={{ fontSize: 'var(--ds-font-size-100)', minWidth: 10 }}>{r.passed ? '✓' : '○'}</span>
                {r.label}
              </li>
            ))}
          </ul>
        )}

        {/* Confirm password */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label
            htmlFor="fpr-confirm"
            style={{ fontSize: 'var(--ds-font-size-200)', fontWeight: 600, color: 'var(--ds-text-subtle, var(--cp-text-secondary, var(--cp-text-secondary)))' }}
          >
            Confirm password
          </label>
          <Textfield
            id="fpr-confirm"
            name="confirm-password"
            type={showConfirm ? 'text' : 'password'}
            value={confirmPwd}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfirmPwd(e.currentTarget.value)}
            isRequired
            autoComplete="new-password"
            isInvalid={confirmPwd.length > 0 && !passwordsMatch}
            elemAfterInput={
              <button
                type="button"
                className="clmp-pwd-toggle"
                onClick={() => setShowConfirm(v => !v)}
                aria-label={showConfirm ? 'Hide password' : 'Show password'}
                tabIndex={-1}
              >
                <EyeIcon off={showConfirm} />
              </button>
            }
          />
          {confirmPwd.length > 0 && !passwordsMatch && (
            <p style={{ margin: '0px 0 0', fontSize: 'var(--ds-font-size-200)', color: 'var(--ds-text-danger)' }}>
              Passwords do not match
            </p>
          )}
        </div>

        <Button
          type="submit"
          appearance="primary"
          isLoading={submitting}
          isDisabled={!canSubmit}
          shouldFitContainer
        >
          Set password and sign in
        </Button>
      </form>

      {/* Safety valve — email reset link */}
      <div style={{
        borderTop: '1px solid var(--ds-border)',
        paddingTop: 16,
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 8,
      }}>
        <p style={{ margin: 0, fontSize: 'var(--ds-font-size-200)', color: 'var(--ds-text-subtlest)' }}>
          Having trouble setting a password?
        </p>
        <Button
          appearance="subtle"
          spacing="compact"
          isLoading={sendingLink}
          onClick={handleSendResetLink}
        >
          Send me a reset link instead
        </Button>
      </div>
    </div>
  );
}
