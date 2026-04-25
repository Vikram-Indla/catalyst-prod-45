import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWikiLearningPaths } from '@/hooks/useWikiHub';
import { useTheme } from '@/hooks/useTheme';
import { GraduationCap, ChevronRight, Check, Sparkles } from 'lucide-react';

const F = {
  sora: 'var(--ds-font-family-heading)',
  inter: 'var(--ds-font-family-body)',
  mono: 'var(--ds-font-family-monospaced)',
};

const DOMAINS = [
  { code: 'D1', name: 'Industrial Licensing' },
  { code: 'D2', name: 'Supply Chain & Logistics' },
  { code: 'D3', name: 'Quality & Standards' },
  { code: 'D4', name: 'Environmental Compliance' },
  { code: 'D5', name: 'Investment & Incentives' },
  { code: 'D6', name: 'Digital & 4IR' },
  { code: 'D7', name: 'Workforce & Safety' },
  { code: 'D8', name: 'Trade & Export' },
  { code: 'D9', name: 'Mining & Resources' },
];

const ROLES = ['Analyst', 'Developer', 'Manager', 'Executive', 'Compliance Officer', 'Other'];
const DIFF_COLORS: Record<string, string> = { beginner: '#16A34A', intermediate: '#2563EB', advanced: '#D97706' };

interface WikiOnboardingWizardProps {
  onComplete: () => void;
}

