import { Env } from 'hono';

type Environment = Env & {
  Bindings: {
    DB: D1Database;
    ENV_TYPE: 'dev' | 'prod' | 'stage';
  };
};