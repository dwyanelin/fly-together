import * as dotenv from 'dotenv';
dotenv.config();

import { TargetConfig } from './types.js';

const allowedTraditionalAirlines = [
  { codes: ['CI'], patterns: ['China Airlines', '中華航空'] },
  { codes: ['BR'], patterns: ['EVA Air', '長榮航空'] },
  { codes: ['JX'], patterns: ['STARLUX Airlines', '星宇航空'] },
  { codes: ['JL'], patterns: ['Japan Airlines', '日本航空', 'JAL'] },
  { codes: ['NH'], patterns: ['All Nippon Airways', '全日空', 'ANA'] }
];

export const config = {
  // SerpApi API key (from environment variables)
  serpApiKey: process.env.SERPAPI_KEY || '',
  // LINE Messaging API settings (from environment variables)
  lineChannelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || '',
  lineUserId: process.env.LINE_USER_ID || '',
  
  // Date settings (Targeting +30 days outbound, +38 days return)
  daysToOutbound: 30,
  daysToReturn: 38,
  currency: 'TWD',
  
  // Destinations and their thresholds
  targets: [
    {
      name: '東京(成田)',
      departure_id: 'TPE',
      arrival_id: 'NRT',
      maxPrice: 13000,
      allowedAirlines: allowedTraditionalAirlines
    },
    {
      name: '東京(羽田)',
      departure_id: 'TSA', // Taipei Songshan is for HND flights
      arrival_id: 'HND',
      maxPrice: 13000,
      allowedAirlines: allowedTraditionalAirlines
    },
    {
      name: '峇里島',
      departure_id: 'TPE',
      arrival_id: 'DPS',
      maxPrice: 25000,
      allowedAirlines: allowedTraditionalAirlines
    }
  ] as TargetConfig[]
};
