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


function readBody(req: IncomingMessage) {
    return new Promise<Buffer>((resolve, reject) => {
        const chunks: Buffer[] = [];
        req.on("data", chunk => chunks.push(chunk));
        req.on("end", () => resolve(Buffer.concat(chunks)));
        req.on("error", reject);
    });
}

const INOUT_TEST_PATH = "/api/test/http-inout";

async function handleInoutTest(request: IncomingMessage, response: ServerResponse, guid: string, start: number) {
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

    const duration = Date.now() - start;
    logger.info(`[access] ${method} ${url} ${statusCode} ${duration}ms`);
    logHttpResponse(request, response, responseBody);
}

const createAppServer = () => {
    const requestHandler = async (request: IncomingMessage, response: ServerResponse) => {

        const guid = generateGuid();
        const start = Date.now();
        const {method, url} = request;

        if (url === INOUT_TEST_PATH) {
            await handleInoutTest(request, response, guid, start);
            return;
        }

        response.on("finish", () => {
            const duration = Date.now() - start;
            const {statusCode} = response;
            logger.info(`[access] ${method} ${url} ${statusCode} ${duration}ms`);
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
