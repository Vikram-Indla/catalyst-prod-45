/**
 * Ideas Theme Page — /product/ideas/themes
 * Dark mode support via useTheme + DK/LK tokens.
 */
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Globe, BarChart3, Lightbulb, Target, Zap, TrendingUp, Settings, Info } from 'lucide-react';
import { useIdeaThemeSummary, useIdeasHub } from '@/hooks/useIdeasHub';
import { useTheme } from '@/hooks/useTheme';
import { DK, LK } from '@/utils/dark-mode-styles';

const MONO = "'JetBrains Mono', monospace";

const THEME_ICONS: Record<string, React.ElementType> = {
  'Provide Services for SBC': Building2, 'Digital Maturity 2026': Target, 'Marketplace': Globe, 'UX': Zap,
  'اتاحة خدمات': Building2, 'استعلام تحققي': BarChart3, 'المسح الصناعي': Settings, 'تحسين إجراء قائم': TrendingUp,
  'تحسين خدمة الشركاء': Building2, 'تضمين خدمة قطاعية': Globe, 'تقارير ومؤشرات': BarChart3, 'رقمنة إجراء جديد': Zap,
  'كفاءة الموقع': TrendingUp, 'مهام داخلية': Settings,
};

function isArabic(text: string): boolean { return /[\u0600-\u06FF]/.test(text); }

export default function IdeasThemePage() {
  const { isDark } = useTheme();
  const dk = isDark ? DK : LK;
  const { data: themes = [], isLoading } = useIdeaThemeSummary();
  const { data: allIdeas = [] } = useIdeasHub();
  const navigate = useNavigate();

  const ideasWithTheme = allIdeas.filter(i => i.theme).length;
  const convertedCount = allIdeas.filter(i => (i.status === 'Converted to Request' || i.status === 'Converted') && i.theme).length;

  const themeConvertedMap: Record<string, number> = {};
  allIdeas.forEach(i => {
    if (i.theme && (i.status === 'Converted to Request' || i.status === 'Converted')) {
      themeConvertedMap[i.theme] = (themeConvertedMap[i.theme] || 0) + 1;
    }
  });

  return (
    <div className="flex flex-col h-full" style={{ background: dk.pageBg }}>
      {/* Header */}
      <div style={{ padding: '20px 28px 16px', borderBottom: `1px solid ${dk.border}` }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 700, color: dk.t1, margin: 0, fontFamily: 'var(--cp-font-heading)' }}>Ideas Theme</h1>
            <p style={{ fontSize: '13px', color: dk.t3, margin: '4px 0 0' }}>Strategic themes grouping related ideas — sourced from backlog THEME field</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: dk.t3, fontSize: '12px' }}>
            <Info size={14} />
            <span>Themes are auto-discovered from the Ideas Theme field</span>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div style={{ background: dk.pageBg, borderBottom: `1px solid ${dk.border}`, display: 'flex', padding: '14px 28px', gap: '32px' }}>
        <div>
          <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: dk.t3, marginBottom: '4px' }}>TOTAL THEMES</div>
          <span style={{ fontSize: '24px', fontWeight: 800, fontFamily: 'var(--cp-font-heading)', color: dk.t1 }}>{themes.length}</span>
        </div>
        <div>
          <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: dk.t3, marginBottom: '4px' }}>IDEAS WITH THEME</div>
          <span style={{ fontSize: '24px', fontWeight: 800, fontFamily: 'var(--cp-font-heading)', color: dk.blue }}>{ideasWithTheme}</span>
        </div>
        <div>
          <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: dk.t3, marginBottom: '4px' }}>CONVERTED</div>
          <span style={{ fontSize: '24px', fontWeight: 800, fontFamily: 'var(--cp-font-heading)', color: dk.greenText }}>{convertedCount}</span>
        </div>
      </div>

      {/* Grid */}
      <div style={{ flex: 1, overflow: 'auto', padding: '24px 28px' }}>
        {isLoading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: dk.t3 }}>Loading themes...</div>
        ) : themes.length === 0 ? (
          <div style={{ padding: '60px', textAlign: 'center' }}>
            <Lightbulb size={48} style={{ color: dk.t3, margin: '0 auto 16px' }} />
            <div style={{ fontSize: '16px', fontWeight: 600, color: dk.t1 }}>No themes found</div>
            <div style={{ fontSize: '13px', color: dk.t3 }}>Add themes to ideas in the backlog</div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
            {themes.map(theme => {
              const IconComp = THEME_ICONS[theme.theme] || Lightbulb;
              const arabic = isArabic(theme.theme);
              const converted = themeConvertedMap[theme.theme] || 0;
              const convRate = theme.idea_count > 0 ? Math.round((converted / theme.idea_count) * 100) : 0;
              const progressPct = theme.idea_count > 0 ? (converted / theme.idea_count) * 100 : 0;
              const barColor = convRate >= 100 ? 'var(--ds-text-success, #16A34A)' : 'var(--ds-text-brand, #2563EB)';
              return (
                <div key={theme.theme} onClick={() => navigate(`/product/ideas/backlog?theme=${encodeURIComponent(theme.theme)}`)}
                  style={{
                    background: 'var(--cp-bg-elevated, #FFFFFF)', border: `1px solid ${isDark ? 'var(--ds-border-bold, #454545)' : dk.border}`, borderRadius: '8px',
                    padding: '16px', cursor: 'pointer', transition: 'all 0.15s', minHeight: '180px',
                    display: 'flex', flexDirection: 'column',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--ds-text-brand, #2563EB)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--cp-border-subtle, rgba(15,23,42,0.08))'; e.currentTarget.style.transform = 'none'; }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <span style={{ fontFamily: MONO, fontSize: '11px', fontWeight: 600, color: dk.t3 }}>
                      {theme.idea_count} {theme.idea_count === 1 ? 'idea' : 'ideas'}
                    </span>
                    <div style={{
                      width: 36, height: 50, borderRadius: 8, background: 'var(--cp-bg-sunken, #F1F5F9)', border: `1px solid ${dk.border}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', color: dk.t3,
                    }}>
                      <IconComp size={18} strokeWidth={2} />
                    </div>
                  </div>

                  <div style={{
                    fontSize: '14px', fontWeight: 650, color: dk.t1, marginBottom: '4px',
                    lineHeight: 1.4, fontFamily: 'var(--cp-font-heading)',
                    direction: arabic ? 'rtl' : 'ltr', textAlign: arabic ? 'right' : 'left',
                    display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                  }}>{theme.theme}</div>

                  <div style={{ flex: 1 }} />

                  <div style={{ borderTop: `1px solid ${dk.divider}`, paddingTop: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ fontFamily: MONO, fontSize: '11px', fontWeight: 600, color: converted > 0 ? dk.greenText : dk.t3 }}>
                        {converted}/{theme.idea_count} converted
                      </span>
                      <span style={{ fontFamily: MONO, fontSize: '11px', fontWeight: 600, color: dk.t3 }}>
                        {convRate}%
                      </span>
                    </div>
                    <div style={{ height: 6, borderRadius: 4, background: 'var(--cp-border-lt, #F1F5F9)', overflow: 'hidden', border: `1px solid ${dk.border}` }}>
                      <div style={{
                        width: `${Math.min(progressPct, 100)}%`, height: '100%',
                        background: barColor, borderRadius: 4, transition: 'width 0.3s',
                        minWidth: converted > 0 ? 4 : 0,
                      }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
