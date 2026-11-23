import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import { fetchMatchingFlights } from '../../src/services/serpapi.js';

vi.mock('axios');
const mockedAxios = vi.mocked(axios, true);

const makeFlight = (airline: string, flightNumber: string, price: number, time: string = '2026-10-24 08:30') => ({
  price,
  flights: [{
    departure_airport: { id: 'TPE', name: 'Taipei', time },
    arrival_airport: { id: 'NRT', name: 'Narita', time: '2026-10-24 12:30' },
    airline,
    flight_number: flightNumber
  }]
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe('fetchMatchingFlights', () => {
  it('returns flights sorted by price', async () => {
    mockedAxios.get.mockResolvedValueOnce({
      data: {
        search_metadata: { status: 'Success' },
        best_flights: [makeFlight('China Airlines', 'CI100', 12000)],
        other_flights: [makeFlight('EVA Air', 'BR198', 10000)]
      }
    });

    const results = await fetchMatchingFlights(
      'test-key', 'TPE', 'NRT', '2026-10-24', '2026-11-01', 'TWD',
      [{ codes: ['CI'], patterns: ['China Airlines'] }, { codes: ['BR'], patterns: ['EVA Air'] }]
    );

    expect(results.length).toBe(2);
    expect(results[0].price).toBe(10000);
    expect(results[1].price).toBe(12000);
  });

  it('filters out non-allowed airlines', async () => {
    mockedAxios.get.mockResolvedValueOnce({
      data: {
        search_metadata: { status: 'Success' },
        best_flights: [
          makeFlight('China Airlines', 'CI100', 12000),
          makeFlight('Peach Aviation', 'MM100', 8000)
        ],
        other_flights: []
      }
    });

    const results = await fetchMatchingFlights(
      'test-key', 'TPE', 'NRT', '2026-10-24', '2026-11-01', 'TWD',
      [{ codes: ['CI'], patterns: ['China Airlines'] }]
    );

    expect(results.length).toBe(1);
    expect(results[0].airline).toBe('China Airlines');
  });

  it('filters out separate ticket flights', async () => {
    mockedAxios.get.mockResolvedValueOnce({
      data: {
        search_metadata: { status: 'Success' },
        best_flights: [
          { ...makeFlight('China Airlines', 'CI100', 12000), type: 'Separate tickets' }
        ],
        other_flights: [makeFlight('EVA Air', 'BR198', 13000)]
      }
    });

    const results = await fetchMatchingFlights(
      'test-key', 'TPE', 'NRT', '2026-10-24', '2026-11-01', 'TWD',
      [{ codes: ['CI'], patterns: ['China Airlines'] }, { codes: ['BR'], patterns: ['EVA Air'] }]
    );

    expect(results.length).toBe(1);
    expect(results[0].airline).toBe('EVA Air');
  });

  it('returns empty array on API error', async () => {
    mockedAxios.get.mockRejectedValue(new Error('Network error'));

    const results = await fetchMatchingFlights(
      'test-key', 'TPE', 'NRT', '2026-10-24', '2026-11-01', 'TWD'
    );

    expect(results).toEqual([]);
  });

  it('includes Google Flights link in results', async () => {
    mockedAxios.get.mockResolvedValueOnce({
      data: {
        search_metadata: { status: 'Success' },
        best_flights: [makeFlight('China Airlines', 'CI100', 12000)],
        other_flights: []
      }
    });

    const results = await fetchMatchingFlights(
      'test-key', 'TPE', 'NRT', '2026-10-24', '2026-11-01', 'TWD',
      [{ codes: ['CI'], patterns: ['China Airlines'] }]
    );

    expect(results[0].link).toContain('google.com/travel/flights');
  });

  it('filters out separate ticket flights indicated in extensions', async () => {
    mockedAxios.get.mockResolvedValueOnce({
      data: {
        search_metadata: { status: 'Success' },
        best_flights: [
          { ...makeFlight('China Airlines', 'CI100', 11000), extensions: ['Separate tickets booked together'] }
        ]
      }
    });

    const results = await fetchMatchingFlights(
      'test-key', 'TPE', 'NRT', '2026-10-24', '2026-11-01'
    );

    expect(results).toEqual([]);
  });

  it('matches airlines by flight number prefix and falls back to Unknown outboundTime', async () => {
    mockedAxios.get.mockResolvedValueOnce({
      data: {
        search_metadata: { status: 'Success' },
        other_flights: [
          {
            price: 11500,
            flights: [{
              departure_airport: { id: 'TPE', name: 'Taipei', time: '' },
              arrival_airport: { id: 'NRT', name: 'Narita', time: '' },
              airline: 'Unknown Label',
              flight_number: 'JX800'
            }]
          }
        ]
      }
    });

    const results = await fetchMatchingFlights(
      'test-key', 'TPE', 'NRT', '2026-10-24', '2026-11-01', 'TWD',
      [{ codes: ['JX'], patterns: ['STARLUX'] }]
    );

    expect(results).toHaveLength(1);
    expect(results[0].outboundTime).toBe('Unknown');
  });

  it('retries on transient 5xx/network errors and succeeds on subsequent attempt', async () => {
    vi.useFakeTimers();
    vi.spyOn(console, 'warn').mockImplementation(() => {});

    mockedAxios.get
      .mockRejectedValueOnce({ code: 'ETIMEDOUT', message: 'timeout' })
      .mockRejectedValueOnce({ response: { status: 503 }, message: 'Service Unavailable' })
      .mockResolvedValueOnce({
        data: {
          search_metadata: { status: 'Success' },
          best_flights: [makeFlight('China Airlines', 'CI100', 11000)]
        }
      });

    const promise = fetchMatchingFlights(
      'test-key', 'TPE', 'NRT', '2026-10-24', '2026-11-01', 'TWD'
    );
    await vi.runAllTimersAsync();
    const results = await promise;
    vi.useRealTimers();

    expect(mockedAxios.get).toHaveBeenCalledTimes(3);
    expect(results).toHaveLength(1);
    expect(results[0].price).toBe(11000);
  });
});
