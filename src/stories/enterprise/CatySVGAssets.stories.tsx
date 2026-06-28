import type { Meta, StoryObj } from '@storybook/react';

import { CatyFabIcon } from '@/components/chat/dock/CatyFabIcon';
import askCatyDark from '@/assets/ask-caty-dark.svg';
import askCatyLight from '@/assets/ask-caty-light.svg';
import askCatyGradient from '@/assets/ask-caty-gradient.svg';
import catyDark from '@/assets/caty-dark.svg';
import catyLight from '@/assets/caty-light.svg';
import catyGradient from '@/assets/caty-gradient.svg';
import catyAI from '@/assets/caty-ai.svg';
import catyAIBg from '@/assets/caty-ai-bg.svg';
import logoMarkLight from '@/assets/logo-mark-light.svg';
import logoMarkDark from '@/assets/logo-mark-dark.svg';

const meta: Meta = {
  title: 'Enterprise Components/Caty AI/SVG Assets',
  parameters: { layout: 'padded' },
};
export default meta;

const sizes = [24, 32, 48, 64, 96, 128] as const;

function AssetRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 32 }}>
      <p style={{ margin: '0 0 12px', fontSize: 12, fontWeight: 600, color: 'var(--ds-text-subtle, #6B778C)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        {label}
      </p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
        {children}
      </div>
    </div>
  );
}

function SizeChip({ size, bg, src, alt }: { size: number; bg: string; src: string; alt: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <div style={{ background: bg, borderRadius: 8, padding: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <img src={src} alt={alt} width={size} height={size} />
      </div>
      <span style={{ fontSize: 11, color: 'var(--ds-text-subtlest, #6B778C)' }}>{size}px</span>
    </div>
  );
}

export const AskCaty: StoryObj = {
  render: () => (
    <div>
      <AssetRow label="Ask Caty — Gradient (on light bg)">
        {sizes.map(s => <SizeChip key={s} size={s} bg="var(--ds-surface, #FFFFFF)" src={askCatyGradient} alt="Ask Caty gradient" />)}
      </AssetRow>
      <AssetRow label="Ask Caty — Dark (on light bg)">
        {sizes.map(s => <SizeChip key={s} size={s} bg="var(--ds-surface, #FFFFFF)" src={askCatyLight} alt="Ask Caty dark" />)}
      </AssetRow>
      <AssetRow label="Ask Caty — Light (on dark bg)">
        {/* ads-scanner:ignore-line — Storybook design demo, intentional dark bg */}
        {sizes.map(s => <SizeChip key={s} size={s} bg="#2A2832" src={askCatyDark} alt="Ask Caty light" />)}
      </AssetRow>
    </div>
  ),
};

export const Caty: StoryObj = {
  render: () => (
    <div>
      <AssetRow label="Caty — Gradient (on light bg)">
        {sizes.map(s => <SizeChip key={s} size={s} bg="var(--ds-surface, #FFFFFF)" src={catyGradient} alt="Caty gradient" />)}
      </AssetRow>
      <AssetRow label="Caty — Dark (on light bg)">
        {sizes.map(s => <SizeChip key={s} size={s} bg="var(--ds-surface, #FFFFFF)" src={catyLight} alt="Caty dark" />)}
      </AssetRow>
      <AssetRow label="Caty — Light (on dark bg)">
        {/* ads-scanner:ignore-line — Storybook design demo, intentional dark bg */}
        {sizes.map(s => <SizeChip key={s} size={s} bg="#2A2832" src={catyDark} alt="Caty light" />)}
      </AssetRow>
    </div>
  ),
};

export const AllVariants: StoryObj = {
  name: 'All Variants — Comparison',
  render: () => (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40 }}>
      <div>
        <h3 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 600, color: 'var(--ds-text, #172B4D)' }}>Ask Caty</h3>
        {[
          { label: 'gradient', src: askCatyGradient, bg: 'var(--ds-surface, #FFFFFF)', textColor: 'var(--ds-text-subtle, #6B778C)' },
          { label: 'dark (light bg)', src: askCatyLight, bg: 'var(--ds-surface, #FFFFFF)', textColor: 'var(--ds-text-subtle, #6B778C)' },
          { label: 'light (dark bg)', src: askCatyDark, bg: '#2A2832', textColor: '#F6F4EF' }, // ads-scanner:ignore-line — Storybook design demo
        ].map(({ label, src, bg, textColor }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, background: bg, borderRadius: 8, padding: '12px 16px' }}>
            <img src={src} alt={`Ask Caty ${label}`} width={48} height={48} />
            <span style={{ fontSize: 13, color: textColor }}>{label}</span>
          </div>
        ))}
      </div>
      <div>
        <h3 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 600, color: 'var(--ds-text, #172B4D)' }}>Caty</h3>
        {[
          { label: 'gradient', src: catyGradient, bg: 'var(--ds-surface, #FFFFFF)', textColor: 'var(--ds-text-subtle, #6B778C)' },
          { label: 'dark (light bg)', src: catyLight, bg: 'var(--ds-surface, #FFFFFF)', textColor: 'var(--ds-text-subtle, #6B778C)' },
          { label: 'light (dark bg)', src: catyDark, bg: '#2A2832', textColor: '#F6F4EF' }, // ads-scanner:ignore-line — Storybook design demo
        ].map(({ label, src, bg, textColor }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, background: bg, borderRadius: 8, padding: '12px 16px' }}>
            <img src={src} alt={`Caty ${label}`} width={48} height={48} />
            <span style={{ fontSize: 13, color: textColor }}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  ),
};

