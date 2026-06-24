import { describe, it, expect } from 'vitest';
import { generateGoogleFlightsUrl } from '../../src/utils/tfs-gen.js';

describe('generateGoogleFlightsUrl', () => {
  it('returns a valid Google Flights URL with airline filters', () => {
    const url = generateGoogleFlightsUrl('TPE', 'NRT', '2026-10-24', '2026-11-01', ['CI', 'BR']);
    expect(url).toContain('https://www.google.com/travel/flights');
    expect(url).toContain('tfs=');
    expect(url).toContain('tfu=EgYIAhAAGAA');
  });

  it('returns a fallback URL when no airlines provided', () => {
    const url = generateGoogleFlightsUrl('TPE', 'NRT', '2026-10-24', '2026-11-01', []);
    expect(url).toContain('https://www.google.com/travel/flights');
    expect(url).toContain('NRT');
    expect(url).toContain('TPE');
  });

  it('produces a URL-safe base64 string (no +, /, or =)', () => {
    const url = generateGoogleFlightsUrl('TPE', 'NRT', '2026-10-24', '2026-11-01', ['CI']);
    const tfsParam = new URL(url).searchParams.get('tfs');
    expect(tfsParam).toBeTruthy();
    expect(tfsParam).not.toMatch(/[+/=]/);
  });

  it('produces different URLs for different routes', () => {
    const url1 = generateGoogleFlightsUrl('TPE', 'NRT', '2026-10-24', '2026-11-01', ['CI']);
    const url2 = generateGoogleFlightsUrl('TPE', 'FUK', '2026-10-24', '2026-11-01', ['CI']);
    expect(url1).not.toBe(url2);
  });
});
