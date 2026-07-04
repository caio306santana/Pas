# ---- Build Stage ----
FROM node:20-alpine AS builder

WORKDIR /app

# Install deps first (layer cache)
COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci

# Copy source and build
COPY . .
RUN npx prisma generate
RUN npm run build

# ---- Production Stage ----
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Only production deps
COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci --omit=dev

# Copy built output and prisma client
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

EXPOSE 3001

CMD ["node", "dist/main"]
