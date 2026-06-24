interface FlightInfo {
  airline: string;
  outboundTime: string;
  price: number;
}

interface BubbleInput {
  targetName: string;
  outboundDate: string;
  returnDate: string;
  currency: string;
  flights: FlightInfo[];
  bookingLink: string;
}

export function buildFlexBubble(input: BubbleInput): object {
  const { targetName, outboundDate, returnDate, currency, flights, bookingLink } = input;

  // Format dates for display: "2026-10-24" → "10/24"
  const fmtDate = (d: string) => {
    const [, m, day] = d.split('-');
    return `${m}/${day}`;
  };

  const flightRows = flights.map(f => {
    const outTime = f.outboundTime === 'Unknown' ? '未知' : f.outboundTime.substring(11, 16); // "HH:mm"

    return {
      type: 'box',
      layout: 'horizontal',
      contents: [
        {
          type: 'text',
          text: f.airline,
          size: 'sm',
          color: '#555555',
          flex: 4
        },
        {
          type: 'text',
          text: outTime,
          size: 'sm',
          color: '#555555',
          flex: 2,
          align: 'center'
        },
        {
          type: 'text',
          text: `$${f.price.toLocaleString()}`,
          size: 'sm',
          color: '#111111',
          flex: 3,
          align: 'end',
          weight: 'bold'
        }
      ]
    };
  });

  return {
    type: 'bubble',
    size: 'mega',
    header: {
      type: 'box',
      layout: 'vertical',
      contents: [
        {
          type: 'box',
          layout: 'horizontal',
          contents: [
            {
              type: 'text',
              text: '✈️',
              size: 'xl',
              flex: 0
            },
            {
              type: 'text',
              text: targetName,
              weight: 'bold',
              size: 'xl',
              color: '#1DB446',
              margin: 'sm',
              flex: 0
            }
          ]
        },
        {
          type: 'text',
          text: `${fmtDate(outboundDate)}（出發）→ ${fmtDate(returnDate)}（回程）`,
          size: 'xs',
          color: '#aaaaaa',
          margin: 'md'
        }
      ],
      backgroundColor: '#F7F7F7',
      paddingAll: 'lg'
    },
    body: {
      type: 'box',
      layout: 'vertical',
      contents: [
        // Column headers
        {
          type: 'box',
          layout: 'horizontal',
          contents: [
            { type: 'text', text: '航空公司', size: 'xs', color: '#aaaaaa', flex: 4 },
            { type: 'text', text: '出發', size: 'xs', color: '#aaaaaa', flex: 2, align: 'center' },
            { type: 'text', text: `價格(${currency})`, size: 'xs', color: '#aaaaaa', flex: 3, align: 'end' }
          ],
          margin: 'none'
        },
        {
          type: 'separator',
          margin: 'sm'
        },
        // Flight rows
        ...flightRows
      ],
      spacing: 'sm',
      paddingAll: 'lg'
    },
    footer: {
      type: 'box',
      layout: 'vertical',
      contents: [
        {
          type: 'button',
          style: 'primary',
          height: 'sm',
          action: {
            type: 'uri',
            label: '查看航班 →',
            uri: bookingLink
          },
          color: '#1DB446'
        }
      ],
      spacing: 'sm',
      paddingAll: 'lg'
    }
  };
}

export function buildCarouselMessage(bubbles: object[]): object {
  if (bubbles.length === 1) {
    // Single bubble — send directly without carousel wrapper
    return {
      type: 'flex',
      altText: '✈️ 發現達標機票！',
      contents: bubbles[0]
    };
  }

  return {
    type: 'flex',
    altText: '✈️ 發現達標機票！',
    contents: {
      type: 'carousel',
      contents: bubbles
    }
  };
}
