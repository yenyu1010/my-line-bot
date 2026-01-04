const { Client } = require('@line/bot-sdk');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { kv } = require("@vercel/kv");

const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
};
const client = new Client(config);
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(200).send('OK');
  const events = req.body.events;
  
  await Promise.all(events.map(async (event) => {
    if (event.type !== 'message') return null;

    let userInput = "";
    
    // 如果是文字訊息
    if (event.message.type === 'text') {
      userInput = event.message.text;
    } 
    // 如果是圖片訊息，這裡簡化邏輯：請使用者補文字或讓 Gemini 讀圖（進階功能先放著）
    else {
      return client.replyMessage(event.replyToken, { type: 'text', text: '收到圖片！但我現在主要處理文字行程喔。' });
    }

    // 叫 Gemini 提取資訊
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const prompt = `從這段文字提取「事項、日期(YYYY-MM-DD)、地點」，僅回傳 JSON 格式：${userInput}`;
    const result = await model.generateContent(prompt);
    const responseText = await result.response.text();
    
    try {
      const data = JSON.parse(responseText.replace(/```json|```/g, ''));
      // 存入 Vercel KV 資料庫
      await kv.lpush(`todo:${event.source.userId}`, JSON.stringify(data));
      return client.replyMessage(event.replyToken, { type: 'text', text: `✅ 已記錄：${data.事項}\n時間：${data.日期}` });
    } catch (e) {
      return client.replyMessage(event.replyToken, { type: 'text', text: '我記下來了，但格式有點亂，我會再努力學習！' });
    }
  }));
  res.status(200).send('OK');
};
