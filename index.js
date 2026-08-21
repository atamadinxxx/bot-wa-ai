const { Client, LocalAuth } = require('whatsapp-web.js');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const express = require('express');
const QRCode = require('qrcode');

const app = express();
const port = process.env.PORT || 8080;
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
        const text = (msg.body || '').trim();
        if (!text) return;

        // Cek apakah pesan berasal dari grup (ID pesan grup diakhiri '@g.us')
        const isGroup = msg.from.endsWith('@g.us');
        let prompt = '';

        if (!isGroup) {
            // Jika di Chat Pribadi -> Jawab langsung
            prompt = text;
        } else {
            // Jika di Grup -> Jawab hanya jika diawali kata "bot" atau ".ai"
            const lowerText = text.toLowerCase();
            if (lowerText.startsWith('bot ')) {
                prompt = text.slice(4).trim();
            } else if (lowerText.startsWith('.ai ')) {
                prompt = text.slice(4).trim();
            } else {
                return;
            }
        }

        if (!prompt) return;

        // Panggil Gemini AI
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        const result = await model.generateContent(prompt);
        
        // Balas pesan
        await msg.reply(result.response.text());

    } catch (error) {
        console.error('Error saat merespons:', error);
    }
});

client.initialize();
