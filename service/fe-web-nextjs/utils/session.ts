let _sessionId = '';
let _userId = '';

export function initSession(userId: string): void {
  let sessionId = sessionStorage.getItem('session.id');
  if (!sessionId) {
    try {
      sessionId = crypto.randomUUID();
    } catch {
      sessionId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
    }
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