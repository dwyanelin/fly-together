import { config } from './config.js';
import { getRelativeDate } from './utils/date.js';
import { fetchMatchingFlights } from './services/serpapi.js';
import { sendLineMessage } from './services/linemessaging.js';

async function main() {
  console.log('--- Starting Flight Tracker ---');
  
  if (!config.serpApiKey) {
    console.error('Error: SERPAPI_KEY is not defined in environment variables.');
    process.exit(1);
  }

  const outboundDate = getRelativeDate(config.daysToOutbound);
  const returnDate = getRelativeDate(config.daysToReturn);

  console.log(`Checking flights for: Outbound: ${outboundDate} | Return: ${returnDate}`);

  let notifications: string[] = [];

  for (const target of config.targets) {
    console.log(`\nFetching prices for ${target.name} (${target.departure_id} -> ${target.arrival_id})...`);
    if (target.allowedAirlines && target.allowedAirlines.length > 0) {
      console.log(`Allowed airlines: ${target.allowedAirlines.map(a => a.codes.join('/')).join(', ')}`);
    }
    
    const results = await fetchMatchingFlights(
      config.serpApiKey,
      target.departure_id,
      target.arrival_id,
      outboundDate,
      returnDate,
      config.currency,
      target.allowedAirlines
    );

    if (results.length > 0) {
      console.log(`Target threshold: ${config.currency} ${target.maxPrice}`);
      
      const affordableFlights = results.filter(f => f.price <= target.maxPrice);

      if (affordableFlights.length > 0) {
        console.log(`Found ${affordableFlights.length} affordable flight option(s) for ${target.name}.`);
        
        // Show all results that matched filter without grouping
        const flightDetails = affordableFlights.map(f => {
          // Format date to remove Year/Month to keep lines shorter, e.g. "2026-05-02 08:30" => "05-02 08:30"
          const outTime = f.outboundTime === 'Unknown' ? '未知' : f.outboundTime.substring(5);
          
          return `- ${f.airline} (出發 ${outTime}): ${config.currency} ${f.price}`;
        }).join('\n');

        notifications.push(
          `✈️ 發現前往 ${target.name} 的達標機票！\n` +
          `📅 日期：${outboundDate} 到 ${returnDate}\n\n` +
          `💡 符合條件的選擇：\n${flightDetails}\n\n` +
          `🔗 立即搶票：${affordableFlights[0].link}`
        );
      } else {
        console.log(`No flights under ${target.maxPrice} found for ${target.name}. Cheapest was ${config.currency} ${results[0].price}.`);
      }
    } else {
      console.log(`No flight results found for ${target.name}.`);
    }
  }

  // Send combined notifications if any targets match
  if (notifications.length > 0) {
    console.log('\nSending LINE Notifications...');
    const message = '\n\n' + notifications.join('\n\n---\n\n');
    await sendLineMessage(config.lineChannelAccessToken, config.lineUserId, message);
  } else {
    console.log('\nNo matching flights found. Notification skipped.');
  }

  console.log('\n--- Finished Flight Tracker ---');
}

// Execute logic
main().catch(err => {
  console.error('Unhandled error in main execution:', err);
});
