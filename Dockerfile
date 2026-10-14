FROM node:26-alpine
WORKDIR /app
LABEL org.opencontainers.image.title="InvisiProxy LTS" \
      org.opencontainers.image.description="An effective, privacy-focused web proxy service" \
      org.opencontainers.image.version="8.1.0" \
      org.opencontainers.image.authors="InvisiProxy Team" \
      org.opencontainers.image.source="https://github.com/InvisiProxy/InvisiProxyLTS"
RUN apk add --no-cache tor bash python3 py3-pip make g++ gcc libc-dev gcompat
RUN npm install -g corepack
RUN corepack enable && corepack prepare pnpm@latest --activate

COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm run build
EXPOSE 8080 9050 9051
COPY serve.sh /serve.sh
RUN chmod +x /serve.sh
CMD ["/serve.sh"]