export const BrandLogoMark: StoryObj = {
  name: 'Brand — Logo Mark + Caty AI',
  render: () => (
    <div>
      <AssetRow label="Caty AI — with background (dark canvas)">
        {/* ads-scanner:ignore-line — Storybook design demo, intentional dark bg */}
        {sizes.map(s => <SizeChip key={s} size={s} bg="#2A2832" src={catyAIBg} alt="Caty AI with bg" />)}
      </AssetRow>
      <AssetRow label="Caty AI — no background (transparent)">
        {sizes.map(s => <SizeChip key={s} size={s} bg="var(--ds-surface-sunken, #F7F8F9)" src={catyAI} alt="Caty AI" />)}
        {/* ads-scanner:ignore-line — Storybook design demo, intentional dark bg */}
        {sizes.map(s => <SizeChip key={s} size={s} bg="#2A2832" src={catyAI} alt="Caty AI on dark" />)}
      </AssetRow>
      <AssetRow label="Logo Mark — Light (on light bg)">
        {sizes.map(s => <SizeChip key={s} size={s} bg="var(--ds-surface, #FFFFFF)" src={logoMarkLight} alt="Logo mark light" />)}
      </AssetRow>
      <AssetRow label="Logo Mark — Dark (on dark bg)">
        {/* ads-scanner:ignore-line — Storybook design demo, intentional dark bg */}
        {sizes.map(s => <SizeChip key={s} size={s} bg="#1E2A3A" src={logoMarkDark} alt="Logo mark dark" />)}
      </AssetRow>
    </div>
  ),
};

export const BrandComparison: StoryObj = {
  name: 'Brand — All Mark Variants',
  render: () => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24 }}>
      {[
        // ads-scanner:ignore-next-line — Storybook design demo, intentional dark bg
        { label: 'Caty AI BG', src: catyAIBg, bg: '#2A2832', textColor: '#F6F4EF' },
        { label: 'Caty AI', src: catyAI, bg: 'var(--ds-surface-sunken, #F7F8F9)', textColor: 'var(--ds-text-subtle, #6B778C)' },
        { label: 'Logo Mark Light', src: logoMarkLight, bg: 'var(--ds-surface, #FFFFFF)', textColor: 'var(--ds-text-subtle, #6B778C)' },
        // ads-scanner:ignore-next-line — Storybook design demo, intentional dark bg
        { label: 'Logo Mark Dark', src: logoMarkDark, bg: '#1E2A3A', textColor: '#F6F4EF' },
      ].map(({ label, src, bg, textColor }) => (
        <div key={label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, background: bg, borderRadius: 12, padding: 24 }}>
          <img src={src} alt={label} width={80} height={80} />
          <span style={{ fontSize: 12, color: textColor, fontWeight: 600 }}>{label}</span>
        </div>
      ))}
    </div>
  ),
};

