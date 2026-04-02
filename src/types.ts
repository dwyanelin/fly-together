export interface AirlineConfig {
  codes: string[]; // e.g. ['BR']
  patterns: string[]; // e.g. ['EVA Air', '長榮航空']
}

export interface TargetConfig {
  name: string;
  departure_id: string; // ex: TPE
  arrival_id: string;   // ex: TYO
  maxPrice: number;     // ex: 13000
  allowedAirlines?: AirlineConfig[]; // Allowed airlines to filter
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
