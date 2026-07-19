FROM node:22-bookworm-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
COPY backend/package.json backend/package.json
COPY frontend/package.json frontend/package.json
RUN npm ci

COPY backend backend
RUN npm run build --workspace @shortlink/backend

WORKDIR /app/backend
ENV NODE_ENV=production
EXPOSE 4000

CMD ["npm", "run", "start"]
