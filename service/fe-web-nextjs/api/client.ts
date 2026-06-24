const getToken = () =>
  typeof window !== 'undefined' ? localStorage.getItem('token') : null;

// NEXT_PUBLIC_BFF_URL 설정 시 브라우저가 BFF를 직접 호출 (cross-origin)
// 미설정 시 Next.js /api/* 프록시를 통해 same-origin 호출
const BFF_BASE_URL = process.env.NEXT_PUBLIC_BFF_URL ?? '';

async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${BFF_BASE_URL}${url}`, { ...options, headers });
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