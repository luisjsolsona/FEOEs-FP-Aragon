const express = require('express');
const { requireAuth } = require('../middleware/auth');
const router = express.Router();

// Proxy hacia Nominatim para evitar bloqueos CORS desde el navegador.
// Usa la IP del servidor (no la del cliente), respeta el rate-limit de 1 req/s.
router.get('/', requireAuth, async (req, res) => {
  const { q } = req.query;
  if (!q) return res.status(400).json({ error: 'Parámetro q requerido' });

  // Nominatim exige User-Agent identificativo
  const ua = 'FEOEs-FP-Aragon/1.0 (gestor educativo; contacto@feoe.es)';

  try {
    const url = `https://nominatim.openstreetmap.org/search?${new URLSearchParams({
      q, format: 'json', limit: '3', countrycodes: 'es', addressdetails: '1',
    })}`;
    const resp = await fetch(url, {
      headers: { 'User-Agent': ua, 'Accept-Language': 'es' },
    });
    if (!resp.ok) return res.status(502).json({ error: `Nominatim HTTP ${resp.status}` });
    const data = await resp.json();
    res.json(data);
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

// Búsqueda estructurada (calle + CP + ciudad separados)
router.get('/structured', requireAuth, async (req, res) => {
  const { street, postalcode, city, country } = req.query;
  const ua = 'FEOEs-FP-Aragon/1.0 (gestor educativo; contacto@feoe.es)';
  try {
    const params = { format: 'json', limit: '3', countrycodes: 'es', addressdetails: '1' };
    if (street)     params.street     = street;
    if (postalcode) params.postalcode = postalcode;
    if (city)       params.city       = city;
    if (country)    params.country    = country;
    const url = `https://nominatim.openstreetmap.org/search?${new URLSearchParams(params)}`;
    const resp = await fetch(url, {
      headers: { 'User-Agent': ua, 'Accept-Language': 'es' },
    });
    if (!resp.ok) return res.status(502).json({ error: `Nominatim HTTP ${resp.status}` });
    const data = await resp.json();
    res.json(data);
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

module.exports = router;
