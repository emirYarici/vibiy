# ── Stage 1: Builder ────────────────────────────────────────────────────────
FROM node:22-slim AS builder

WORKDIR /app

# Install only production deps
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# ── Stage 2: Production ──────────────────────────────────────────────────────
FROM node:22-slim

# Install Python + pip for scraper.py
RUN apt-get update && apt-get install -y --no-install-recommends \
      python3 \
      python3-pip \
      python3-venv \
      curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy node_modules from builder
COPY --from=builder /app/node_modules ./node_modules

# Copy app source
COPY package.json ./
COPY index.js ./
COPY scraper.py ./
COPY requirements.txt ./

# Install Python dependencies in a venv
RUN python3 -m venv /app/venv \
    && /app/venv/bin/pip install --no-cache-dir -r requirements.txt

# Make venv python the default for execFile calls
ENV PATH="/app/venv/bin:$PATH"

# Port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3001/api/thumbnail?url=test || exit 1

CMD ["node", "index.js"]
