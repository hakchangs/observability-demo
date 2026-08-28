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
import {context, propagation, trace} from "@opentelemetry/api";

//앱 시작
const app = next({
    turbopack: process.env.NODE_ENV !== "production",
});
const nextHandler = app.getRequestHandler();


function readBody(req: IncomingMessage) {
    return new Promise<Buffer>((resolve, reject) => {
        const chunks: Buffer[] = [];
        req.on("data", chunk => chunks.push(chunk));
        req.on("end", () => resolve(Buffer.concat(chunks)));
        req.on("error", reject);
    });
}

const INOUT_TEST_PATH = "/api/test/http-inout";

async function handleInoutTest(request: IncomingMessage, response: ServerResponse) {
    const {method, url} = request;
    const requestBodyBuffer = await readBody(request);
    const requestBody = requestBodyBuffer.toString('utf-8');
    logHttpRequest(request, requestBody);

    let responsePayload: unknown;
    let statusCode = 200;

    if (method === "POST") {
        try {
            const parsed = requestBody.length > 0 ? JSON.parse(requestBody) : {};
            responsePayload = {received: parsed};
        } catch {
            statusCode = 400;
            responsePayload = {error: "invalid json"};
        }
    } else {
        responsePayload = {status: "UP"};
    }

    const responseBody = JSON.stringify(responsePayload);
    response.writeHead(statusCode, {"Content-Type": "application/json"});
    response.end(responseBody);

    logHttpResponse(request, response, responseBody);
}

const createAppServer = () => {
    const requestHandler = async (request: IncomingMessage, response: ServerResponse) => {

        const start = Date.now();
        const {method, url} = request;

        // 인입 요청의 traceparent/baggage 를 추출 (auto-instrumentation 이 이미 active span 을 만들어둔 상태)
        const parentContext = propagation.extract(context.active(), request.headers, {
            get: (carrier, key) => carrier[key]?.toString(),
            keys: (carrier) => Object.keys(carrier),
        });

        // baggage 에 guid 가 이미 있으면 재사용(상위 서비스에서 전파), 없으면 새로 생성
        const existingGuid = propagation.getBaggage(parentContext)?.getEntry("guid")?.value;
        const guid = existingGuid ?? generateGuid();

        // 현재 active span(HTTP auto-instrumentation) 에 guid attribute 추가
        trace.getActiveSpan()?.setAttribute("guid", guid);

        // 하위 호출(be-bff 등)까지 guid 가 전파되도록 baggage 에 실어 context 로 진행
        const newBaggage = (propagation.getBaggage(parentContext) ?? propagation.createBaggage())
            .setEntry("guid", {value: guid});
        const requestContext = propagation.setBaggage(parentContext, newBaggage);

        if (url === INOUT_TEST_PATH) {
            await context.with(requestContext, () => handleInoutTest(request, response));
            const duration = Date.now() - start;
            const {statusCode} = response;
            logger.info(`[access] ${method} ${url} ${statusCode} ${duration}ms`);
            return;
        }

        response.on("finish", () => {
            const duration = Date.now() - start;
            const {statusCode} = response;
            logger.info(`[access] ${method} ${url} ${statusCode} ${duration}ms`);
        });

        await context.with(requestContext, () => nextHandler(request, response));
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
