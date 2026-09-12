# --- Production Multi-Stage Dockerfile for FreeGen AI ---
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency definitions
COPY package*.json ./
RUN npm install

# Copy source and build
COPY . .
RUN npm run build

# Runner stage
FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
RUN npm install --omit=dev

# Copy compiled artifacts from builder
COPY --from=builder /app/dist ./dist

# Port 3000
EXPOSE 3000

CMD ["node", "dist/server.cjs"]
