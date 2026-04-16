import { NextRequest, NextResponse } from 'next/server';

// Edge runtime 호환 GUID 생성 (guid.ts는 Node.js 전용이므로 별도 구현)
function generateGuid(): string {
    const now = new Date();
    const pad = (n: number, len: number) => String(n).padStart(len, '0');
    const ts = now.getFullYear() + pad(now.getMonth()+1,2) +
        pad(now.getDate(),2)
        + pad(now.getHours(),2) + pad(now.getMinutes(),2) +
        pad(now.getSeconds(),2)
        + pad(now.getMilliseconds(),3);
    const rand = pad(Math.floor(Math.random() * 10_000_000_000), 10);
    return `${ts}LTP${rand}`;
}

export function middleware(request: NextRequest) {
    const existing = request.headers.get('baggage') ?? '';

    // 이미 guid 있으면 그대로 통과 (클라이언트가 설정한 경우)
    if (existing.includes('guid=')) {
        return NextResponse.next();
    }

    const guid = generateGuid();
    const baggage = existing ? `${existing},guid=${guid}` : `guid=${guid}`;

    // 요청 헤더에 baggage 주입 → OTel HTTP 계측이 context에 자동 추출
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('baggage', baggage);

    return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
    matcher: [
        // 정적 에셋, OTLP 엔드포인트 제외
        '/((?!_next/static|_next/image|favicon.ico|api/otlp).*)',
    ],
};