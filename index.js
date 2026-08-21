const { Client, LocalAuth } = require('whatsapp-web.js');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const express = require('express');
const QRCode = require('qrcode');

const app = express();
const port = process.env.PORT || 3000;
let latestQR = '';

// Server Web untuk QR Code
app.get('/', async (req, res) => {
    if (!latestQR) {
        return res.send('<h2>Bot sudah terhubung atau QR Code sedang dibuat...</h2>');
    }
    try {
        const qrImage = await QRCode.toDataURL(latestQR);
        res.send(`
            <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;">
                <h2>Scan QR Code Ini di WhatsApp</h2>
                <img src="${qrImage}" style="width:300px;height:300px;border:2px solid #000;padding:10px;border-radius:10px;"/>
            </div>
        `);
    } catch (err) {
        res.status(500).send('Error');
    }
});

app.listen(port, () => console.log(`Server web jalan di port ${port}`));

// Inisialisasi Gemini AI
const apiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey);

// Inisialisasi WhatsApp Client
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
    latestQR = qr;
});

client.on('ready', () => {
    latestQR = '';
    console.log('Bot WhatsApp siap dan sudah terhubung!');
});

client.on('message', async (msg) => {
    try {
        const chat = await msg.getChat();
        const text = msg.body.trim();
        let prompt = '';

        // 1. Jika di Chat Pribadi -> Langsung jawab semua pesan
        if (!chat.isGroup) {
            prompt = text;
        } 
        // 2. Jika di Grup -> Jawab kalau diawali kata "bot", ".ai", atau di-mention
        else if (chat.isGroup) {
            const lowerText = text.toLowerCase();
            if (lowerText.startsWith('bot ')) {
                prompt = text.slice(4).trim();
            } else if (lowerText.startsWith('.ai ')) {
                prompt = text.slice(4).trim();
            } else if (msg.mentionedIds && msg.mentionedIds.length > 0) {
                // Alternatif jika tetap ada yang tag/mention
                prompt = text.replace(/@\d+/g, '').trim();
            } else {
                return; // Abaikan pesan grup biasa
            }
        }

        if (!prompt) return;

        // Panggil AI
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        const result = await model.generateContent(prompt);
        await msg.reply(result.response.text());

    } catch (error) {
        console.error('Error:', error);
    }
});

client.initialize();
