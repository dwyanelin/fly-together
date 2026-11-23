interface FlightInfo {
  airline: string;
  outboundTime: string;
  price: number;
}

export interface BubbleInput {
  targetName: string;
  departureId?: string;
  arrivalId?: string;
  outboundDate: string;
  returnDate: string;
  maxPrice?: number;
  currency: string;
  flights: FlightInfo[];
  bookingLink: string;
  settingsUrl?: string;
}

const TIFFANY_PRIMARY = '#0ABAB5';
const TIFFANY_DEEP = '#08918D';
const TIFFANY_MIST = '#EDF9F8';
const TIFFANY_SOFT_TEXT = '#E6FAF9';
const INK_PRIMARY = '#111827';
const INK_SECONDARY = '#4B5563';
const INK_MUTED = '#9CA3AF';
const HAIRLINE = '#E5E7EB';

const MAX_DISPLAY_FLIGHTS = 5;

function calcTripDays(outboundDate: string, returnDate: string): number | null {
  const start = new Date(`${outboundDate}T00:00:00Z`).getTime();
  const end = new Date(`${returnDate}T00:00:00Z`).getTime();
  if (isNaN(start) || isNaN(end) || end <= start) return null;
  return Math.round((end - start) / (1000 * 60 * 60 * 24));
}

