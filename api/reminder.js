const { Client } = require('@line/bot-sdk');
const { kv } = require("@vercel/kv");

const client = new Client({
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
});

module.exports = async (req, res) => {
  const keys = await kv.keys('todo:*');
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  for (const key of keys) {
    const userId = key.split(':')[1];
    const todos = await kv.lrange(key, 0, -1);
    const tomorrowTasks = todos
      .map(t => JSON.parse(t))
      .filter(t => t.日期 === tomorrowStr);

    if (tomorrowTasks.length > 0) {
      const msg = tomorrowTasks.map(t => `📌 ${t.事項} (${t.地點 || '無地點'})`).join('\n');
      await client.pushMessage(userId, { type: 'text', text: `早安！明天（${tomorrowStr}）的待辦事項有：\n${msg}` });
    }
  }
  res.status(200).send('Done');
};