export function WikiOnboardingWizard({ onComplete }: WikiOnboardingWizardProps) {
  const [step, setStep] = useState(0);
  const [role, setRole] = useState('');
  const [selectedDomains, setSelectedDomains] = useState<string[]>([]);
  const qc = useQueryClient();
  const { data: paths = [] } = useWikiLearningPaths();
  const { isDark } = useTheme();

  const completeOnboarding = useMutation({
    mutationFn: async () => {
      const { data: session } = await supabase.auth.getSession();
      const userId = session?.session?.user?.id;
      if (!userId) throw new Error('Not authenticated');

      await (supabase.from('wiki_user_prefs') as any).upsert({
        user_id: userId,
        onboarding_completed: true,
        preferred_domains: selectedDomains,
      }, { onConflict: 'user_id' });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['wiki-user-prefs'] });
      onComplete();
    },
  });

  const toggleDomain = (code: string) => {
    setSelectedDomains(prev => prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]);
  };

  const steps = [
    // Step 1: Welcome + Role
    <div key="step1">
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--cp-blue)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
          <Sparkles size={28} style={{ color: '#FFFFFF' }} />
        </div>
        <h2 style={{ fontFamily: F.sora, fontSize: 18, fontWeight: 700, marginBottom: 6, color: isDark ? '#EDEDED' : undefined }}>Welcome to WikiHub</h2>
        <p style={{ fontSize: 13, color: isDark ? '#878787' : 'var(--fg-3)', lineHeight: 1.5 }}>Let's personalize your experience. What's your role?</p>
      </div>
      <div style={{ display: 'grid', gap: 6 }}>
        {ROLES.map(r => (
          <button key={r} onClick={() => setRole(r)} style={{
            padding: '12px 16px', borderRadius: 8, background: isDark ? '#0A0A0A' : 'var(--bg-app)',
            border: `0.75px solid ${role === r ? 'var(--cp-blue)' : (isDark ? '#2E2E2E' : 'rgba(0,0,0,0.06)')}`,
            cursor: 'pointer', textAlign: 'left', fontSize: 13, fontWeight: role === r ? 600 : 400,
            color: role === r ? 'var(--cp-blue)' : (isDark ? '#A1A1A1' : 'var(--fg-2)'), transition: 'all 80ms',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            {r}
            {role === r && <Check size={14} style={{ color: 'var(--cp-blue)' }} />}
          </button>
        ))}
      </div>
    </div>,

    // Step 2: Domains
    <div key="step2">
      <h2 style={{ fontFamily: F.sora, fontSize: 16, fontWeight: 700, marginBottom: 6, textAlign: 'center', color: isDark ? '#EDEDED' : undefined }}>Choose Your Domains</h2>
      <p style={{ fontSize: 12, color: isDark ? '#878787' : 'var(--fg-3)', marginBottom: 20, textAlign: 'center' }}>Select domains you want to follow.</p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
        {DOMAINS.map(d => {
          const active = selectedDomains.includes(d.code);
          return (
            <button key={d.code} onClick={() => toggleDomain(d.code)} style={{
              padding: '10px 12px', borderRadius: 8, background: isDark ? '#0A0A0A' : 'var(--bg-app)',
              border: `0.75px solid ${active ? 'var(--cp-blue)' : (isDark ? '#2E2E2E' : 'rgba(0,0,0,0.06)')}`,
              cursor: 'pointer', textAlign: 'left', fontSize: 12, transition: 'all 80ms',
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 4, background: active ? 'var(--cp-primary-20)' : (isDark ? '#1A1A1A' : 'var(--cp-bd-zone)'), color: active ? '#1E40AF' : (isDark ? '#878787' : 'var(--fg-3)') }}>{d.code}</span>
              <span style={{ fontWeight: active ? 600 : 400, color: active ? (isDark ? '#EDEDED' : 'var(--fg-1)') : (isDark ? '#A1A1A1' : 'var(--fg-2)'), flex: 1, fontSize: 11.5 }}>{d.name}</span>
              {active && <Check size={12} style={{ color: 'var(--cp-blue)' }} />}
            </button>
          );
        })}
      </div>
    </div>,

    // Step 3: Learning Paths
    <div key="step3">
      <h2 style={{ fontFamily: F.sora, fontSize: 16, fontWeight: 700, marginBottom: 6, textAlign: 'center', color: isDark ? '#EDEDED' : undefined }}>Start a Learning Path</h2>
      <p style={{ fontSize: 12, color: isDark ? '#878787' : 'var(--fg-3)', marginBottom: 20, textAlign: 'center' }}>Pick one to begin structured learning.</p>
      <div style={{ display: 'grid', gap: 8 }}>
        {(paths as any[]).slice(0, 3).map((p: any) => {
          const diffColor = DIFF_COLORS[p.difficulty] || '#64748B';
          return (
            <div key={p.id} style={{
              padding: 16, borderRadius: 8, background: isDark ? '#0A0A0A' : 'var(--bg-app)',
              border: `0.75px solid ${isDark ? '#2E2E2E' : 'rgba(0,0,0,0.06)'}`, cursor: 'pointer',
              transition: 'border-color 120ms',
            }}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--cp-blue)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = isDark ? '#2E2E2E' : 'rgba(0,0,0,0.06)'}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <GraduationCap size={16} style={{ color: 'var(--cp-blue)' }} />
                <span style={{ fontFamily: F.sora, fontSize: 12.5, fontWeight: 600, flex: 1, color: isDark ? '#EDEDED' : undefined }}>{p.title}</span>
                <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: diffColor }}>{p.difficulty}</span>
              </div>
              <p style={{ fontSize: 11, color: isDark ? '#878787' : 'var(--fg-3)', lineHeight: 1.4 }}>{p.description}</p>
              <div style={{ fontSize: 10, color: isDark ? '#878787' : 'var(--fg-4)', marginTop: 6 }}>{p.estimated_hours}h · {p.article_count} articles</div>
            </div>
          );
        })}
        {paths.length === 0 && (
          <p style={{ fontSize: 12, color: isDark ? '#878787' : 'var(--fg-4)', textAlign: 'center', padding: 20 }}>No learning paths available yet.</p>
        )}
      </div>
    </div>,
  ];

  const canNext = step === 0 ? !!role : step === 1 ? selectedDomains.length > 0 : true;

  return (
    <>
      {/* Overlay */}
      <div style={{ position: 'fixed', inset: 0, background: isDark ? 'rgba(0,0,0,0.6)' : 'rgba(15,23,42,0.4)', backdropFilter: 'blur(4px)', zIndex: 1000 }} />
      {/* Modal */}
      <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
        width: 480, maxHeight: '85vh', overflowY: 'auto',
        background: isDark ? '#1A1A1A' : 'var(--cp-float)', borderRadius: 12, padding: 32,
        boxShadow: isDark ? '0 16px 48px rgba(0,0,0,0.4)' : '0 16px 48px rgba(0,0,0,0.12)', zIndex: 1001,
      }}>
        {/* Step indicators */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 24 }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{
              width: i === step ? 24 : 8, height: 8, borderRadius: 4,
              background: i <= step ? 'var(--cp-blue)' : 'var(--divider)',
              transition: 'all 200ms',
            }} />
          ))}
        </div>

        {steps[step]}

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 28 }}>
          {step > 0 ? (
            <button onClick={() => setStep(s => s - 1)} style={{ background: 'none', border: 'none', fontSize: 12, color: isDark ? '#878787' : 'var(--fg-3)', cursor: 'pointer', fontWeight: 500 }}>Back</button>
          ) : <span />}
          {step < 2 ? (
            <button onClick={() => setStep(s => s + 1)} disabled={!canNext} style={{
              padding: '8px 20px', borderRadius: 8, background: canNext ? 'var(--cp-blue)' : 'var(--fg-4)',
              color: '#FFFFFF', border: 'none', fontSize: 12, fontWeight: 600,
              cursor: canNext ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', gap: 4,
            }}>
              Next <ChevronRight size={13} />
            </button>
          ) : (
            <button onClick={() => completeOnboarding.mutate()} style={{
              padding: '8px 24px', borderRadius: 8, background: 'var(--cp-blue)',
              color: '#FFFFFF', border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer',
            }}>
              Get Started
            </button>
          )}
        </div>
      </div>
    </>
  );
}

export default WikiOnboardingWizard;
