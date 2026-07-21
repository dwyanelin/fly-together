import * as dotenv from 'dotenv';
dotenv.config();

import axios from 'axios';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { AirlineConfig, RawRoute, RouteConfig, RoutesPayload } from './types.js';
import { airportName } from './utils/airports.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Hard cap on searched routes: 2 routes × 4 cron runs/day × 31 days = 248
// SerpApi calls/month, within the free tier of 250.
const MAX_ROUTES = 2;

// All routes share these defaults; users only configure dates/airports/price.
const CURRENCY = 'TWD';
const traditionalAirlines: AirlineConfig[] = [
  { codes: ['CI'], patterns: ['China Airlines', '中華航空'] },
  { codes: ['BR'], patterns: ['EVA Air', '長榮航空'] },
  { codes: ['JX'], patterns: ['STARLUX Airlines', '星宇航空'] },
  { codes: ['JL'], patterns: ['Japan Airlines', '日本航空', 'JAL'] },
  { codes: ['NH'], patterns: ['All Nippon Airways', '全日空', 'ANA'] }
];

async function fetchRawRoutes(routesApiUrl: string): Promise<RawRoute[]> {
  const url = `${routesApiUrl}${routesApiUrl.includes('?') ? '&' : '?'}action=list`;
  const response = await axios.get<RoutesPayload>(url, { timeout: 15000 });
  if (!response.data || !Array.isArray(response.data.routes)) {
    throw new Error(`Routes API returned unexpected payload: ${JSON.stringify(response.data)}`);
  }
  return response.data.routes;
}

function readLocalRoutes(): RawRoute[] {
  const routesPath = resolve(__dirname, '..', 'config', 'routes.json');
  const payload: RoutesPayload = JSON.parse(readFileSync(routesPath, 'utf-8'));
  return payload.routes;
}

function toRouteConfig(raw: RawRoute): RouteConfig {
  return {
    name: airportName(raw.arrival_id),
    departure_id: raw.departure_id,
    arrival_id: raw.arrival_id,
    outboundDate: raw.outboundDate,
    returnDate: raw.returnDate,
    maxPrice: raw.maxPrice,
    allowedAirlines: traditionalAirlines
  };
}

export interface AppConfig {
  serpApiKey: string;
  lineChannelAccessToken: string;
  lineUserId: string;
  currency: string;
  routes: RouteConfig[];
}

export async function loadConfig(): Promise<AppConfig> {
  const routesApiUrl = process.env.ROUTES_API_URL || '';

  // With ROUTES_API_URL set (CI), a fetch failure must fail loudly rather
  // than silently searching a stale local fallback.
  const rawRoutes = routesApiUrl ? await fetchRawRoutes(routesApiUrl) : readLocalRoutes();
  if (!routesApiUrl) {
    console.log('ROUTES_API_URL not set; using local config/routes.json fallback.');
  }

  return {
    serpApiKey: process.env.SERPAPI_KEY || '',
    lineChannelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || '',
    // Set to push only to your own account (testing); leave empty to broadcast to all friends.
    lineUserId: process.env.LINE_USER_ID || '',
    currency: CURRENCY,
    routes: rawRoutes.slice(0, MAX_ROUTES).map(toRouteConfig)
  };
}
