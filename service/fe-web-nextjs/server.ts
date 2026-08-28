import next from "next";
import {
    createServer as createHttpServer,
    IncomingMessage, ServerResponse
} from "http";


//LOG Bridge 설정
import {logHttpRequest, logHttpResponse, setupLogBridge} from "./utils/otel/logger.server";
setupLogBridge();

//logger 설정
import log from 'loglevel';
const logger = log.getLogger('server-side');
logger.setLevel("info");

//HTTP logger 설정
import {generateGuid} from "./utils/otel/guid";

//앱 시작
const app = next({
    turbopack: process.env.NODE_ENV !== "production",
});
const nextHandler = app.getRequestHandler();

const createAppServer = () => {
    const requestHandler = async (request: IncomingMessage, response: ServerResponse) => {

        const guid = generateGuid();

        const start = Date.now();
        const {method, url} = request;

        //로깅 타겟 설정
        const isInoutLoggingTarget = url === "/api/test/http-inout";

        // http 요청 로깅
        if (isInoutLoggingTarget) {
            const chunks: Buffer[] = [];
            const onData = (chunk: any) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
            const requestBodyBuffer = await new Promise<Buffer>((resolve, reject) => {
                request.on('data', onData);
                request.once('end', () => resolve(Buffer.concat(chunks)));
                request.once('error', reject);
            });

            logHttpRequest(request, requestBodyBuffer.toString('utf-8'));

            if (requestBodyBuffer.length > 0) {
                request.off('data', onData); // 우리 리스너 제거 (재발화 방지)

                // 스트림 상태 리셋: flowing=null 이면 Next.js 가 'data' 리스너 추가 시 자동 재개
                const state = (request as any)._readableState;
                state.ended = false;
                state.endEmitted = false;
                state.flowing = null;

                request.push(requestBodyBuffer);
                request.push(null);
            }
        }

        // response body 가로채기
        const responseChunks: Buffer[] = [];
        const toBuffer = (chunk: any): Buffer => {
            if (Buffer.isBuffer(chunk)) return chunk;
            if (typeof chunk === 'string') return Buffer.from(chunk, 'utf-8');
            return Buffer.from(chunk); // Uint8Array 등 typed array
        };
        const originalWrite = response.write.bind(response);
        const originalEnd = response.end.bind(response);
        (response as any).write = (chunk: any, ...args: any[]) => {
            if (chunk) responseChunks.push(toBuffer(chunk));
            return originalWrite(chunk, ...args);
        };
        (response as any).end = (chunk?: any, ...args: any[]) => {
            if (chunk) responseChunks.push(toBuffer(chunk));
            return originalEnd(chunk, ...args);
        };

        response.on("finish", () => {
            const duration = Date.now() - start;
            const {statusCode} = response;

            logger.info(`[access] ${method} ${url} ${statusCode} ${duration}ms`);

            // http 응답 로깅
            if (isInoutLoggingTarget) {
                const responseBody = Buffer.concat(responseChunks).toString('utf-8');
                logHttpResponse(request, response, responseBody);
            }
        });

        await nextHandler(request, response);
    }

    return {
        server: createHttpServer(requestHandler),
    }
};

const SERVER_PORT = 3000;

app.prepare().then(() => {
    const {server} = createAppServer();
    server.listen(SERVER_PORT, () => {
        logger.info("server listening on port 3000");
    });
});

