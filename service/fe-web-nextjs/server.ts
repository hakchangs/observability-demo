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

//앱 시작
const app = next({
    turbopack: process.env.NODE_ENV !== "production",
});
const nextHandler = app.getRequestHandler();

const createAppServer = () => {
    const requestHandler = async (request: IncomingMessage, response: ServerResponse) => {
        //TODO: 요청처리 + 인아웃 로그 기록

        const start = Date.now();
        const {method, url} = request;
        response.on("finish", () => {
            logger.info(`${method} ${url} ${response.statusCode} ${Date.now() - start}ms`);
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

