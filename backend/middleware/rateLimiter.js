// Rate limiter en memoria — sin dependencias externas
// Ventana deslizante simple por IP
function createRateLimiter({ windowMs = 15 * 60 * 1000, max = 100, message = 'Demasiadas peticiones.' } = {}) {
  const store = new Map();

  setInterval(() => {
    const now = Date.now();
    for (const [key, val] of store) {
      if (now - val.start > windowMs) store.delete(key);
    }
  }, windowMs);

  return (req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    const now = Date.now();
    const entry = store.get(ip);

    if (!entry || now - entry.start > windowMs) {
      store.set(ip, { count: 1, start: now });
      return next();
    }

    entry.count += 1;
    if (entry.count > max) {
      const retryAfter = Math.ceil((windowMs - (now - entry.start)) / 1000);
      res.setHeader('Retry-After', retryAfter);
      return res.status(429).json({ error: message });
    }
    next();
  };
}

const loginLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 10,
  message: 'Demasiados intentos de login. Espera 15 minutos.',
});

module.exports = { loginLimiter };
