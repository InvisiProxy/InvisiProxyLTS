FROM node:26-alpine AS base
RUN npm install -g pnpm
WORKDIR /app

# finalwisp, the Wisp server (x86_64 only). The site process runs one instance
# per region itself; see FINALWISP.md.
FROM node:26-alpine AS finalwisp
ARG FINALWISP_VERSION=v1.5.0
WORKDIR /tmp
RUN apk add --no-cache curl \
 && case "$(uname -m)" in x86_64) ;; *) echo "finalwisp supports x86_64 only (this build is $(uname -m)); see FINALWISP.md" >&2; exit 1 ;; esac \
 && curl -sLO "https://github.com/theogbob/finalwisp/releases/download/${FINALWISP_VERSION}/finalwisp-${FINALWISP_VERSION}-x86_64-linux.tar.gz" \
 && curl -sLO "https://github.com/theogbob/finalwisp/releases/download/${FINALWISP_VERSION}/SHA256SUMS" \
 && tar -xzf "finalwisp-${FINALWISP_VERSION}-x86_64-linux.tar.gz" \
 && sha256sum -c SHA256SUMS \
 && install -m 0755 "finalwisp-${FINALWISP_VERSION}-x86_64-linux/finalwisp" /usr/local/bin/finalwisp \
 && finalwisp --version

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
      org.opencontainers.image.version="8.4.1" \
      org.opencontainers.image.authors="InvisiProxy Team" \
      org.opencontainers.image.source="https://github.com/InvisiProxy/InvisiProxyLTS"
RUN apk add --no-cache tor
WORKDIR /app
COPY --from=finalwisp /usr/local/bin/finalwisp /usr/local/bin/finalwisp
COPY --from=build /app/dist ./dist
COPY --from=build /app/views/dist ./views/dist
COPY --from=deps /app/node_modules ./node_modules
COPY config.json package.json ./
COPY private ./private
EXPOSE 8080 9050 9051
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s CMD wget -q -O /dev/null "http://127.0.0.1:${PORT:-8080}/" || exit 1
# Start Tor in the background (it may take a while to bootstrap), then the server
CMD ["sh", "-c", "tor & exec node dist/server.js"]
