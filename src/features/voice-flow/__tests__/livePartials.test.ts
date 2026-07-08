import { describe, it, expect } from 'vitest';
import { LivePartialsController } from '../livePartials';

describe('LivePartialsController', () => {
  it('starts fully provisional — nothing is stable on first sight', () => {
    const c = new LivePartialsController();
    expect(c.update('hello world')).toEqual({ stable: '', provisional: 'hello world' });
  });

  it('stabilises the agreed prefix after two consecutive updates', () => {
    const c = new LivePartialsController();
    c.update('the quarterly release');
    const p = c.update('the quarterly release train departs');
    expect(p.stable).toBe('the quarterly release ');
    expect(p.provisional).toBe('train departs');
  });

  it('never solidifies a half-word', () => {
    const c = new LivePartialsController();
    c.update('the quart');
    const p = c.update('the quarterly');
    // 'quart' agrees as a prefix of 'quarterly' but is not a whole word.
    expect(p.stable).toBe('the ');
    expect(p.provisional).toBe('quarterly');
  });

  it('stable text NEVER shrinks when the tail is rewritten', () => {
    const c = new LivePartialsController();
    c.update('deploy the fix to');
    c.update('deploy the fix to staging');
    const before = c.current.stable;
    const p = c.update('deploy the fix to production');
    expect(p.stable).toBe(before);
    expect(p.stable.length).toBeGreaterThan(0);
    expect(p.provisional).toBe('production');
  });

  it('holds committed text if the engine rewrites inside the stable span', () => {
    const c = new LivePartialsController();
    c.update('send the report');
    c.update('send the report today');
    const stable = c.current.stable;
    // Pathological full-rewrite — must not shrink or rewrite stable.
    const p = c.update('completely different text');
    expect(p.stable).toBe(stable);
    expect(p.provisional).toBe('');
  });

  it('handles Arabic transcripts', () => {
    const c = new LivePartialsController();
    c.update('أريد ترجمة هذا');
    const p = c.update('أريد ترجمة هذا النص إلى الإنجليزية');
    expect(p.stable).toBe('أريد ترجمة هذا ');
    expect(p.provisional).toBe('النص إلى الإنجليزية');
  });

  it('handles mixed-direction transcripts', () => {
    const c = new LivePartialsController();
    c.update('English word ثم');
    const p = c.update('English word ثم عربي');
    expect(p.stable).toBe('English word ثم ');
    expect(p.provisional).toBe('عربي');
  });

  it('finalize stabilises everything', () => {
    const c = new LivePartialsController();
    c.update('wrap it');
    c.update('wrap it up');
    const p = c.finalize('wrap it up now');
    expect(p).toEqual({ stable: 'wrap it up now', provisional: '' });
  });

  it('reset clears state for the next session', () => {
    const c = new LivePartialsController();
    c.update('one');
    c.update('one two');
    c.reset();
    expect(c.update('fresh start')).toEqual({ stable: '', provisional: 'fresh start' });
  });

  it('empty → text → growth sequence', () => {
    const c = new LivePartialsController();
    expect(c.update('')).toEqual({ stable: '', provisional: '' });
    expect(c.update('hi').provisional).toBe('hi');
    const p = c.update('hi there');
    expect(p.stable).toBe('hi ');
    expect(p.provisional).toBe('there');
  });
});
