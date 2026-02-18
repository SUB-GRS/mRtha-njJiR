const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

/**
 * Scraper function untuk ChatGPT Free AI
 */
const MODEL_ID = '25871'; // gpt-5-nano
const PROXY_BASE = 'https://px.nekolabs.my.id/';

async function getNonce() {
  try {
    const { data: html } = await axios.post(
      PROXY_BASE + encodeURIComponent('https://chatgptfree.ai/'),
      {},
      { 
        headers: { 
          'user-agent': 'Mozilla/5.0 (Linux; Android 15; SM-F958) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.6723.86 Mobile Safari/537.36' 
        } 
      }
    );
    // Parsing nonce dari response content
    const m = html.data.content.match(/&quot;nonce&quot;\s*:\s*&quot;([^&]+)&quot;/);
    if (!m) throw new Error('Gagal mendapatkan security nonce.');
    return m[1];
  } catch (error) {
    throw new Error('Gagal bypass security: ' + error.message);
  }
}

async function chatGPT(prompt) {
  const nonce = await getNonce();
  const { data } = await axios.post(
    PROXY_BASE + encodeURIComponent('https://chatgptfree.ai/wp-admin/admin-ajax.php'),
    new URLSearchParams({
      action: 'aipkit_frontend_chat_message',
      _ajax_nonce: nonce,
      bot_id: MODEL_ID,
      session_id: uuidv4(),
      conversation_uuid: uuidv4(),
      post_id: '6',
      message: prompt,
    }).toString(),
    {
      headers: {
        origin: 'https://chatgptfree.ai',
        referer: 'https://chatgptfree.ai/',
        'user-agent': 'Mozilla/5.0 (Linux; Android 15; SM-F958) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.6723.86 Mobile Safari/537.36',
      },
    }
  );
  
  if (!data.success) throw new Error(data.data || 'AI Gagal merespons');
  return data.data.content.data.reply;
}

module.exports = function (app) {
  /**
   * @endpoint /ai/chatgpt
   * Deskripsi: Chat dengan AI (GPT-5 Nano)
   */
  app.get('/ai/chatgpt', async (req, res) => {
    const prompt = req.query.prompt?.trim();

    if (!prompt) {
      return res.status(400).json({
        status: false,
        message: "Parameter 'prompt' wajib diisi."
      });
    }

    try {
      const reply = await chatGPT(prompt);
      res.status(200).json({
        status: true,
        creator: "Dinzo APIs",
        data: {
          model: "gpt-5-nano",
          reply: reply
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({
        status: false,
        message: error.message
      });
    }
  });
};
