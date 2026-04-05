module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { action, data } = req.body || {};
  const HF_BASE = 'https://jeffreyxiang-trellis.hf.space';

  try {

    // ── 1. Upload image ──────────────────────────────────
    if (action === 'upload') {
      const { imageBase64, mimeType } = data;
      const bytes = Buffer.from(imageBase64, 'base64');

      // Build multipart form manually (Node 18 FormData doesn't support File well)
      const boundary = '----FormBoundary' + Math.random().toString(36).slice(2);
      const filename = 'image.png';
      const header = Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="files"; filename="${filename}"\r\nContent-Type: ${mimeType}\r\n\r\n`
      );
      const footer = Buffer.from(`\r\n--${boundary}--\r\n`);
      const body = Buffer.concat([header, bytes, footer]);

      const uploadRes = await fetch(`${HF_BASE}/upload`, {
        method: 'POST',
        headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}` },
        body,
      });

      if (!uploadRes.ok) {
        const t = await uploadRes.text();
        return res.status(500).json({ error: `Upload failed: ${t.slice(0, 200)}` });
      }

      const json = await uploadRes.json();
      return res.status(200).json({ path: json[0] });

    // ── 2. Start prediction (returns immediately with session hash) ──
    } else if (action === 'predict') {
      const { imagePath } = data;
      const sessionHash = Math.random().toString(36).slice(2, 14);

      const body = {
        data: [{ path: imagePath }, "", 512, 12, 7.5, 12, 42, true],
        fn_index: 1,
        session_hash: sessionHash,
      };

      const r = await fetch(`${HF_BASE}/queue/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const json = await r.json();
      // Always return the session hash we generated
      return res.status(200).json({ ...json, session_hash: sessionHash });

    // ── 3. Single poll — browser calls this repeatedly ──
    } else if (action === 'poll') {
      const { sessionHash } = data;

      // Fetch SSE stream but only read for up to 5 seconds
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 5000);

      let result = { msg: 'waiting' };

      try {
        const pollRes = await fetch(`${HF_BASE}/queue/data?session_hash=${sessionHash}`, {
          headers: { Accept: 'text/event-stream' },
          signal: controller.signal,
        });

        const text = await pollRes.text();
        clearTimeout(timer);

        // Parse SSE lines — find the most recent complete event
        const dataLines = text.split('\n').filter(l => l.startsWith('data:'));
        for (const line of dataLines.reverse()) {
          try {
            const json = JSON.parse(line.slice(5));
            if (json.msg) { result = json; break; }
          } catch {}
        }
      } catch (e) {
        clearTimeout(timer);
        // Timeout or network error — just return waiting
        result = { msg: 'waiting' };
      }

      return res.status(200).json(result);

    // ── 4. Start GLB extraction (returns immediately) ──
    } else if (action === 'extract') {
      const sessionHash = Math.random().toString(36).slice(2, 14);

      const body = {
        data: ['glb'],
        fn_index: 2,
        session_hash: sessionHash,
      };

      const r = await fetch(`${HF_BASE}/queue/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const json = await r.json();
      return res.status(200).json({ ...json, session_hash: sessionHash });

    } else {
      return res.status(400).json({ error: 'Unknown action: ' + action });
    }

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
