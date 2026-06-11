import type { Meta, StoryObj } from '@storybook/react';

import askCatyDark from '@/assets/ask-caty-dark.svg';
import askCatyLight from '@/assets/ask-caty-light.svg';
import askCatyGradient from '@/assets/ask-caty-gradient.svg';
import catyDark from '@/assets/caty-dark.svg';
import catyLight from '@/assets/caty-light.svg';
import catyGradient from '@/assets/caty-gradient.svg';

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
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
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
          { label: 'light (dark bg)', src: askCatyDark, bg: '#2A2832', textColor: '#F6F4EF' },
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
          { label: 'light (dark bg)', src: catyDark, bg: '#2A2832', textColor: '#F6F4EF' },
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

export const InteractivePreview: StoryObj = {
  name: 'Interactive — Hover States',
  render: () => (
    <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
      {[
        { label: 'Ask Caty Gradient', src: askCatyGradient, bg: 'var(--ds-surface, #FFFFFF)' },
        { label: 'Caty Gradient', src: catyGradient, bg: 'var(--ds-surface, #FFFFFF)' },
        { label: 'Ask Caty Dark', src: askCatyLight, bg: 'var(--ds-surface, #FFFFFF)' },
        { label: 'Ask Caty Light', src: askCatyDark, bg: '#2A2832' },
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
