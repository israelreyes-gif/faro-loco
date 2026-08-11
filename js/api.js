import { API_BASE_URL } from './config.js';

const TOKEN_KEY = 'faro_token';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export function clearSession() {
  localStorage.removeItem('faro_session');
}

export function getSession() {
  const raw = localStorage.getItem('faro_session');
  return raw ? JSON.parse(raw) : null;
}

export function setSession(session) {
  localStorage.setItem('faro_session', JSON.stringify(session));
}

async function request(path, { method = 'GET', body, auth = false } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth) {
    const token = getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const err = new Error(data.error || 'Error de conexión con el faro');
    err.status = res.status;
    err.locked = data.locked ?? false;
    err.segundosRestantes = data.segundosRestantes;
    err.intentosRestantes = data.intentosRestantes;
    throw err;
  }

  // Renovación silenciosa del token: si el backend manda uno nuevo
  // (porque al anterior le quedaba poco tiempo), lo guardamos sin que
  // la persona note nada.
  if (data.nuevoToken) {
    setToken(data.nuevoToken);
  }

  return data;
}

export const api = {
  register: (payload) => request('/api/register', { method: 'POST', body: payload }),
  login: (payload) => request('/api/login', { method: 'POST', body: payload }),
  estado: () => request('/api/estado', { auth: true }),
  enviarMensaje: (payload) => request('/api/mensaje', { method: 'POST', body: payload, auth: true }),
  suscribirPush: (subscription) => request('/api/push/subscribe', { method: 'POST', body: subscription, auth: true })
};
