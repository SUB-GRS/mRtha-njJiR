const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

module.exports = (app) => {
    const MODEL_ID = '25871'; // gpt-5-nano
    const TARGET_DOMAIN = 'https://chatgptfree.ai';
    const USER_AGENT = 'Mozilla/5.0 (Linux; Android 15; SM-F958) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.6723.86 Mobile Safari/537.36';

    // Menggunakan Proxy Base milik Anda sendiri
    // Sesuaikan domain dengan domain Vercel/API Anda
    const MY_PROXY = 'https://api-dinzo.vercel.app/tools/proxy?url=';

    async function getNonce() {
        try {
            // Memanggil target melalui proxy internal Anda
            const targetUrl = encodeURIComponent(`${TARGET_DOMAIN}/`);
            const { data: htmlContent } = await axios.get(MY_PROXY + targetUrl, {
                headers: { 'user-agent': USER_AGENT }
            });
            
            // Ekstraksi nonce dari HTML
            const match = htmlContent.match(/"nonce"\s*:\s*"([^"]+)"/) || 
                          htmlContent.match(/&quot;nonce&quot;\s*:\s*&quot;([^&]+)&quot;/);
            
            if (!match) throw new Error('Gagal mengekstrak nonce. Target mungkin memperbarui proteksi.');
            return match[1];
        } catch (err) {
            throw new Error('Gagal mendapatkan Nonce: ' + err.message);
        }
    }

    app.all('/api/ai/chatgpt', async (req, res) => {
        const prompt = (req.method === 'GET' ? req.query.prompt : req.body.prompt)?.trim();

        if (!prompt) {
            return res.status(400).json({ status: false, message: "Parameter 'prompt' diperlukan." });
        }

        try {
            const nonce = await getNonce();
            
            const params = new URLSearchParams({
                action: 'aipkit_frontend_chat_message',
                _ajax_nonce: nonce,
                bot_id: MODEL_ID,
                session_id: uuidv4(),
                conversation_uuid: uuidv4(),
                post_id: '6',
                message: prompt,
            });

            // Kirim request ke admin-ajax.php melalui proxy Anda
            const ajaxUrl = encodeURIComponent(`${TARGET_DOMAIN}/wp-admin/admin-ajax.php`);
            
            const { data: result } = await axios.post(MY_PROXY + ajaxUrl, params.toString(), {
                headers: {
                    'origin': TARGET_DOMAIN,
                    'referer': TARGET_DOMAIN + '/',
                    'user-agent': USER_AGENT,
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                timeout: 30000
            });

            const reply = result?.data?.content?.data?.reply;
            if (!reply) throw new Error("Respon AI kosong.");

            res.json({
                status: true,
                result: {
                    reply: reply,
                    model: 'gpt-5-nano',
                    timestamp: new Date().toISOString()
                }
            });

        } catch (error) {
            console.error('ChatGPT Error:', error.message);
            res.status(500).json({ status: false, message: error.message });
        }
    });
};
