import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { main } from '../src/main.js';
import { loadConfig, type AppConfig } from '../src/config.js';
import { fetchMatchingFlights } from '../src/services/serpapi.js';
import { sendFlexMessage } from '../src/services/linemessaging.js';
import { buildFlexBubble, buildCarouselMessage } from '../src/services/flex-builder.js';

vi.mock('../src/config.js');
vi.mock('../src/services/serpapi.js');
vi.mock('../src/services/linemessaging.js');
vi.mock('../src/services/flex-builder.js');

const mockedLoadConfig = vi.mocked(loadConfig);
const mockedFetchMatchingFlights = vi.mocked(fetchMatchingFlights);
const mockedSendFlexMessage = vi.mocked(sendFlexMessage);
const mockedBuildFlexBubble = vi.mocked(buildFlexBubble);
const mockedBuildCarouselMessage = vi.mocked(buildCarouselMessage);

const originalEnv = { ...process.env };

const baseConfig: AppConfig = {
  serpApiKey: 'test-serp-key',
  lineChannelAccessToken: 'test-line-token',
  lineUserId: 'U12345',
  currency: 'TWD',
  routes: [
    {
      name: '東京(成田)',
      departure_id: 'TPE',
      arrival_id: 'NRT',
      outboundDate: '2026-10-24',
      returnDate: '2026-11-01',
      maxPrice: 12000,
      allowedAirlines: [{ codes: ['CI'], patterns: ['China Airlines'] }]
    }
  ]
};

beforeEach(() => {
  process.env = { ...originalEnv };
  delete process.env.FORM_URL;
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
  mockedBuildFlexBubble.mockReturnValue({ type: 'bubble' } as any);
  mockedBuildCarouselMessage.mockReturnValue({ type: 'flex' } as any);
});

afterEach(() => {
  process.env = { ...originalEnv };
});

describe('main', () => {
  it('exits with code 1 when SERPAPI_KEY is missing', async () => {
    mockedLoadConfig.mockResolvedValueOnce({ ...baseConfig, serpApiKey: '' });
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {
      throw new Error('PROCESS_EXIT');
    }) as never);

    await expect(main()).rejects.toThrow('PROCESS_EXIT');
    expect(exitSpy).toHaveBeenCalledWith(1);
    expect(mockedFetchMatchingFlights).not.toHaveBeenCalled();
  });

  it('returns early when no routes are configured', async () => {
    mockedLoadConfig.mockResolvedValueOnce({ ...baseConfig, routes: [] });

    await main();

    expect(mockedFetchMatchingFlights).not.toHaveBeenCalled();
    expect(mockedSendFlexMessage).not.toHaveBeenCalled();
  });

  it('builds carousel and sends LINE notification when affordable flights are found', async () => {
    process.env.FORM_URL = 'https://example.com/form';
    mockedLoadConfig.mockResolvedValueOnce(baseConfig);
    mockedFetchMatchingFlights.mockResolvedValueOnce([
      { price: 10500, link: 'https://flights.example/1', airline: 'China Airlines', outboundTime: '2026-10-24 08:30' },
      { price: 13500, link: 'https://flights.example/2', airline: 'China Airlines', outboundTime: '2026-10-24 14:00' }
    ]);
    mockedSendFlexMessage.mockResolvedValueOnce();

    await main();

    expect(mockedBuildFlexBubble).toHaveBeenCalledWith(
      expect.objectContaining({
        targetName: '東京(成田)',
        maxPrice: 12000,
        bookingLink: 'https://flights.example/1',
        settingsUrl: 'https://example.com/form',
        flights: [{ airline: 'China Airlines', outboundTime: '2026-10-24 08:30', price: 10500 }]
      })
    );
    expect(mockedBuildCarouselMessage).toHaveBeenCalledWith(
      [{ type: 'bubble' }],
      '✈️ 發現達標機票！東京(成田) $10,500 起'
    );
    expect(mockedSendFlexMessage).toHaveBeenCalledWith(
      'test-line-token',
      { type: 'flex' },
      'U12345'
    );
  });

  it('logs error and finishes gracefully when LINE notification fails', async () => {
    mockedLoadConfig.mockResolvedValueOnce(baseConfig);
    mockedFetchMatchingFlights.mockResolvedValueOnce([
      { price: 11000, link: 'https://flights.example/1', airline: 'China Airlines', outboundTime: '2026-10-24 08:30' }
    ]);
    mockedSendFlexMessage.mockRejectedValueOnce(new Error('LINE 500'));

    await expect(main()).resolves.toBeUndefined();
    expect(console.error).toHaveBeenCalledWith('LINE notification failed:', expect.any(Error));
  });

  it('skips notification when flights exist but none are under maxPrice', async () => {
    mockedLoadConfig.mockResolvedValueOnce(baseConfig);
    mockedFetchMatchingFlights.mockResolvedValueOnce([
      { price: 15000, link: 'https://flights.example/1', airline: 'China Airlines', outboundTime: '2026-10-24 08:30' }
    ]);

    await main();

    expect(mockedBuildFlexBubble).not.toHaveBeenCalled();
    expect(mockedSendFlexMessage).not.toHaveBeenCalled();
  });

  it('skips notification when no flight results are returned', async () => {
    mockedLoadConfig.mockResolvedValueOnce({
      ...baseConfig,
      routes: [{ ...baseConfig.routes[0], allowedAirlines: undefined }]
    });
    mockedFetchMatchingFlights.mockResolvedValueOnce([]);

    await main();

    expect(mockedBuildFlexBubble).not.toHaveBeenCalled();
    expect(mockedSendFlexMessage).not.toHaveBeenCalled();
  });
});
