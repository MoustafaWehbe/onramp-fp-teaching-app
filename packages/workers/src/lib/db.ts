import { Sequelize } from "sequelize";
import { initModels } from "@starter-kit/shared";

let sequelize: Sequelize | null = null;

export function getDatabase(): Sequelize {
  if (!sequelize) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is required");

    sequelize = new Sequelize(url, {
      dialect: "postgres",
      logging: false,
      define: { timestamps: true, underscored: true },
      pool: { max: 5, min: 1, acquire: 30_000, idle: 10_000 },
    });
  }
  return sequelize;
}

export async function initializeDatabase(): Promise<void> {
  const db = getDatabase();
  await db.authenticate();
  initModels(db);
}
