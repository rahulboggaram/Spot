const SUPABASE_URL =
  process.env.EXPO_PUBLIC_SUPABASE_URL ||
  'https://jvnrafvsycvlqfmepqjv.supabase.co';
const SUPABASE_ANON_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp2bnJhZnZzeWN2bHFmbWVwcWp2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg1NTk0OTgsImV4cCI6MjA4NDEzNTQ5OH0.39F_md2gcJw5yDxTXEdydwKLW-Yr-qfIbBmg9nXh_PM';

module.exports = async function handler(req, res) {
  try {
    const rawLimit = Array.isArray(req.query?.limit) ? req.query.limit[0] : req.query?.limit;
    const parsedLimit = Number.parseInt(rawLimit || '2', 10);
    const limit = Number.isFinite(parsedLimit) && parsedLimit > 0 ? Math.min(parsedLimit, 10) : 2;

    const url = `${SUPABASE_URL}/rest/v1/market_prices?select=*&order=updated_at.desc&limit=${limit}`;

    const response = await fetch(url, {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
    });

    const text = await response.text();
    if (!response.ok) {
      return res.status(response.status).json({
        error: 'Supabase request failed',
        details: text,
      });
    }

    const data = text ? JSON.parse(text) : [];
    return res.status(200).json({ data });
  } catch (error) {
    return res.status(500).json({
      error: 'Failed to fetch market prices',
      details: error instanceof Error ? error.message : String(error),
    });
  }
};
