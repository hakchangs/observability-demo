FROM harbor.platform.local/dockerhub/library/node:20-alpine3.20 AS builder
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --legacy-peer-deps
COPY . .
ARG NEXT_PUBLIC_BFF_URL=""
ENV NEXT_PUBLIC_BFF_URL=$NEXT_PUBLIC_BFF_URL
RUN npm run build && mkdir -p .next/standalone/public

FROM harbor.platform.local/dockerhub/library/node:20-alpine3.20
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static/
EXPOSE 3000
CMD ["node", "server.js"]