const express      = require('express');
const cookieParser = require('cookie-parser');
const cors         = require('cors');

require('./db');

const app  = express();
const PORT = process.env.PORT || 3001;

app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());
app.use(cors({
  origin: function(origin, callback) { callback(null, true); },
  credentials: true,
}));

app.use('/api/auth',         require('./routes/auth'));
app.use('/api/users',        require('./routes/users'));
app.use('/api/empresas',     require('./routes/empresas'));
app.use('/api/alumnado',     require('./routes/alumnado'));
app.use('/api/estancias',    require('./routes/estancias'));
app.use('/api/seguimientos', require('./routes/seguimientos'));
app.use('/api/pendientes',   require('./routes/pendientes'));
app.use('/api/historial',    require('./routes/historial'));

app.get('/api/health', (req, res) => res.json({ status: 'ok', ts: new Date().toISOString() }));

app.listen(PORT, () => console.log('[FEOE] Backend en http://localhost:' + PORT));
