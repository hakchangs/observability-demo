import { generateGuid, setCurrentGuid } from '../utils/guid';
import { getSessionBaggage } from '../utils/session';

const getToken = () => localStorage.getItem('token');

async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  const guid = generateGuid();
  setCurrentGuid(guid);

  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
    'baggage': [`guid=${guid}`, getSessionBaggage()].filter(Boolean).join(','),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(url, { ...options, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw Object.assign(new Error(err.message || '요청 실패'), { status: res.status });
  }
  return res.json();
}

export const api = {
  get: <T>(url: string) => request<T>(url),
  post: <T>(url: string, body: unknown) =>
    request<T>(url, { method: 'POST', body: JSON.stringify(body) }),
};