import type { Config } from "drizzle-kit";

export default {
  out: "./drizzle/hasnotes",
  schema: "./src/configs/db/schema.hasnotes.ts",
  dialect: "sqlite",
  dbCredentials: {
    url: process.env.DB_LOCAL_HASNOTES!, 
  },
} satisfies Config;
