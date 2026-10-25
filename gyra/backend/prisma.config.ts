import { existsSync } from "node:fs";
import { defineConfig } from "prisma/config";

// On the host, read gyra/.env. In containers the variables are already set.
if (!process.env.DATABASE_URL && existsSync("../.env")) process.loadEnvFile("../.env");

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  // `prisma generate` needs no database, so a missing URL only fails commands that connect.
  datasource: { url: process.env.DATABASE_URL ?? "" },
});
