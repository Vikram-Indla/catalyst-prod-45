import { describe, it, expect } from 'vitest';
import { getIceServers } from './iceConfig';

describe('getIceServers', () => {
  it('always includes a Google STUN server', () => {
    const servers = getIceServers();
    const urls = servers.flatMap(s => Array.isArray(s.urls) ? s.urls : [s.urls]);
    expect(urls.some(u => u.startsWith('stun:'))).toBe(true);
  });

  it('omits TURN when env is unset', () => {
    const servers = getIceServers();
    const urls = servers.flatMap(s => Array.isArray(s.urls) ? s.urls : [s.urls]);
    expect(urls.some(u => u.startsWith('turn:'))).toBe(false);
  });
});