export function buildFlexBubble(input: BubbleInput): object {
  const {
    targetName,
    departureId,
    arrivalId,
    outboundDate,
    returnDate,
    maxPrice,
    currency,
    flights,
    bookingLink,
    settingsUrl
  } = input;

  // Format dates for display: "2026-10-24" → "10/24"
  const fmtDate = (d: string) => {
    const [, m, day] = d.split('-');
    return `${m}/${day}`;
  };

  const sortedFlights = [...flights].sort((a, b) => a.price - b.price);
  const displayFlights = sortedFlights.slice(0, MAX_DISPLAY_FLIGHTS);
  const bestFlight = sortedFlights[0];
  const tripDays = calcTripDays(outboundDate, returnDate);
  const savedAmount =
    maxPrice !== undefined && bestFlight && maxPrice > bestFlight.price
      ? maxPrice - bestFlight.price
      : 0;

  const badgeText = savedAmount > 0 ? `低於門檻 $${savedAmount.toLocaleString()}` : '達標通知';
  const dateLine = tripDays
    ? `${fmtDate(outboundDate)}（出發）→ ${fmtDate(returnDate)}（回程）· ${tripDays} 天`
    : `${fmtDate(outboundDate)}（出發）→ ${fmtDate(returnDate)}（回程）`;

  const routeCode = departureId && arrivalId ? `${departureId} → ${arrivalId}` : null;

  const flightRows = displayFlights.map((f, idx) => {
    const outTime = f.outboundTime === 'Unknown' ? '未知' : f.outboundTime.substring(11, 16); // "HH:mm"
    const isBest = idx === 0;

    return {
      type: 'box',
      layout: 'horizontal',
      alignItems: 'center',
      contents: [
        {
          type: 'text',
          text: f.airline,
          size: 'sm',
          color: isBest ? INK_PRIMARY : INK_SECONDARY,
          weight: isBest ? 'bold' : 'regular',
          flex: 4,
          wrap: false
        },
        {
          type: 'text',
          text: outTime,
          size: 'sm',
          color: INK_SECONDARY,
          flex: 2,
          align: 'center'
        },
        {
          type: 'text',
          text: `$${f.price.toLocaleString()}`,
          size: 'sm',
          color: isBest ? TIFFANY_DEEP : INK_PRIMARY,
          flex: 3,
          align: 'end',
          weight: 'bold'
        }
      ]
    };
  });

  const bodyContents: object[] = [];

  if (bestFlight) {
    const bestOutTime =
      bestFlight.outboundTime === 'Unknown' ? '未知' : bestFlight.outboundTime.substring(11, 16);

    bodyContents.push({
      type: 'box',
      layout: 'horizontal',
      backgroundColor: TIFFANY_MIST,
      cornerRadius: 'md',
      paddingAll: 'md',
      alignItems: 'center',
      contents: [
        {
          type: 'box',
          layout: 'vertical',
          flex: 5,
          contents: [
            {
              type: 'text',
              text: `最低來回含稅（${currency}）`,
              size: 'xxs',
              color: TIFFANY_DEEP,
              weight: 'bold'
            },
            {
              type: 'text',
              text: `$${bestFlight.price.toLocaleString()}`,
              size: 'xxl',
              color: TIFFANY_DEEP,
              weight: 'bold',
              margin: 'xs'
            }
          ]
        },
        {
          type: 'box',
          layout: 'vertical',
          flex: 5,
          alignItems: 'flex-end',
          contents: [
            {
              type: 'text',
              text: bestFlight.airline,
              size: 'xs',
              color: INK_PRIMARY,
              weight: 'bold',
              align: 'end'
            },
            {
              type: 'text',
              text: `去程 ${bestOutTime}`,
              size: 'xxs',
              color: INK_SECONDARY,
              align: 'end',
              margin: 'xs'
            },
            ...(maxPrice !== undefined
              ? [
                  {
                    type: 'text',
                    text: `門檻 < $${maxPrice.toLocaleString()}`,
                    size: 'xxs',
                    color: INK_MUTED,
                    align: 'end',
                    margin: 'xs'
                  }
                ]
              : [])
          ]
        }
      ]
    });
  }

  bodyContents.push(
    {
      type: 'box',
      layout: 'horizontal',
      margin: 'lg',
      contents: [
        { type: 'text', text: '航空公司', size: 'xxs', color: INK_MUTED, flex: 4 },
        { type: 'text', text: '出發', size: 'xxs', color: INK_MUTED, flex: 2, align: 'center' },
        { type: 'text', text: `價格(${currency})`, size: 'xxs', color: INK_MUTED, flex: 3, align: 'end' }
      ]
    },
    {
      type: 'separator',
      color: HAIRLINE,
      margin: 'sm'
    },
    ...flightRows
  );

  if (sortedFlights.length > MAX_DISPLAY_FLIGHTS) {
    bodyContents.push({
      type: 'text',
      text: `另有 ${sortedFlights.length - MAX_DISPLAY_FLIGHTS} 個達標班次，點擊下方查看完整列表`,
      size: 'xxs',
      color: INK_MUTED,
      align: 'center',
      margin: 'md'
    });
  }

  const footerContents: object[] = [
    {
      type: 'button',
      style: 'primary',
      height: 'sm',
      action: {
        type: 'uri',
        label: '查看航班 →',
        uri: bookingLink
      },
      color: TIFFANY_PRIMARY
    }
  ];

  if (settingsUrl) {
    footerContents.push({
      type: 'button',
      style: 'link',
      height: 'sm',
      action: {
        type: 'uri',
        label: '調整追蹤設定',
        uri: settingsUrl
      },
      color: TIFFANY_DEEP
    });
  }

  return {
    type: 'bubble',
    size: 'mega',
    header: {
      type: 'box',
      layout: 'vertical',
      backgroundColor: TIFFANY_PRIMARY,
      paddingAll: 'lg',
      contents: [
        {
          type: 'box',
          layout: 'horizontal',
          alignItems: 'center',
          contents: [
            {
              type: 'text',
              text: 'FLY TOGETHER',
              size: 'xxs',
              color: TIFFANY_SOFT_TEXT,
              weight: 'bold',
              flex: 1
            },
            {
              type: 'box',
              layout: 'vertical',
              backgroundColor: '#FFFFFF',
              cornerRadius: 'xl',
              paddingStart: 'md',
              paddingEnd: 'md',
              paddingTop: 'xs',
              paddingBottom: 'xs',
              flex: 0,
              contents: [
                {
                  type: 'text',
                  text: badgeText,
                  size: 'xxs',
                  color: TIFFANY_DEEP,
                  weight: 'bold'
                }
              ]
            }
          ]
        },
        {
          type: 'box',
          layout: 'baseline',
          margin: 'md',
          contents: [
            {
              type: 'text',
              text: targetName,
              weight: 'bold',
              size: 'xl',
              color: '#FFFFFF',
              flex: 1
            },
            ...(routeCode
              ? [
                  {
                    type: 'text',
                    text: routeCode,
                    size: 'sm',
                    color: TIFFANY_SOFT_TEXT,
                    weight: 'bold',
                    align: 'end',
                    flex: 0
                  }
                ]
              : [])
          ]
        },
        {
          type: 'text',
          text: dateLine,
          size: 'xs',
          color: TIFFANY_SOFT_TEXT,
          margin: 'sm'
        }
      ]
    },
    body: {
      type: 'box',
      layout: 'vertical',
      contents: bodyContents,
      spacing: 'sm',
      paddingAll: 'lg'
    },
    footer: {
      type: 'box',
      layout: 'vertical',
      contents: footerContents,
      spacing: 'xs',
      paddingAll: 'lg',
      paddingTop: 'none'
    }
  };
}

export function buildCarouselMessage(bubbles: object[], altText = '✈️ 發現達標機票！'): object {
  if (bubbles.length === 1) {
    // Single bubble — send directly without carousel wrapper
    return {
      type: 'flex',
      altText,
      contents: bubbles[0]
    };
  }

  return {
    type: 'flex',
    altText,
    contents: {
      type: 'carousel',
      contents: bubbles
    }
  };
}
