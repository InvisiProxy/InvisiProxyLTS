FROM node:26-alpine AS base
RUN npm install -g pnpm
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile --prod

FROM base AS build
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm exec vite build --configLoader native

FROM node:26-alpine
LABEL org.opencontainers.image.title="InvisiProxy LTS" \
      org.opencontainers.image.description="An effective, privacy-focused web proxy service" \
      org.opencontainers.image.version="8.2.0" \
      org.opencontainers.image.authors="InvisiProxy Team" \
      org.opencontainers.image.source="https://github.com/InvisiProxy/InvisiProxyLTS"
RUN apk add --no-cache tor
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY --from=build /app/views/dist ./views/dist
COPY --from=deps /app/node_modules ./node_modules
COPY config.json package.json ./
COPY private ./private
EXPOSE 8080 9050 9051
# Start Tor in the background (it may take a while to bootstrap), then the server
CMD ["sh", "-c", "tor & exec node dist/server.js"]
