import { describe, it, expect } from 'vitest';
import { airportName } from '../../src/utils/airports.js';

describe('airportName', () => {
  it('returns Chinese display name for known IATA codes', () => {
    expect(airportName('TPE')).toBe('台北(桃園)');
    expect(airportName('NRT')).toBe('東京(成田)');
    expect(airportName('KIX')).toBe('大阪(關西)');
    expect(airportName('BKK')).toBe('曼谷(蘇凡納布)');
  });

  it('normalizes lowercase and mixed-case IATA codes', () => {
    expect(airportName('nrt')).toBe('東京(成田)');
    expect(airportName('Icn')).toBe('首爾(仁川)');
  });

  it('falls back to uppercased code when airport is unknown', () => {
    expect(airportName('xyz')).toBe('XYZ');
    expect(airportName('LAX')).toBe('LAX');
  });
});
