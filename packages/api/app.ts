import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import swaggerUi from "swagger-ui-express";
import fs from "fs";
import path from "path";
import yaml from "yaml";
import { errorHandler } from "./src/middleware/error-handler";
import { rateLimiter } from "./src/middleware/rate-limiter";
import { router } from "./src/routes";

const app = express();

// ─── Swagger UI ───────────────────────────────────────────────────────────────
const openapiPath = path.join(process.cwd(), "openapi.yaml");
const openapiDocument = yaml.parse(fs.readFileSync(openapiPath, "utf8"));
app.get("/api/openapi.yaml", (_req, res) => {
  res.setHeader("Content-Type", "text/yaml");
  res.send(fs.readFileSync(openapiPath, "utf8"));
});
app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(openapiDocument));

// ─── Security ─────────────────────────────────────────────────────────────────
app.use(helmet());
app.use(
  cors({
    origin: process.env.CORS_ORIGIN ?? "http://localhost:5173",
    credentials: true,
  }),
);

// ─── Cookie parsing ───────────────────────────────────────────────────────────
app.use(cookieParser());

// ─── Body parsing ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

// ─── Logging ──────────────────────────────────────────────────────────────────
if (process.env.NODE_ENV !== "test") {
  app.use(morgan("dev"));
}

// ─── Rate limiting ────────────────────────────────────────────────────────────
app.use("/api/", rateLimiter);

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use("/api", router);

// ─── Health check ─────────────────────────────────────────────────────────────
app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ─── Error handling (must be last) ────────────────────────────────────────────
app.use(errorHandler);

export { app };
