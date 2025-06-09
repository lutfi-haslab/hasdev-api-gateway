import { Env } from 'hono';

type Environment = Env & {
  Bindings: {
    DB: D1Database;
    AUTH_DB: D1Database;
    TODO_DB: D1Database;
    ENV_TYPE: 'dev' | 'prod' | 'stage';
    JWT_SECRET: string;
    GITHUB_CLIENT_ID: string;
    GITHUB_CLIENT_SECRET: string;
    GITHUB_REDIRECT_URI: string;
  };
};