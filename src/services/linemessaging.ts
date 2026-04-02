import axios from 'axios';

export async function sendLineMessage(channelAccessToken: string, text: string): Promise<void> {
  if (!channelAccessToken) {
    console.warn('LINE Channel Access Token not provided; skipping notification.');
    return;
  }

  try {
    // Using the Broadcast API to send to everyone who has added the bot as a friend
    await axios.post(
      'https://api.line.me/v2/bot/message/broadcast',
      {
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

    console.log('LINE broadcast message sent successfully to all friends.');
  } catch (error) {
    console.error('Failed to send LINE broadcast message:', error);
  }
}
