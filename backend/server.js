const express         = require('express');
const cookieParser    = require('cookie-parser');
const cors            = require('cors');
const logger          = require('./utils/logger');
const securityHeaders = require('./middleware/securityHeaders');

require('./db');

const app  = express();
const PORT = process.env.PORT || 3001;

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['http://localhost:5000', 'http://localhost:3001'];

app.use(securityHeaders);
app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('CORS not allowed'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type'],
}));

// Request logging
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    logger.info('HTTP', {
      method: req.method,
      path: req.path,
      status: res.statusCode,
      ms: Date.now() - start,
      user: req.user?.id || 'anon',
    });
  });
  next();
});

app.use('/api/auth',         require('./routes/auth'));
app.use('/api/users',        require('./routes/users'));
app.use('/api/empresas',     require('./routes/empresas'));
app.use('/api/alumnado',     require('./routes/alumnado'));
app.use('/api/estancias',    require('./routes/estancias'));
app.use('/api/seguimientos', require('./routes/seguimientos'));
app.use('/api/pendientes',   require('./routes/pendientes'));
app.use('/api/historial',    require('./routes/historial'));

app.get('/api/health', (_req, res) => res.json({ status: 'ok', ts: new Date().toISOString() }));

app.listen(PORT, () => logger.info('Backend iniciado', { port: PORT }));
