# Stage 1: React 빌드
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .

RUN npm run build

# Stage 2: nginx 서빙
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf.template /etc/nginx/nginx.conf.template

# 컨테이너 시작 시 모든 환경변수를 index.html 및 nginx 설정에 주입 후 실행
CMD ["/bin/sh", "-c", \
    "envsubst '${VITE_SERVICE_NAME} ${VITE_SERVICE_VERSION} ${VITE_DEPLOYMENT_ENV} ${VITE_OTLP_TRACES_PATH}' \
     < /usr/share/nginx/html/index.html \
     > /tmp/index.html \
     && mv /tmp/index.html /usr/share/nginx/html/index.html \
     && envsubst '${BFF_URL} ${OTEL_COLLECTOR_URL}' \
     < /etc/nginx/nginx.conf.template \
     > /etc/nginx/conf.d/default.conf \
     && nginx -g 'daemon off;'"]