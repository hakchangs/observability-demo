let _sessionId = '';
let _userId = '';

export function initSession(userId: string): void {
  let sessionId = sessionStorage.getItem('session.id');
  if (!sessionId) {
    sessionId = crypto.randomUUID();
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