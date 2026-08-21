const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Inisialisasi Gemini AI
const apiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey);

// Inisialisasi WhatsApp Client
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--single-process',
            '--disable-gpu'
        ],
    }
});

// Tampilkan QR Code di log server
client.on('qr', (qr) => {
    console.log('=== SCAN QR CODE DI BAWAH INI ===');
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
    console.log('Bot WhatsApp siap dan sudah terhubung!');
});

// Logika merespons pesan grup
client.on('message', async (msg) => {
    try {
        const chat = await msg.getChat();

        // Cek jika pesan berasal dari grup DAN bot di-mention/tag
        if (chat.isGroup && msg.mentionedIds.includes(client.info.wid._serialized)) {
            
            // Ambil teks pertanyaan (menghapus tag agar bersih)
            const prompt = msg.body.replace(/@\d+/g, '').trim();

            if (!prompt) {
                return msg.reply('Halo! Ada yang bisa saya bantu? Silakan tanyakan sesuatu.');
            }

            // Panggil Gemini AI
            const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
            const result = await model.generateContent(prompt);
            const responseText = result.response.text();

            // Balas pesan ke grup
            await msg.reply(responseText);
        }
    } catch (error) {
        console.error('Error:', error);
    }
});

client.initialize();
