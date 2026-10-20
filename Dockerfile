FROM node:22-bookworm-slim

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY requirements.txt ./
RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 python3-venv \
    && python3 -m venv /opt/scraper-venv \
    && /opt/scraper-venv/bin/pip install --no-cache-dir -r requirements.txt \
    && rm -rf /var/lib/apt/lists/*

ENV PATH="/opt/scraper-venv/bin:$PATH"

COPY . .

EXPOSE 3000

CMD ["npm", "run", "start"]
