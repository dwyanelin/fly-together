import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import { sendLineMessage, sendFlexMessage } from '../../src/services/linemessaging.js';

vi.mock('axios');
const mockedAxios = vi.mocked(axios, true);

beforeEach(() => {
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

describe('linemessaging', () => {
  it('skips sending and warns when channelAccessToken is empty', async () => {
    await sendLineMessage('', 'Hello');
    await sendFlexMessage('', { type: 'flex' });

    expect(mockedAxios.post).not.toHaveBeenCalled();
    expect(console.warn).toHaveBeenCalledTimes(2);
  });

  it('broadcasts text message when userId is not provided', async () => {
    mockedAxios.post.mockResolvedValueOnce({ status: 200, data: {} });

    await sendLineMessage('token-123', '便宜機票來囉');

    expect(mockedAxios.post).toHaveBeenCalledWith(
      'https://api.line.me/v2/bot/message/broadcast',
      { messages: [{ type: 'text', text: '便宜機票來囉' }] },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer token-123'
        },
        timeout: 10000
      }
    );
  });

  it('pushes text message to a specific user when userId is provided', async () => {
    mockedAxios.post.mockResolvedValueOnce({ status: 200, data: {} });

    await sendLineMessage('token-123', '測試訊息', 'U12345');

    expect(mockedAxios.post).toHaveBeenCalledWith(
      'https://api.line.me/v2/bot/message/push',
      { to: 'U12345', messages: [{ type: 'text', text: '測試訊息' }] },
      expect.objectContaining({ timeout: 10000 })
    );
  });

  it('broadcasts flex message when userId is omitted or empty', async () => {
    mockedAxios.post.mockResolvedValueOnce({ status: 200, data: {} });
    const flex = { type: 'flex', altText: 'Flights', contents: {} };

    await sendFlexMessage('token-abc', flex, '');

    expect(mockedAxios.post).toHaveBeenCalledWith(
      'https://api.line.me/v2/bot/message/broadcast',
      { messages: [flex] },
      expect.any(Object)
    );
  });

  it('pushes flex message when userId is provided', async () => {
    mockedAxios.post.mockResolvedValueOnce({ status: 200, data: {} });
    const flex = { type: 'flex', altText: 'Flights', contents: {} };

    await sendFlexMessage('token-abc', flex, 'U99999');

    expect(mockedAxios.post).toHaveBeenCalledWith(
      'https://api.line.me/v2/bot/message/push',
      { to: 'U99999', messages: [flex] },
      expect.any(Object)
    );
  });

  it('throws detailed error with response data on LINE API failure', async () => {
    mockedAxios.post.mockRejectedValueOnce({
      response: { data: { message: 'Invalid token' } },
      message: 'Request failed with status code 401'
    });

    await expect(sendFlexMessage('bad-token', { type: 'flex' })).rejects.toThrow(
      'Failed to send LINE broadcast message: {"message":"Invalid token"}'
    );
  });

  it('throws error with error.message when no response data is present', async () => {
    mockedAxios.post.mockRejectedValueOnce(new Error('ETIMEDOUT'));

    await expect(sendLineMessage('token-123', 'hi', 'U123')).rejects.toThrow(
      'Failed to send LINE push message: ETIMEDOUT'
    );
  });
});
