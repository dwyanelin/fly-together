import { describe, it, expect } from 'vitest';
import { buildFlexBubble, buildCarouselMessage } from '../../src/services/flex-builder.js';

const sampleInput = {
  targetName: '東京(成田)',
  outboundDate: '2026-10-24',
  returnDate: '2026-11-01',
  currency: 'TWD',
  flights: [
    { airline: 'China Airlines', outboundTime: '2026-10-24 08:30', price: 11000 },
    { airline: 'EVA Air', outboundTime: '2026-10-24 14:00', price: 12500 }
  ],
  bookingLink: 'https://www.google.com/travel/flights/search?tfs=abc'
};

describe('buildFlexBubble', () => {
  it('returns a bubble object with correct type', () => {
    const bubble = buildFlexBubble(sampleInput) as any;
    expect(bubble.type).toBe('bubble');
  });

  it('contains header with target name', () => {
    const bubble = buildFlexBubble(sampleInput) as any;
    const headerTexts = JSON.stringify(bubble.header);
    expect(headerTexts).toContain('東京(成田)');
  });

  it('contains formatted dates in header', () => {
    const bubble = buildFlexBubble(sampleInput) as any;
    const headerTexts = JSON.stringify(bubble.header);
    expect(headerTexts).toContain('10/24');
    expect(headerTexts).toContain('11/01');
  });

  it('contains flight rows in body', () => {
    const bubble = buildFlexBubble(sampleInput) as any;
    const bodyText = JSON.stringify(bubble.body);
    expect(bodyText).toContain('China Airlines');
    expect(bodyText).toContain('EVA Air');
    expect(bodyText).toContain('$11,000');
    expect(bodyText).toContain('$12,500');
  });

  it('contains booking button in footer', () => {
    const bubble = buildFlexBubble(sampleInput) as any;
    const footerText = JSON.stringify(bubble.footer);
    expect(footerText).toContain('查看航班');
    expect(footerText).toContain(sampleInput.bookingLink);
  });

  it('handles Unknown outbound time', () => {
    const input = {
      ...sampleInput,
      flights: [{ airline: 'Test', outboundTime: 'Unknown', price: 10000 }]
    };
    const bubble = buildFlexBubble(input) as any;
    const bodyText = JSON.stringify(bubble.body);
    expect(bodyText).toContain('未知');
  });
});

describe('buildCarouselMessage', () => {
  it('wraps single bubble without carousel', () => {
    const bubble = buildFlexBubble(sampleInput);
    const msg = buildCarouselMessage([bubble]) as any;
    expect(msg.type).toBe('flex');
    expect(msg.contents.type).toBe('bubble');
  });

  it('wraps multiple bubbles in a carousel', () => {
    const bubble1 = buildFlexBubble(sampleInput);
    const bubble2 = buildFlexBubble({ ...sampleInput, targetName: '福岡' });
    const msg = buildCarouselMessage([bubble1, bubble2]) as any;
    expect(msg.type).toBe('flex');
    expect(msg.contents.type).toBe('carousel');
    expect(msg.contents.contents.length).toBe(2);
  });

  it('includes altText', () => {
    const bubble = buildFlexBubble(sampleInput);
    const msg = buildCarouselMessage([bubble]) as any;
    expect(msg.altText).toContain('達標機票');
  });
});
