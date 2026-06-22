export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { messages = [], targetLanguage = 'English' } = req.body || {};
    if (!Array.isArray(messages)) {
      res.status(400).json({ error: 'messages must be an array' });
      return;
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      res.status(503).json({ error: 'OPENAI_API_KEY is not configured in Vercel environment variables' });
      return;
    }

    const prompt = `Translate each chat message into ${targetLanguage}.\nKeep emojis. Keep names and places. Preserve tone naturally.\nReturn ONLY valid JSON in this exact shape: {"translations":["..."]}.\nDo not explain.\n\nMessages:\n${JSON.stringify(messages)}`;

    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0.2,
        messages: [
          { role: 'system', content: 'You are a careful chat translator. Translate naturally, not word by word.' },
          { role: 'user', content: prompt }
        ]
      })
    });

    if (!openaiResponse.ok) {
      const text = await openaiResponse.text();
      res.status(502).json({ error: 'OpenAI translation failed', detail: text.slice(0, 500) });
      return;
    }

    const data = await openaiResponse.json();
    const content = data?.choices?.[0]?.message?.content || '{}';
    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch {
      const match = content.match(/\{[\s\S]*\}/);
      parsed = match ? JSON.parse(match[0]) : null;
    }

    const translations = Array.isArray(parsed?.translations) ? parsed.translations : [];
    res.status(200).json({ translations });
  } catch (error) {
    res.status(500).json({ error: error.message || 'Translation error' });
  }
}
