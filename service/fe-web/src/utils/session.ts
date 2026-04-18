let _sessionId = '';
let _userId = '';

function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export function initSession(userId: string): void {
  let sessionId = sessionStorage.getItem('session.id');
  if (!sessionId) {
    sessionId = generateUUID();
    sessionStorage.setItem('session.id', sessionId);
  }
  _sessionId = sessionId;
  _userId = userId;
}

export function restoreSession(): void {
  const sessionId = sessionStorage.getItem('session.id');
  const userId = localStorage.getItem('userId');
  if (sessionId && userId) {
    _sessionId = sessionId;
    _userId = userId;
  }
}

export function clearSession(): void {
  sessionStorage.removeItem('session.id');
  _sessionId = '';
  _userId = '';
}

export function getSessionAttributes(): Record<string, string> {
  const attrs: Record<string, string> = {};
  if (_sessionId) attrs['session.id'] = _sessionId;
  if (_userId) attrs['user.id'] = _userId;
  return attrs;
}

export function getSessionBaggage(): string {
  const parts: string[] = [];
  if (_sessionId) parts.push(`session.id=${_sessionId}`);
  if (_userId) parts.push(`user.id=${_userId}`);
  return parts.join(',');
}