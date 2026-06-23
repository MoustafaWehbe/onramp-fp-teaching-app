FROM node:20-alpine AS base
WORKDIR /app

# Install dependencies
COPY package*.json ./
COPY packages/workers/package*.json ./packages/workers/
COPY packages/shared/package*.json ./packages/shared/
RUN npm ci --workspace=@starter-kit/workers --workspace=@starter-kit/shared

# Copy source
COPY packages/shared ./packages/shared
COPY packages/workers ./packages/workers

# Build shared first, then workers
RUN npm run build --workspace=@starter-kit/shared
RUN npm run build --workspace=@starter-kit/workers

FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/packages/shared/dist ./packages/shared/dist
COPY --from=base /app/packages/workers/dist ./packages/workers/dist
COPY packages/workers/package.json ./packages/workers/

CMD ["node", "packages/workers/dist/index.js"]
