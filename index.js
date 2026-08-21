const { Client, LocalAuth } = require('whatsapp-web.js');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const express = require('express');
const QRCode = require('qrcode');

const app = express();
const port = process.env.PORT || 3000;
let latestQR = '';

// Server Web untuk menampilkan QR Code sebagai Gambar
app.get('/', async (req, res) => {
    if (!latestQR) {
        return res.send('<h2>Bot sudah terhubung atau QR Code sedang dibuat... Refresh halaman ini beberapa saat lagi.</h2>');
    }
    try {
        const qrImage = await QRCode.toDataURL(latestQR);
        res.send(`
            <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;">
                <h2>Scan QR Code Ini di WhatsApp</h2>
                <img src="${qrImage}" style="width:300px;height:300px;border:2px solid #000;padding:10px;border-radius:10px;"/>
                <p>Refresh halaman jika QR expired.</p>
            </div>
        `);
    } catch (err) {
        res.status(500).send('Error membuat QR Image');
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
    console.log('QR Code baru dibuat! Buka URL Web Service untuk scan.');
});

client.on('ready', () => {
    latestQR = '';
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
    
