FROM node:20-slim

# --- Optional corporate CA certificate ---
# Place your CA cert at certs/ca-certificate.crt before building.
COPY certs/ /tmp/certs/
RUN if ls /tmp/certs/*.crt 1>/dev/null 2>&1; then \
        cp /tmp/certs/*.crt /usr/local/share/ca-certificates/ && \
        apt-get update && apt-get install -y --no-install-recommends ca-certificates && \
        update-ca-certificates && \
        rm -rf /var/lib/apt/lists/* && \
        npm config set cafile /etc/ssl/certs/ca-certificates.crt; \
    fi && rm -rf /tmp/certs
ENV SSL_CERT_FILE=/etc/ssl/certs/ca-certificates.crt
ENV NODE_EXTRA_CA_CERTS=/etc/ssl/certs/ca-certificates.crt
ENV CURL_CA_BUNDLE=/etc/ssl/certs/ca-certificates.crt
# -----------------------------------------

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# NEXT_PUBLIC_ vars must be present at build time for Next.js static inlining
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
