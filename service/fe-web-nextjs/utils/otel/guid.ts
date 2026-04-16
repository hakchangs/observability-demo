const SYSTEM_CODE = 'LTP';

export function generateGuid(): string {
  const now = new Date();
  const pad = (n: number, len: number) => String(n).padStart(len, '0');
  const timestamp =
    now.getFullYear().toString() +
    pad(now.getMonth() + 1, 2) +
    pad(now.getDate(), 2) +
    pad(now.getHours(), 2) +
    pad(now.getMinutes(), 2) +
    pad(now.getSeconds(), 2) +
    pad(now.getMilliseconds(), 3); // 17자
  const random = pad(Math.floor(Math.random() * 10_000_000_000), 10); // 10자
  return `${timestamp}${SYSTEM_CODE}${random}`;
}

let _currentGuid = '';

export function setCurrentGuid(guid: string): void {
  _currentGuid = guid;
}

export function getCurrentGuid(): string {
  return _currentGuid;
}