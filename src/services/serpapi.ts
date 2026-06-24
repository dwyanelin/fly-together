import axios, { AxiosRequestConfig } from 'axios';
import { SerpApiResponse, AirlineConfig } from '../types.js';
import { generateGoogleFlightsUrl } from '../utils/tfs-gen.js';

const MAX_RETRIES = 3;
const INITIAL_DELAY_MS = 1000;

async function fetchWithRetry<T>(url: string, config: AxiosRequestConfig, retries = MAX_RETRIES): Promise<T> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await axios.get<T>(url, { ...config, timeout: 15000 });
      return response.data;
    } catch (error: any) {
      const isLast = attempt === retries;
      const isRetryable = error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT' ||
        error.code === 'ECONNRESET' || (error.response?.status && error.response.status >= 500);

      if (isLast || !isRetryable) throw error;

      const delay = INITIAL_DELAY_MS * Math.pow(2, attempt - 1);
      console.warn(`SerpApi request failed (attempt ${attempt}/${retries}), retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw new Error('fetchWithRetry: unreachable');
}

export async function fetchMatchingFlights(
  apiKey: string,
  departureId: string,
  arrivalId: string,
  outboundDate: string,
  returnDate: string,
  currency: string = 'TWD',
  allowedAirlines?: AirlineConfig[]
): Promise<Array<{ price: number; link: string; airline: string; outboundTime: string; }>> {
  const url = 'https://serpapi.com/search.json';
  
  try {
    const params: any = {
      engine: 'google_flights',
      departure_id: departureId,
      arrival_id: arrivalId,
      outbound_date: outboundDate,
      return_date: returnDate,
      currency: currency,
      api_key: apiKey,
      stops: '1' // Only show direct flights as per request
    };

    // If allowed airlines are provided, we should send them directly to SerpApi
    // Because Google Flights calculates round-trip prices using the cheapest available return flight.
    // If we don't restrain it here, SerpApi will calculate the price using LCCs for the return leg.
    if (allowedAirlines && allowedAirlines.length > 0) {
      const allAirlineCodes = allowedAirlines.flatMap(a => a.codes);
      params.include_airlines = allAirlineCodes.join(',');
    }

    const data = await fetchWithRetry<SerpApiResponse>(url, { params });
    
    // Combine both 'best_flights' and 'other_flights' to ensure we don't miss traditional airlines
    // that might be categorized as "other" when LCCs are cheaper
    let flights = [...(data.best_flights || []), ...(data.other_flights || [])];
    
    // Filter out flights if allowedAirlines is provided
    if (allowedAirlines && allowedAirlines.length > 0) {
      flights = flights.filter(flight => 
        flight.flights.every(segment => 
          allowedAirlines.some(allowed => 
            allowed.patterns.some(pattern => segment.airline.toLowerCase().includes(pattern.toLowerCase())) ||
            allowed.codes.some(code => segment.airline.toLowerCase() === code.toLowerCase() || segment.flight_number?.startsWith(code))
          )
        )
      );
    }

    // Filter out "Separate tickets" (分段購票)
    flights = flights.filter(flight => {
      // Sometimes "type" explicitly says separate tickets
      if (flight.type?.toLowerCase().includes('separate')) return false;
      // In extensions, it might explicitly say separate tickets booked together
      if (flight.extensions?.some(ext => ext.toLowerCase().includes('separate ticket'))) return false;
      return true;
    });
    
    // Compute Google Flights URL with airline filters
    const allAirlineCodes = allowedAirlines ? allowedAirlines.flatMap(a => a.codes) : [];
    const googleFlightLink = generateGoogleFlightsUrl(
      departureId,
      arrivalId,
      outboundDate,
      returnDate,
      allAirlineCodes
    );

    const results: Array<{ price: number; link: string; airline: string; outboundTime: string; }> = [];
    if (flights.length > 0) {
      // Return all matched flights without grouping by airline
      // We will sort them by price
      flights.sort((a, b) => a.price - b.price);

      for (const flight of flights) {
        const airlineNames = Array.from(new Set(flight.flights.map(f => f.airline))).join(', ');
        
        // Extract basic outbound time (first leg of outbound)
        // Note: Google flights SerpApi structure for Round Trip initial search only gives outbound flights.
        // The return flight is selected by the user on the Google Flights website after clicking the link.
        const outboundTime = flight.flights[0]?.departure_airport.time || 'Unknown';

        results.push({
          price: flight.price,
          link: googleFlightLink,
          airline: airlineNames,
          outboundTime
        });
      }
    }

    return results;
  } catch (error) {
    console.error(`Error fetching flights for ${arrivalId}:`, error);
    return [];
  }
}

