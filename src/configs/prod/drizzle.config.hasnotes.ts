import type { Config } from "drizzle-kit";


export default {
  out: "./drizzle/hasnotes",
  schema: "./src/configs/db/schema.hasnotes.ts",
  dialect: "sqlite",
  driver: "d1-http",
  dbCredentials: {
    databaseId: process.env.HASNOTES_DB_ID!,
    accountId: process.env.CLOUDFLARE_ACCOUNT_ID!,
    token: process.env.CLOUDFLARE_API_TOKEN!,
  },
} satisfies Config;