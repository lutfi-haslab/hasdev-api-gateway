import type { Config } from "drizzle-kit";

export default {
  out: "./drizzle/auth",
  schema: "./src/configs/db/schema.auth.ts",
  dialect: "sqlite",
  driver: "d1-http",
  dbCredentials: {
    databaseId: process.env.AUTH_DB_ID!,
    accountId: process.env.CLOUDFLARE_ACCOUNT_ID!,
    token: process.env.CLOUDFLARE_API_TOKEN!,
  },
} satisfies Config;
