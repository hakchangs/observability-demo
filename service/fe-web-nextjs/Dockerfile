FROM harbor.platform.local/dockerhub/library/node:20-alpine3.20 AS builder
RUN apk add --no-cache libc6-compat
WORKDIR /app
ARG NEXT_PUBLIC_BFF_URL=""
ENV NEXT_PUBLIC_BFF_URL=$NEXT_PUBLIC_BFF_URL
COPY package.json package-lock.json ./
RUN npm ci --legacy-peer-deps
COPY . .
RUN npm run build

FROM harbor.platform.local/dockerhub/library/node:20-alpine3.20
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/server.ts ./
COPY --from=builder /app/utils ./utils
EXPOSE 3000
CMD ["npx", "tsx", "server.ts"]