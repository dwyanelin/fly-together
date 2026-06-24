import * as dotenv from 'dotenv';
dotenv.config();

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { TargetConfig, AirlineConfig, RoutesConfig } from './types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Airline presets — complex structures stay in code, referenced by name in JSON
const airlinePresets: Record<string, AirlineConfig[]> = {
  traditional: [
    { codes: ['CI'], patterns: ['China Airlines', '中華航空'] },
    { codes: ['BR'], patterns: ['EVA Air', '長榮航空'] },
    { codes: ['JX'], patterns: ['STARLUX Airlines', '星宇航空'] },
    { codes: ['JL'], patterns: ['Japan Airlines', '日本航空', 'JAL'] },
    { codes: ['NH'], patterns: ['All Nippon Airways', '全日空', 'ANA'] }
  ]
};

// Read external config
const routesPath = resolve(__dirname, '..', 'config', 'routes.json');
const routesJson: RoutesConfig = JSON.parse(readFileSync(routesPath, 'utf-8'));

// Resolve preset names to actual airline configs
const targets: TargetConfig[] = routesJson.targets.map(t => ({
  name: t.name,
  departure_id: t.departure_id,
  arrival_id: t.arrival_id,
  maxPrice: t.maxPrice,
  allowedAirlines: airlinePresets[t.airlinePreset]
}));

export const config = {
  serpApiKey: process.env.SERPAPI_KEY || '',
  lineChannelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || '',
  // Set to push only to your own account (testing); leave empty to broadcast to all friends.
  lineUserId: process.env.LINE_USER_ID || '',
  outboundDate: routesJson.outboundDate,
  returnDate: routesJson.returnDate,
  currency: routesJson.currency,
  targets
};
