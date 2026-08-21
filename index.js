const { Client, LocalAuth } = require('whatsapp-web.js');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: { args: ['--no-sandbox'] }
});

client.on('qr', (qr) => { console.log('QR:', qr); });
client.on('ready', () => { console.log('Bot ready!'); });

client.on('message', async (msg) => {
    if (msg.fromMe) return;
    const model = new GoogleGenerativeAI(process.env.GEMINI_API_KEY).getGenerativeModel({ model: 'gemini-1.5-flash' });
    const result = await model.generateContent(msg.body);
    await msg.reply(result.response.text());
});

client.initialize();
