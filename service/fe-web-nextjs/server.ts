import next from "next";
import {
    createServer as createHttpServer,
    IncomingMessage, ServerResponse
} from "http";


//LOG Bridge 설정
import {setupLogBridge} from "./utils/otel/logger.server";
setupLogBridge();

//logger 설정
import log from 'loglevel';
const logger = log.getLogger('server-side');
logger.setLevel("info");

//HTTP logger 설정
import {emitHttpLog} from "./utils/otel/logger.server";
import {generateGuid} from "@/utils/otel/guid";

//앱 시작
const app = next({
    turbopack: process.env.NODE_ENV !== "production",
});
const nextHandler = app.getRequestHandler();

const createAppServer = () => {
    const requestHandler = async (request: IncomingMessage, response: ServerResponse) => {
        //TODO: 요청처리 + 인아웃 로그 기록

        const guid = generateGuid();

        //http 요청 로깅
        const start = Date.now();
        const {method, url, headers: requestHeaders} = request;
        const requestHeadersFlat = Object.entries(requestHeaders)
            .filter(([_, v]) => v !== undefined)
            .map(([k, v]) => {
                return `${k}: ${v}`;
            }).join(", ");

        //request body 버퍼링 후 복원
        const requestBodyBuffer = await new Promise<Buffer>((resolve, reject) => {
            const chunks: Buffer[] = [];
            request.on('data', chunk => chunks.push(Buffer.isBuffer(chunk) ? chunk :
                Buffer.from(chunk)));
            request.on('end', () => resolve(Buffer.concat(chunks)));
            request.on('error', reject);
        });
        const requestBody = requestBodyBuffer.toString('utf-8');
        if (requestBodyBuffer.length > 0) request.push(requestBodyBuffer);
        request.push(null);  // 스트림 종료 신호 복원

        // 2. response body 가로채기
        const responseChunks: Buffer[] = [];
        const originalWrite = response.write.bind(response);
        const originalEnd = response.end.bind(response);
        (response as any).write = (chunk: any, ...args: any[]) => {
            if (chunk) responseChunks.push(Buffer.isBuffer(chunk) ? chunk :
                Buffer.from(String(chunk)));
            return originalWrite(chunk, ...args);
        };
        (response as any).end = (chunk?: any, ...args: any[]) => {
            if (chunk) responseChunks.push(Buffer.isBuffer(chunk) ? chunk :
                Buffer.from(String(chunk)));
            return originalEnd(chunk, ...args);
        };

        emitHttpLog(
            `${requestBody}`, {
            log_category: "app",
            event_type: "http",
            "http.event": "request",
            "http.method": method ?? "",
            "http.url": url ?? "",
            "http.request.headers": requestHeadersFlat,
            "guid": guid,
        });

        response.on("finish", () => {

            const duration = Date.now() - start;
            const {statusCode} = response;
            const responseBody = Buffer.concat(responseChunks).toString('utf-8');
            const responseHeaders = response.getHeaders();
            const responseHeadersFlat = Object.entries(responseHeaders)
                .filter(([_, v]) => v !== undefined)
                .map(([k, v]) => {
                    return `${k}: ${v}`;
                }).join(", ");

            logger.info(`[access] ${method} ${url} ${statusCode} ${duration}ms`);

            //http 응답 로깅
            emitHttpLog(
                `${responseBody}`, {
                log_category: "app",
                event_type: "http",
                "http.event": "response",
                "http.method": method ?? "",
                "http.response.headers": responseHeadersFlat,
                "http.url": url ?? "",
                "http.status": statusCode,
                "http.duration": duration,
                "guid": guid,
            });
        });

        await nextHandler(request, response);
    }

    return {
        protocol: "http",
        server: createHttpServer(requestHandler),
    }
};

app.prepare().then(() => {
    const {protocol, server} = createAppServer();
    server.listen(3000, () => {
        logger.info("server listening on port 3000");
    });
});

