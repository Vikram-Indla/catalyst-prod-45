import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useWikiArticleTemplates } from '@/hooks/useWikiHub';
import { ChevronRight, FileText } from 'lucide-react';

export default function WikiTemplatesPage() {
  const navigate = useNavigate();
  const { data: templates, isLoading } = useWikiArticleTemplates();

  return (
    <div style={{ fontFamily: 'Inter, sans-serif', color: '#0F172A', background: '#F8FAFC', minHeight: '100%', padding: '24px 40px 48px' }}>
      <nav style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 24 }}>
        <span onClick={() => navigate('/wiki')} style={{ fontSize: 13, color: '#2563EB', cursor: 'pointer' }}>Wiki</span>
        <ChevronRight size={12} style={{ color: '#94A3B8' }} />
        <span style={{ fontSize: 13, color: '#64748B', fontWeight: 600 }}>Templates</span>
      </nav>

      <h1 style={{ fontFamily: 'Sora, sans-serif', fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Article Templates</h1>
      <p style={{ fontSize: 12, color: '#64748B', marginBottom: 24 }}>Pre-built structures for common article types.</p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
        {isLoading ? Array.from({ length: 5 }).map((_, i) => (
          <div key={i} style={{ padding: 20, borderRadius: 8, background: '#FFFFFF', border: '0.75px solid rgba(0,0,0,0.06)', height: 140 }} />
        )) : (templates ?? []).map((t: any) => {
          const sections = (t.template_sections as any[]) || [];
          return (
            <div key={t.id} style={{ padding: 20, borderRadius: 8, background: '#FFFFFF', border: '0.75px solid rgba(0,0,0,0.06)', transition: 'border-color 120ms' }}
              onMouseEnter={e => e.currentTarget.style.borderColor = '#2563EB'} onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(0,0,0,0.06)'}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <div style={{ width: 32, height: 32, borderRadius: 6, background: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <FileText size={16} style={{ color: '#64748B' }} />
                </div>
                <div>
                  <div style={{ fontFamily: 'Sora, sans-serif', fontSize: 13, fontWeight: 600, color: '#0F172A' }}>{t.name}</div>
                  <div style={{ fontSize: 11, color: '#64748B' }}>{t.description}</div>
                </div>
              </div>
              <div style={{ fontSize: 11, color: '#64748B', marginBottom: 12 }}>{sections.length} sections</div>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {sections.slice(0, 4).map((s: any, i: number) => (
                  <span key={i} style={{ fontSize: 9, padding: '2px 6px', borderRadius: 3, background: '#F1F5F9', color: '#64748B' }}>{s.title}</span>
                ))}
                {sections.length > 4 && <span style={{ fontSize: 9, color: '#94A3B8' }}>+{sections.length - 4} more</span>}
              </div>
              <button style={{
                marginTop: 12, fontSize: 11, fontWeight: 650, padding: '6px 16px', borderRadius: 4, border: '0.75px solid rgba(0,0,0,0.06)',
                background: '#FFFFFF', color: '#2563EB', cursor: 'pointer', width: '100%',
              }}>Use Template</button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
