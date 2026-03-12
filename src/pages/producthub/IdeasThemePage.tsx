/**
 * Ideas Theme Page — /product/ideas/themes
 * 4-column card grid derived from SELECT DISTINCT theme FROM ph_ideas.
 * Progress bars use PRIMARY BLUE (#2563EB). GREEN only at 100% conversion.
 * NO dead CTAs — "+ New Theme" replaced with info text.
 */
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Globe, BarChart3, Lightbulb, Target, Zap, TrendingUp, Settings, Info } from 'lucide-react';
import { useIdeaThemeSummary, useIdeasHub } from '@/hooks/useIdeasHub';

const MONO = "'JetBrains Mono', monospace";

const THEME_ICONS: Record<string, React.ElementType> = {
  'Provide Services for SBC': Building2,
  'Digital Maturity 2026': Target,
  'Marketplace': Globe,
  'UX': Zap,
  'اتاحة خدمات': Building2,
  'استعلام تحققي': BarChart3,
  'المسح الصناعي': Settings,
  'تحسين إجراء قائم': TrendingUp,
  'تحسين خدمة الشركاء': Building2,
  'تضمين خدمة قطاعية': Globe,
  'تقارير ومؤشرات': BarChart3,
  'رقمنة إجراء جديد': Zap,
  'كفاءة الموقع': TrendingUp,
  'مهام داخلية': Settings,
};

function isArabic(text: string): boolean {
  return /[\u0600-\u06FF]/.test(text);
}

export default function IdeasThemePage() {
  const { data: themes = [], isLoading } = useIdeaThemeSummary();
  const { data: allIdeas = [] } = useIdeasHub();
  const navigate = useNavigate();

  const ideasWithTheme = allIdeas.filter(i => i.theme).length;
  const convertedCount = allIdeas.filter(i => (i.status === 'Converted to Initiative' || i.status === 'Converted') && i.theme).length;

  // Compute per-theme converted counts
  const themeConvertedMap: Record<string, number> = {};
  allIdeas.forEach(i => {
    if (i.theme && (i.status === 'Converted to Initiative' || i.status === 'Converted')) {
      themeConvertedMap[i.theme] = (themeConvertedMap[i.theme] || 0) + 1;
    }
  });

  return (
    <div className="flex flex-col h-full" style={{ background: '#FFFFFF' }}>
      {/* Header */}
      <div style={{ padding: '20px 28px 16px', borderBottom: '1px solid rgba(15,23,42,0.08)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#0F172A', margin: 0, fontFamily: "'Sora', sans-serif" }}>Ideas Theme</h1>
            <p style={{ fontSize: '13px', color: '#64748B', margin: '4px 0 0' }}>Strategic themes grouping related ideas — sourced from backlog THEME field</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748B', fontSize: '12px' }}>
            <Info size={14} />
            <span>Themes are auto-discovered from the Ideas Theme field</span>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div style={{ background: '#FFFFFF', borderBottom: '1px solid rgba(15,23,42,0.08)', display: 'flex', padding: '14px 28px', gap: '32px' }}>
        <div>
          <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748B', marginBottom: '4px' }}>TOTAL THEMES</div>
          <span style={{ fontSize: '24px', fontWeight: 800, fontFamily: "'Sora', sans-serif", color: '#0F172A' }}>{themes.length}</span>
        </div>
        <div>
          <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748B', marginBottom: '4px' }}>IDEAS WITH THEME</div>
          <span style={{ fontSize: '24px', fontWeight: 800, fontFamily: "'Sora', sans-serif", color: '#2563EB' }}>{ideasWithTheme}</span>
        </div>
        <div>
          <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748B', marginBottom: '4px' }}>CONVERTED</div>
          <span style={{ fontSize: '24px', fontWeight: 800, fontFamily: "'Sora', sans-serif", color: '#11853D' }}>{convertedCount}</span>
        </div>
      </div>

      {/* Grid */}
      <div style={{ flex: 1, overflow: 'auto', padding: '24px 28px' }}>
        {isLoading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#94A3B8' }}>Loading themes...</div>
        ) : themes.length === 0 ? (
          <div style={{ padding: '60px', textAlign: 'center' }}>
            <Lightbulb size={48} style={{ color: '#94A3B8', margin: '0 auto 16px' }} />
            <div style={{ fontSize: '16px', fontWeight: 600, color: '#0F172A' }}>No themes found</div>
            <div style={{ fontSize: '13px', color: '#94A3B8' }}>Add themes to ideas in the backlog</div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
            {themes.map(theme => {
              const IconComp = THEME_ICONS[theme.theme] || Lightbulb;
              const arabic = isArabic(theme.theme);
              const converted = themeConvertedMap[theme.theme] || 0;
              const convRate = theme.idea_count > 0 ? Math.round((converted / theme.idea_count) * 100) : 0;
              // Progress = converted / total for that theme
              const progressPct = theme.idea_count > 0 ? (converted / theme.idea_count) * 100 : 0;
              // BLUE for progress, GREEN only at 100%
              const barColor = convRate >= 100 ? '#16A34A' : '#2563EB';
              return (
                <div key={theme.theme} onClick={() => navigate(`/product/ideas/backlog?theme=${encodeURIComponent(theme.theme)}`)}
                  style={{
                    background: '#FFFFFF', border: '1px solid rgba(15,23,42,0.08)', borderRadius: '8px',
                    padding: '16px', cursor: 'pointer', transition: 'all 0.15s', minHeight: '180px',
                    display: 'flex', flexDirection: 'column',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = '#2563EB'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(15,23,42,0.08)'; e.currentTarget.style.transform = 'none'; }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <span style={{ fontFamily: MONO, fontSize: '11px', fontWeight: 600, color: '#64748B' }}>
                      {theme.idea_count} {theme.idea_count === 1 ? 'idea' : 'ideas'}
                    </span>
                    <div style={{
                      width: 36, height: 36, borderRadius: 8, background: '#F1F5F9', border: '1px solid #E2E8F0',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569',
                    }}>
                      <IconComp size={18} strokeWidth={2} />
                    </div>
                  </div>

                  <div style={{
                    fontSize: '14px', fontWeight: 650, color: '#0F172A', marginBottom: '4px',
                    lineHeight: 1.4, fontFamily: "'Sora', sans-serif",
                    direction: arabic ? 'rtl' : 'ltr', textAlign: arabic ? 'right' : 'left',
                    display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                  }}>{theme.theme}</div>

                  <div style={{ flex: 1 }} />

                  <div style={{ borderTop: '1px solid rgba(15,23,42,0.06)', paddingTop: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ fontFamily: MONO, fontSize: '11px', fontWeight: 600, color: converted > 0 ? '#11853D' : '#64748B' }}>
                        {converted}/{theme.idea_count} converted
                      </span>
                      <span style={{ fontFamily: MONO, fontSize: '11px', fontWeight: 600, color: '#64748B' }}>
                        {convRate}%
                      </span>
                    </div>
                    <div style={{ height: 6, borderRadius: 3, background: '#F1F5F9', overflow: 'hidden', border: '1px solid #E2E8F0' }}>
                      <div style={{
                        width: `${Math.min(progressPct, 100)}%`, height: '100%',
                        background: barColor, borderRadius: 3, transition: 'width 0.3s',
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
