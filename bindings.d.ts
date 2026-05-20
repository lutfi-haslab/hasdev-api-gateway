import { Env } from 'hono';

type Environment = Env & {
  Bindings: {
    DB: D1Database;
    AUTH_DB: D1Database;
    TODO_DB: D1Database;
    HASNOTES_DB: D1Database;
    KOMUNITASKU_DB: D1Database;
    VECTORIZE: VectorizeIndex;
    AI: Fetcher;
    ENV_TYPE: 'dev' | 'prod' | 'stage';
    JWT_SECRET: string;
    SMTP_HOST: string;
    SMTP_PORT: string;
    SMTP_SECURE: string;
    SMTP_USER: string;
    SMTP_PASS: string;
    SMTP_FROM_NAME: string;
    SMTP_FROM_EMAIL: string;
    GITHUB_CLIENT_ID: string;
    GITHUB_CLIENT_SECRET: string;
    GITHUB_REDIRECT_URI: string;
    HASNOTES_ENCRYPTION_KEY: string;
  };
};