export const CatyFabIconStory: StoryObj = {
  name: 'FAB Icon — Animated Component',
  render: () => (
    <div>
      <p style={{ margin: '0 0 16px', fontSize: 12, fontWeight: 600, color: 'var(--ds-text-subtle, #6B778C)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        CatyFabIcon — inline SVG with CSS animation states
      </p>
      <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        {([16, 24, 32, 40, 48, 56, 64, 80, 96] as const).map(s => (
          <div key={s} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <div style={{ background: 'var(--ds-surface, #FFFFFF)', borderRadius: 8, padding: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 1px 4px var(--ds-background-neutral-subtle-pressed, rgba(9,30,66,0.12))' }}>
              <CatyFabIcon size={s} />
            </div>
            <span style={{ fontSize: 11, color: 'var(--ds-text-subtlest, #6B778C)' }}>{s}px</span>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 32, display: 'flex', gap: 32, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ds-text-subtle, #6B778C)' }}>Default (breathing)</span>
          <div style={{ background: 'var(--ds-surface, #FFFFFF)', borderRadius: 12, padding: 16, boxShadow: '0 1px 4px var(--ds-background-neutral-subtle-pressed, rgba(9,30,66,0.12))' }}>
            <CatyFabIcon size={56} />
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ds-text-subtle, #6B778C)' }}>On dark bg</span>
          {/* ads-scanner:ignore-line — Storybook design demo, intentional dark bg */}
        <div style={{ background: '#2A2832', borderRadius: 12, padding: 16 }}>
            <CatyFabIcon size={56} />
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ds-text-subtle, #6B778C)' }}>Awake state (hover)</span>
          <div style={{ background: 'var(--ds-surface, #FFFFFF)', borderRadius: 12, padding: 16, boxShadow: '0 1px 4px var(--ds-background-neutral-subtle-pressed, rgba(9,30,66,0.12))' }}>
            <span className="cc-fab-icon" style={{ display: 'inline-block', width: 56, height: 56 }}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width={56} height={56} className="is-awake" role="img" aria-label="Ask Caty awake">
                <defs>
                  <linearGradient id="askdg-sb" x1="256" y1="40" x2="256" y2="470" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#F79357" /><stop offset=".5" stopColor="var(--ds-background-danger-bold, #C9372C)" />
                    {/* ads-scanner:ignore-line — Storybook gradient asset, not design system */}
                    <stop offset=".75" stopColor="#B41572" /><stop offset="1" stopColor="#CC1E9A" />
                  </linearGradient>
                </defs>
                <style>{`.cf-sb{transform-box:fill-box;transform-origin:50% 55%;transform:scale(1.05)}.cf-eyes-sb{opacity:0}.cf-awake-sb{opacity:1}.cf-ears-sb{transform-box:fill-box;transform-origin:50% 100%;transform:scaleY(1.28)}`}</style>
                <g className="cf-sb">
                  <path d="M404 392 Q462 392 456 336" fill="none" stroke="url(#askdg-sb)" strokeWidth="26" strokeLinecap="round" />
                  <path d="M421.802 200.297V93.9736H259.279L233.457 127.39L210.674 93.9736H154.474C39.037 223.992 106.375 363.833 154.474 417.501H421.802V309.659H279.025L236.495 374.972C170.878 271.686 209.155 173.97 236.495 138.022L279.025 200.297H421.802Z" fill="url(#askdg-sb)" />
                  <text x="350" y="293" textAnchor="middle" fontFamily="'Atlassian Sans', system-ui, sans-serif" fontSize="84" fontWeight="800" fontStyle="italic" fill="var(--caty-fg, var(--ds-text, #172B4D))">ask</text>
                  <g className="cf-ears-sb">
                    <path d="M270 100 Q300 26 322 100 Z" fill="url(#askdg-sb)" /><path d="M358 100 Q388 24 408 100 Z" fill="url(#askdg-sb)" />
                    <path d="M288 96 Q301 56 312 94" fill="none" stroke="var(--caty-fg, var(--ds-text, #172B4D))" strokeWidth="9" strokeLinecap="round" opacity=".55" />
                    <path d="M374 96 Q387 54 398 94" fill="none" stroke="var(--caty-fg, var(--ds-text, #172B4D))" strokeWidth="9" strokeLinecap="round" opacity=".55" />
                  </g>
                  <g stroke="var(--caty-fg, var(--ds-text, #172B4D))" strokeWidth="9.5" strokeLinecap="round" fill="none">
                    <path d="M300 172 Q244 168 226 178" /><path d="M300 182 Q240 185 222 198" /><path d="M302 192 Q248 201 232 214" />
                    <path d="M398 172 Q454 168 472 178" /><path d="M398 182 Q458 185 476 198" /><path d="M396 192 Q452 201 468 214" />
                  </g>
                  <path d="M340 176 L356 176 Q348 188 340 176 Z" fill="var(--caty-fg, var(--ds-text, #172B4D))" />
                  <g className="cf-eyes-sb" fill="none" stroke="var(--caty-fg, var(--ds-text, #172B4D))" strokeWidth="13" strokeLinecap="round">
                    <path d="M304 150 Q322 170 340 150" /><path d="M356 150 Q374 170 392 150" />
                  </g>
                  <g className="cf-awake-sb">
                    <circle cx="322" cy="150" r="20" fill="var(--ds-surface, #FFFFFF)" stroke="var(--caty-fg, #23222B)" strokeWidth="4.5" />
                    <circle cx="374" cy="150" r="20" fill="var(--ds-surface, #FFFFFF)" stroke="var(--caty-fg, #23222B)" strokeWidth="4.5" />
                    <circle cx="324" cy="153" r="8.5" fill="var(--caty-fg, var(--ds-text, #172B4D))" /><circle cx="376" cy="153" r="8.5" fill="var(--caty-fg, var(--ds-text, #172B4D))" />
                    <circle cx="320" cy="147" r="3.2" fill="var(--ds-surface, #FFFFFF)" /><circle cx="372" cy="147" r="3.2" fill="var(--ds-surface, #FFFFFF)" />
                  </g>
                </g>
              </svg>
            </span>
          </div>
        </div>
      </div>
      <p style={{ marginTop: 16, fontSize: 12, color: 'var(--ds-text-subtlest, #6B778C)' }}>
        Hover/active on the default size chips to see live animation states.
      </p>
    </div>
  ),
};

export const InteractivePreview: StoryObj = {
  name: 'Interactive — Hover States',
  render: () => (
    <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
      {[
        { label: 'Ask Caty Gradient', src: askCatyGradient, bg: 'var(--ds-surface, #FFFFFF)' },
        { label: 'Caty Gradient', src: catyGradient, bg: 'var(--ds-surface, #FFFFFF)' },
        { label: 'Ask Caty Dark', src: askCatyLight, bg: 'var(--ds-surface, #FFFFFF)' },
        { label: 'Ask Caty Light', src: askCatyDark, bg: '#2A2832' }, // ads-scanner:ignore-line — Storybook design demo
      ].map(({ label, src, bg }) => (
        <div key={label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <div style={{ background: bg, borderRadius: 12, padding: 16 }}>
            <img src={src} alt={label} width={96} height={96} />
          </div>
          <span style={{ fontSize: 12, color: 'var(--ds-text-subtle, #6B778C)' }}>{label}</span>
          <span style={{ fontSize: 11, color: 'var(--ds-text-subtlest, #6B778C)' }}>SVG hover animations active</span>
        </div>
      ))}
    </div>
  ),
};
