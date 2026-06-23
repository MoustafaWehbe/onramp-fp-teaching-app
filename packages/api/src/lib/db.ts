import { Sequelize } from "sequelize";
import { initModels } from "@starter-kit/shared";

let sequelize: Sequelize | null = null;

export function getDatabase(): Sequelize {
  if (!sequelize) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL environment variable is required");

    sequelize = new Sequelize(url, {
      dialect: "postgres",
      logging: process.env.NODE_ENV === "development" ? console.info : false,
      define: { timestamps: true, underscored: true },
      pool: { max: 10, min: 2, acquire: 30_000, idle: 10_000 },
    });
  }
  return sequelize;
}

export async function initializeDatabase(): Promise<void> {
  const db = getDatabase();
  await db.authenticate();
  initModels(db);
  console.info("Database connection established");
}
