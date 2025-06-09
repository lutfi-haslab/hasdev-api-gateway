import type { Config } from "drizzle-kit";

export default {
  out: "./drizzle/auth",
  schema: "./configs/db/schema.auth.ts",
  dialect: "sqlite",
  dbCredentials: {
    url: process.env.DB_LOCAL_AUTH!, 
  },
} satisfies Config;
