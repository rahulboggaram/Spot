const SUPABASE_URL =
  process.env.EXPO_PUBLIC_SUPABASE_URL ||
  'https://jvnrafvsycvlqfmepqjv.supabase.co';
const SUPABASE_ANON_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp2bnJhZnZzeWN2bHFmbWVwcWp2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg1NTk0OTgsImV4cCI6MjA4NDEzNTQ5OH0.39F_md2gcJw5yDxTXEdydwKLW-Yr-qfIbBmg9nXh_PM';

function getHeaders() {
  return {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json',
  };
}

function parseBody(req) {
  if (!req.body) return {};
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }
  return req.body;
}

module.exports = async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const mode = Array.isArray(req.query?.mode) ? req.query.mode[0] : req.query?.mode;
      if (mode === 'bootstrap') {
        const since = Array.isArray(req.query?.since) ? req.query.since[0] : req.query?.since;
        const rawLimit = Array.isArray(req.query?.limit) ? req.query.limit[0] : req.query?.limit;
        const parsedLimit = Number.parseInt(rawLimit || '1000', 10);
        const limit = Number.isFinite(parsedLimit) && parsedLimit > 0 ? Math.min(parsedLimit, 2000) : 1000;

        const latestUrl = `${SUPABASE_URL}/rest/v1/market_prices?select=*&order=updated_at.desc&limit=1`;
        let historyUrl = `${SUPABASE_URL}/rest/v1/market_prices?select=*&order=updated_at.desc&limit=${limit}`;
        if (since) {
          historyUrl = `${SUPABASE_URL}/rest/v1/market_prices?select=*&updated_at=gte.${encodeURIComponent(since)}&order=updated_at.desc&limit=${limit}`;
        }

        const [latestRes, historyRes] = await Promise.all([
          fetch(latestUrl, { headers: getHeaders() }),
          fetch(historyUrl, { headers: getHeaders() }),
        ]);

        const latestText = await latestRes.text();
        const historyText = await historyRes.text();
        if (!latestRes.ok || !historyRes.ok) {
          return res.status(502).json({
            error: 'Supabase bootstrap request failed',
            latestStatus: latestRes.status,
            historyStatus: historyRes.status,
            latestDetails: latestText,
            historyDetails: historyText,
          });
        }

        const latest = latestText ? JSON.parse(latestText) : [];
        const history = historyText ? JSON.parse(historyText) : [];
        return res.status(200).json({
          latest: Array.isArray(latest) ? latest[0] || null : null,
          history: Array.isArray(history) ? history : [],
        });
      }

      return res.status(400).json({ error: 'Unsupported mode' });
    }

    if (req.method === 'POST') {
      const body = parseBody(req);
      const gold = Number(body?.gold_999_base);
      const silver = Number(body?.silver_base);
      if (!Number.isFinite(gold) || !Number.isFinite(silver)) {
        return res.status(400).json({ error: 'gold_999_base and silver_base are required numbers' });
      }

      const insertUrl = `${SUPABASE_URL}/rest/v1/market_prices?select=*`;
      const insertRes = await fetch(insertUrl, {
        method: 'POST',
        headers: {
          ...getHeaders(),
          Prefer: 'return=representation',
        },
        body: JSON.stringify([
          {
            gold_999_base: gold,
            silver_base: silver,
            updated_at: new Date().toISOString(),
          },
        ]),
      });

      const insertText = await insertRes.text();
      if (!insertRes.ok) {
        return res.status(502).json({
          error: 'Supabase insert failed',
          status: insertRes.status,
          details: insertText,
        });
      }

      const inserted = insertText ? JSON.parse(insertText) : [];
      return res.status(200).json({ inserted: Array.isArray(inserted) ? inserted : [] });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    return res.status(500).json({
      error: 'Failed to handle admin prices request',
      details: error instanceof Error ? error.message : String(error),
    });
  }
};
