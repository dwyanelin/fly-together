import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { loadConfig } from './config.js';
import { fetchMatchingFlights } from './services/serpapi.js';
import { sendFlexMessage } from './services/linemessaging.js';
import { buildFlexBubble, buildCarouselMessage } from './services/flex-builder.js';

export async function main() {
  console.log('--- Starting Flight Tracker ---');

  const config = await loadConfig();

  if (!config.serpApiKey) {
    console.error('Error: SERPAPI_KEY is not defined in environment variables.');
    process.exit(1);
  }

  if (config.routes.length === 0) {
    console.log('No routes configured. Set routes via the LINE form first. Nothing to do.');
    return;
  }

  const settingsUrl = process.env.FORM_URL || 'https://dwyanelin.github.io/fly-together/';
  const bubbles: object[] = [];
  const altSummaries: string[] = [];
  let routesSearched = 0;
  let totalMatches = 0;

  for (const route of config.routes) {
    routesSearched++;
    console.log(`\nFetching prices for ${route.name} (${route.departure_id} -> ${route.arrival_id})...`);
    console.log(`Dates: ${route.outboundDate} -> ${route.returnDate}`);
    if (route.allowedAirlines && route.allowedAirlines.length > 0) {
      console.log(`Allowed airlines: ${route.allowedAirlines.map(a => a.codes.join('/')).join(', ')}`);
    }

    const results = await fetchMatchingFlights(
      config.serpApiKey,
      route.departure_id,
      route.arrival_id,
      route.outboundDate,
      route.returnDate,
      config.currency,
      route.allowedAirlines
    );

    if (results.length > 0) {
      console.log(`Target threshold: ${config.currency} ${route.maxPrice}`);

      const affordableFlights = results.filter(f => f.price <= route.maxPrice);

      if (affordableFlights.length > 0) {
        totalMatches += affordableFlights.length;
        console.log(`Found ${affordableFlights.length} affordable flight option(s) for ${route.name}.`);

        const lowestPrice = Math.min(...affordableFlights.map(f => f.price));
        altSummaries.push(`${route.name} $${lowestPrice.toLocaleString()} 起`);

        const bubble = buildFlexBubble({
          targetName: route.name,
          departureId: route.departure_id,
          arrivalId: route.arrival_id,
          outboundDate: route.outboundDate,
          returnDate: route.returnDate,
          maxPrice: route.maxPrice,
          currency: config.currency,
          flights: affordableFlights.map(f => ({
            airline: f.airline,
            outboundTime: f.outboundTime,
            price: f.price
          })),
          bookingLink: affordableFlights[0].link,
          settingsUrl
        });
        bubbles.push(bubble);
      } else {
        console.log(`No flights under ${route.maxPrice} found for ${route.name}. Cheapest was ${config.currency} ${results[0].price}.`);
      }
    } else {
      console.log(`No flight results found for ${route.name}.`);
    }
  }

  // Send Flex Message if any routes match
  if (bubbles.length > 0) {
    console.log('\nSending LINE Flex Message...');
    const altText = `✈️ 發現達標機票！${altSummaries.join(' / ')}`;
    const flexMessage = buildCarouselMessage(bubbles, altText);
    try {
      await sendFlexMessage(config.lineChannelAccessToken, flexMessage, config.lineUserId);
    } catch (error) {
      console.error('LINE notification failed:', error);
    }
  } else {
    console.log('\nNo matching flights found. Notification skipped.');
  }

  // Summary
  console.log(`\n📊 Summary: searched ${routesSearched} routes, found ${totalMatches} affordable flights, sent ${bubbles.length > 0 ? 1 : 0} notification(s).`);
  console.log('--- Finished Flight Tracker ---');
}

// Execute logic when run directly as CLI entrypoint
const isDirectRun = Boolean(process.argv[1]) && fileURLToPath(import.meta.url) === resolve(process.argv[1]);
/* v8 ignore next 6 */
if (isDirectRun) {
  main().catch(err => {
    console.error('Unhandled error in main execution:', err);
    process.exit(1);
  });
}
