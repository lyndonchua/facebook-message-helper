export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return res.status(200).json({ translations: null, error: 'OPENAI_API_KEY missing' });
  try {
    const { messages = [], target = 'English' } = req.body || {};
    const clean = messages.map((m, i) => `${i + 1}. ${m.text}`).join('\n');
    const prompt = `Translate each numbered chat message into ${target}. Keep emojis. Keep names. Do not add explanations. Return JSON only as {"translations":["..."]}.\n\n${clean}`;
    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model: 'gpt-4o-mini', temperature: 0.2, messages: [{ role: 'user', content: prompt }] })
    });
    const data = await r.json();
    const content = data?.choices?.[0]?.message?.content || '';
    const parsed = JSON.parse(content.replace(/^```json\s*/,'').replace(/```$/,''));
    return res.status(200).json({ translations: parsed.translations || [] });
  } catch (e) {
    return res.status(200).json({ translations: null, error: String(e?.message || e) });
  }
}
