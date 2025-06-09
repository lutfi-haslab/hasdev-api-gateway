import type { Config } from "drizzle-kit";

export default {
  out: "./drizzle/todo",
  schema: "./configs/db/schema.todo.ts",
  dialect: "sqlite",
  dbCredentials: {
    url: process.env.DB_LOCAL_TODO!, 
  },
} satisfies Config;
