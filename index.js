const { Client, LocalAuth } = require('whatsapp-web.js');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
});

client.on('qr', (qr) => { console.log('QR RECEIVED:', qr); });
client.on('ready', () => { console.log('Bot is ready!'); });

client.on('message', async (msg) => {
    if (msg.fromMe) return;
    const text = msg.body.toLowerCase();
    
    // Respon di grup atau pribadi
    if (text.startsWith('bot ') || !msg.from.includes('@g.us')) {
        const prompt = text.replace('bot ', '');
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        const result = await model.generateContent(prompt);
        await msg.reply(result.response.text());
    }
});

client.initialize();
