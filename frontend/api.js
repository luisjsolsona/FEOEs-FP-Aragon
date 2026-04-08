// =============================================================
// api.js — Cliente API REST FEOE FP Aragón
// =============================================================

async function apiFetch(path, options = {}) {
  const res = await fetch('/api' + path, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || `Error ${res.status}`);
  return json;
}

const Auth = {
  login:  (username, password) => apiFetch('/auth/login',  { method: 'POST', body: { username, password } }),
  logout: ()                   => apiFetch('/auth/logout', { method: 'POST' }),
  me:     ()                   => apiFetch('/auth/me'),
};

const Users = {
  list:           ()       => apiFetch('/users'),
  create:         (body)   => apiFetch('/users',              { method: 'POST',   body }),
  update:         (id, b)  => apiFetch(`/users/${id}`,        { method: 'PUT',    body: b }),
  delete:         (id)     => apiFetch(`/users/${id}`,        { method: 'DELETE' }),
  changePassword: (id, b)  => apiFetch(`/users/${id}/password`,{ method: 'PUT',   body: b }),
};

const Empresas = {
  list:   ()       => apiFetch('/empresas'),
  create: (body)   => apiFetch('/empresas',       { method: 'POST',   body }),
  update: (id, b)  => apiFetch(`/empresas/${id}`, { method: 'PUT',    body: b }),
  delete: (id)     => apiFetch(`/empresas/${id}`, { method: 'DELETE' }),
};

const Alumnado = {
  list:       ()       => apiFetch('/alumnado'),
  create:     (body)   => apiFetch('/alumnado',            { method: 'POST',   body }),
  update:     (id, b)  => apiFetch(`/alumnado/${id}`,      { method: 'PUT',    body: b }),
  delete:     (id)     => apiFetch(`/alumnado/${id}`,      { method: 'DELETE' }),
  bulkDelete: (ids)    => apiFetch('/alumnado/bulk-delete', { method: 'POST',   body: { ids } }),
};

const Estancias = {
  create: (body)   => apiFetch('/estancias',       { method: 'POST',   body }),
  update: (id, b)  => apiFetch(`/estancias/${id}`, { method: 'PUT',    body: b }),
  delete: (id)     => apiFetch(`/estancias/${id}`, { method: 'DELETE' }),
};

const Pendientes = {
  list:     ()           => apiFetch('/pendientes'),
  create:   (body)       => apiFetch('/pendientes',                    { method: 'POST', body }),
  resolver: (id, aprobar)=> apiFetch(`/pendientes/${id}/resolver`,    { method: 'PUT',  body: { aprobar } }),
};

const Historial = {
  list:   (limit = 200) => apiFetch(`/historial?limit=${limit}`),
  create: (tipo, texto) => apiFetch('/historial', { method: 'POST', body: { tipo, texto } }),
};

const Seguimientos = {
  list:     (params = {}) => {
    const q = Object.entries(params).map(([k,v]) => k+'='+encodeURIComponent(v)).join('&');
    return window.apiFetch('/seguimientos' + (q ? '?'+q : ''));
  },
  visitas:  (params = {}) => {
    const q = Object.entries(params).map(([k,v]) => k+'='+encodeURIComponent(v)).join('&');
    return window.apiFetch('/seguimientos/visitas' + (q ? '?'+q : ''));
  },
  create:   (body)   => window.apiFetch('/seguimientos',              { method: 'POST',   body }),
  update:   (id, b)  => window.apiFetch(`/seguimientos/${id}`,        { method: 'PUT',    body: b }),
  validar:  (id)     => window.apiFetch(`/seguimientos/${id}/validar`, { method: 'PUT',    body: {} }),
  delete:   (id)     => window.apiFetch(`/seguimientos/${id}`,        { method: 'DELETE' }),
};
