import type { Config } from "drizzle-kit";

export default {
  out: "./drizzle/todo",
  schema: "./src/configs/db/schema.todo.ts",
  dialect: "sqlite",
  dbCredentials: {
    url: process.env.DB_LOCAL_TODO!, 
  },
} satisfies Config;
