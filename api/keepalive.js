// Mantém o Supabase ativo: o Vercel chama esta rota uma vez por dia (ver vercel.json).
const URL = 'https://jkmeysyltaezsudzkduh.supabase.co/rest/v1/edificios?select=id&limit=1';
const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImprbWV5c3lsdGFlenN1ZHprZHVoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI0Mjg1NzMsImV4cCI6MjEwODAwNDU3M30.Zd7rkmLi3QIF-KeKQ7--cLIolEswApY7y10cZVLYpy0';

module.exports = async (req, res) => {
  try {
    const r = await fetch(URL, { headers: { apikey: KEY, Authorization: 'Bearer ' + KEY } });
    res.status(r.ok ? 200 : 502).json({ ok: r.ok, status: r.status, em: new Date().toISOString() });
  } catch (e) {
    res.status(500).json({ ok: false, erro: String(e) });
  }
};
