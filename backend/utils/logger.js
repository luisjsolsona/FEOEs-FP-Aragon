const logger = {
  info:  (msg, data = {}) => console.log( JSON.stringify({ level: 'INFO',  msg, ...data, ts: new Date().toISOString() })),
  warn:  (msg, data = {}) => console.warn( JSON.stringify({ level: 'WARN',  msg, ...data, ts: new Date().toISOString() })),
  error: (msg, data = {}) => console.error(JSON.stringify({ level: 'ERROR', msg, ...data, ts: new Date().toISOString() })),
};

module.exports = logger;
