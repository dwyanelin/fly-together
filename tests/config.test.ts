import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import axios from 'axios';
import { readFileSync } from 'fs';
import { loadConfig } from '../src/config.js';

vi.mock('axios');
vi.mock('fs', () => ({
  readFileSync: vi.fn()
}));

const mockedAxios = vi.mocked(axios, true);
const mockedReadFileSync = vi.mocked(readFileSync);

const originalEnv = { ...process.env };

beforeEach(() => {
  process.env = { ...originalEnv };
  delete process.env.ROUTES_API_URL;
  delete process.env.SERPAPI_KEY;
  delete process.env.LINE_CHANNEL_ACCESS_TOKEN;
  delete process.env.LINE_USER_ID;
  vi.spyOn(console, 'log').mockImplementation(() => {});
});

afterEach(() => {
  process.env = { ...originalEnv };
});

describe('loadConfig', () => {
  it('reads local config/routes.json fallback when ROUTES_API_URL is not set', async () => {
    mockedReadFileSync.mockReturnValueOnce(
      JSON.stringify({
        routes: [
          {
            departure_id: 'TPE',
            arrival_id: 'NRT',
            outboundDate: '2026-10-24',
            returnDate: '2026-11-01',
            maxPrice: 12000
          }
        ]
      })
    );

    const cfg = await loadConfig();

    expect(mockedAxios.get).not.toHaveBeenCalled();
    expect(cfg.currency).toBe('TWD');
    expect(cfg.serpApiKey).toBe('');
    expect(cfg.lineChannelAccessToken).toBe('');
    expect(cfg.lineUserId).toBe('');
    expect(cfg.routes).toHaveLength(1);
    expect(cfg.routes[0]).toMatchObject({
      name: '東京(成田)',
      departure_id: 'TPE',
      arrival_id: 'NRT',
      maxPrice: 12000
    });
    expect(cfg.routes[0].allowedAirlines?.map(a => a.codes[0])).toEqual(['CI', 'BR', 'JX', 'JL', 'NH']);
  });

  it('fetches routes from ROUTES_API_URL and caps results to MAX_ROUTES (2)', async () => {
    process.env.ROUTES_API_URL = 'https://script.google.com/macros/s/abc/exec';
    process.env.SERPAPI_KEY = 'serp-key';
    process.env.LINE_CHANNEL_ACCESS_TOKEN = 'line-token';
    process.env.LINE_USER_ID = 'U12345';

    mockedAxios.get.mockResolvedValueOnce({
      data: {
        routes: [
          { departure_id: 'TPE', arrival_id: 'NRT', outboundDate: '2026-10-24', returnDate: '2026-11-01', maxPrice: 12000 },
          { departure_id: 'TPE', arrival_id: 'KIX', outboundDate: '2026-11-10', returnDate: '2026-11-15', maxPrice: 10000 },
          { departure_id: 'TPE', arrival_id: 'CTS', outboundDate: '2026-12-01', returnDate: '2026-12-06', maxPrice: 15000 }
        ]
      }
    });

    const cfg = await loadConfig();

    expect(mockedAxios.get).toHaveBeenCalledWith(
      'https://script.google.com/macros/s/abc/exec?action=list',
      { timeout: 15000 }
    );
    expect(cfg.serpApiKey).toBe('serp-key');
    expect(cfg.lineChannelAccessToken).toBe('line-token');
    expect(cfg.lineUserId).toBe('U12345');
    expect(cfg.routes).toHaveLength(2);
    expect(cfg.routes.map(r => r.arrival_id)).toEqual(['NRT', 'KIX']);
  });

  it('appends &action=list when ROUTES_API_URL already contains query parameters', async () => {
    process.env.ROUTES_API_URL = 'https://script.google.com/macros/s/abc/exec?foo=bar';

    mockedAxios.get.mockResolvedValueOnce({
      data: { routes: [] }
    });

    const cfg = await loadConfig();

    expect(mockedAxios.get).toHaveBeenCalledWith(
      'https://script.google.com/macros/s/abc/exec?foo=bar&action=list',
      { timeout: 15000 }
    );
    expect(cfg.routes).toEqual([]);
  });

  it('throws an error when Routes API returns an unexpected payload', async () => {
    process.env.ROUTES_API_URL = 'https://script.google.com/macros/s/abc/exec';

    mockedAxios.get.mockResolvedValueOnce({
      data: { error: 'bad request' }
    });

    await expect(loadConfig()).rejects.toThrow('Routes API returned unexpected payload');
  });
});
