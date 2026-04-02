import axios from 'axios';

export async function sendLineMessage(channelAccessToken: string, userId: string, text: string): Promise<void> {
  if (!channelAccessToken || !userId) {
    console.warn('LINE Channel Access Token or User ID not provided; skipping notification.');
    return;
  }

  try {
    await axios.post(
      'https://api.line.me/v2/bot/message/push',
      {
        to: userId,
        messages: [
          {
            type: 'text',
            text: text
          }
        ]
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${channelAccessToken}`
        }
      }
    );

    console.log('LINE message sent successfully.');
  } catch (error) {
    console.error('Failed to send LINE message:', error);
  }
}
