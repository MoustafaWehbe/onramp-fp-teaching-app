# Starter Kit

A full-stack TypeScript monorepo with everything pre-configured so you can focus on building features.

## Stack

| Layer           | Technology                              |
| --------------- | --------------------------------------- |
| Frontend        | React 18, Vite, Tailwind CSS, shadcn/ui |
| Backend         | Express, Sequelize, Zod                 |
| Background Jobs | BullMQ, Redis                           |
| Database        | PostgreSQL 16 + pgvector                |
| Monorepo        | Turborepo                               |
| Language        | TypeScript (everywhere)                 |

## Project Structure

```
packages/
  web/        → React + Vite frontend (port 5173)
  api/        → Express REST API (port 3000)
  workers/    → BullMQ background job processors
  shared/     → Shared utilities (auth, db models, queue, AI)
```

## Getting Started

### 1. Prerequisites

- Node.js >= 20
- Docker (for PostgreSQL + Redis)

### 2. Install dependencies

```bash
npm install
```

### 3. Start infrastructure

```bash
docker-compose up -d
```

### 4. Configure environment

```bash
cp .env.example .env
# Edit .env with your values
```

### 5. Run database migrations

```bash
cd packages/api
npx sequelize-cli db:migrate
npx sequelize-cli db:seed:all   # optional sample data

# create a new migration
npx sequelize-cli migration:generate --name create-restaurants
# then edit the generated file in packages/api/src/migrations/ to define the schema changes
# then apply the migration
npx sequelize-cli db:migrate
```

### 6. Start development servers

```bash
# Start all packages in parallel
npm run dev

# Or start individually
cd packages/api && npm run dev     # API on :3000
cd packages/web && npm run dev     # Web on :5173
cd packages/workers && npm run dev # Workers
```

## Available Scripts (root)

| Command         | Description                      |
| --------------- | -------------------------------- |
| `npm run dev`   | Start all packages in watch mode |
| `npm run build` | Build all packages               |
| `npm run test`  | Run all test suites              |
| `npm run lint`  | Lint all packages                |

## Environment Variables

See `.env.example` for all required variables.

## Testing

```bash
npm run test              # Run all tests
cd packages/api && npm test  # API unit tests (Jest)
cd packages/web && npm test  # Web tests (Vitest)
```

## Docker

The `docker-compose.yml` starts:

- **PostgreSQL 16 with pgvector** on port `5432`
- **Redis 7** on port `6379`

The Course Assistant migration enables the `vector` extension. If you use a
PostgreSQL server outside Docker, install pgvector for PostgreSQL 16 before
running `npm run db:migrate -w @starter-kit/api`. The first course question
downloads the pinned multilingual E5 model into `MODEL_CACHE_DIR`; set
`EMBEDDING_ALLOW_REMOTE_MODELS=false` only after that model is available in the
configured cache.
