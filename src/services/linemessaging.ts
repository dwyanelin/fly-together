import axios from 'axios';

const BROADCAST_URL = 'https://api.line.me/v2/bot/message/broadcast';
const PUSH_URL = 'https://api.line.me/v2/bot/message/push';

function makeHeaders(token: string) {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
}

// When userId is provided, push to that single user (ideal for testing to your
// own account); otherwise broadcast to all friends of the Official Account.
async function sendMessages(
  channelAccessToken: string,
  messages: object[],
  userId?: string
): Promise<void> {
  if (!channelAccessToken) {
    console.warn('LINE Channel Access Token not provided; skipping notification.');
    return;
  }

  const usePush = !!userId;
  const url = usePush ? PUSH_URL : BROADCAST_URL;
  const body = usePush ? { to: userId, messages } : { messages };

  try {
    await axios.post(url, body, { headers: makeHeaders(channelAccessToken), timeout: 10000 });
    console.log(`LINE ${usePush ? `push (to ${userId})` : 'broadcast'} message sent successfully.`);
  } catch (error: any) {
    const detail = error.response?.data ? JSON.stringify(error.response.data) : error.message;
    throw new Error(`Failed to send LINE ${usePush ? 'push' : 'broadcast'} message: ${detail}`);
  }
}

export async function sendLineMessage(
  channelAccessToken: string,
  text: string,
  userId?: string
): Promise<void> {
  await sendMessages(channelAccessToken, [{ type: 'text', text }], userId);
}

export async function sendFlexMessage(
  channelAccessToken: string,
  flexMessage: object,
  userId?: string
): Promise<void> {
  await sendMessages(channelAccessToken, [flexMessage], userId);
}
