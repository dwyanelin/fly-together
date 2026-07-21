export interface AirlineConfig {
  codes: string[]; // e.g. ['BR']
  patterns: string[]; // e.g. ['EVA Air', '長榮航空']
}

// A resolved route ready for searching — dates are per-route because
// users configure each route (with its own dates) via the LINE form.
export interface RouteConfig {
  name: string;         // display name derived from arrival IATA code
  departure_id: string; // TPE | TSA
  arrival_id: string;   // ex: NRT
  outboundDate: string; // YYYY-MM-DD
  returnDate: string;   // YYYY-MM-DD
  maxPrice: number;     // ex: 13000 (TWD)
  allowedAirlines?: AirlineConfig[];
}

// Raw route row as stored in the shared routes table (Apps Script / routes.json)
export interface RawRoute {
  outboundDate: string;
  returnDate: string;
  departure_id: string;
  arrival_id: string;
  maxPrice: number;
}

export interface RoutesPayload {
  routes: RawRoute[];
}

export interface SerpApiFlightResult {
  price: number;
  type?: string;
  extensions?: string[];
  flights: Array<{
    departure_airport: { id: string, name: string, time: string };
    arrival_airport: { id: string, name: string, time: string };
    airline: string;
    flight_number: string;
  }>;
}

export interface SerpApiResponse {
  search_metadata: { status: string };
  best_flights?: SerpApiFlightResult[];
  other_flights?: SerpApiFlightResult[];
}
