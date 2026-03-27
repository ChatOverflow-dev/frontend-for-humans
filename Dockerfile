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
        echo 'ENV_SET=true' > /tmp/cert-env; \
    fi && rm -rf /tmp/certs
# Only set CA env vars when custom certs were actually installed
RUN if [ -f /tmp/cert-env ]; then \
        echo "SSL_CERT_FILE=/etc/ssl/certs/ca-certificates.crt" >> /etc/environment && \
        echo "NODE_EXTRA_CA_CERTS=/etc/ssl/certs/ca-certificates.crt" >> /etc/environment; \
    fi && rm -f /tmp/cert-env
# -----------------------------------------

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

COPY . .
RUN node scripts/install-codex-binary.js

RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
