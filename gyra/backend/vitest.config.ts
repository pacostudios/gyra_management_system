import { existsSync } from "node:fs";
import { defineConfig } from "vitest/config";

// Integration tests run on the host against the Docker services; gyra/.env has their URLs.
if (!process.env.DATABASE_URL && existsSync("../.env")) process.loadEnvFile("../.env");

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    env: { NODE_ENV: "test" },
  },
});
