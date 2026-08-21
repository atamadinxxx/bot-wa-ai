const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const apiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey);

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium',
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu'
        ],
    }
});

client.on('qr', (qr) => {
    console.log('=== SCAN QR CODE DI BAWAH INI ===');
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
    console.log('Bot WhatsApp siap dan sudah terhubung!');
});

client.on('message', async (msg) => {
    try {
        const chat = await msg.getChat();

        if (chat.isGroup && msg.mentionedIds.includes(client.info.wid._serialized)) {
            const prompt = msg.body.replace(/@\d+/g, '').trim();

            if (!prompt) {
                return msg.reply('Halo! Ada yang bisa saya bantu?');
            }

            const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
            const result = await model.generateContent(prompt);
            await msg.reply(result.response.text());
        }
    } catch (error) {
        console.error('Error:', error);
    }
});

client.initialize();
