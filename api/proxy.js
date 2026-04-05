// Minimal proxy - just needed to bypass CORS for HuggingFace calls
// The Gradio JS client handles everything else directly in the browser
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { url, method = 'GET', body, headers = {} } = req.body || {};
  if (!url || !url.startsWith('https://')) return res.status(400).json({ error: 'Invalid URL' });

  try {
    const opts = {
      method,
      headers: { 'Content-Type': 'application/json', ...headers },
    };
    if (body) opts.body = JSON.stringify(body);

    const upstream = await fetch(url, opts);
    const text = await upstream.text();
    try {
      return res.status(upstream.status).json(JSON.parse(text));
    } catch {
      return res.status(upstream.status).send(text);
    }
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
