# Stage 1: React 빌드
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .

ARG VITE_SERVICE_NAME=fe-web
ARG VITE_SERVICE_VERSION=0.0.1
ARG VITE_DEPLOYMENT_ENV=production
ARG VITE_OTLP_TRACES_PATH=/v1/traces

RUN npm run build

# Stage 2: nginx 서빙
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf.template /etc/nginx/nginx.conf.template

# 컨테이너 시작 시 BFF_URL, OTEL_COLLECTOR_URL 을 nginx 설정에 주입 후 실행
CMD ["/bin/sh", "-c", \
    "envsubst '${BFF_URL} ${OTEL_COLLECTOR_URL}' \
     < /etc/nginx/nginx.conf.template \
     > /etc/nginx/conf.d/default.conf \
     && nginx -g 'daemon off;'"]