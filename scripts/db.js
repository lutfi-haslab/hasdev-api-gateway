#!/usr/bin/env node
const { execSync, spawn } = require('child_process');

const [command, ...args] = process.argv.slice(2);

const commands = {
  'echo:db': () => {
    console.log('All .sqlite files:');
    execSync('find . -type f -name "*.sqlite" -print', { stdio: 'inherit' });
  },
  
  'gen': () => {
    execSync('drizzle-kit generate --config=./configs/local/drizzle.config.auth.ts', { stdio: 'inherit' });
    execSync('drizzle-kit generate --config=./configs/local/drizzle.config.todo.ts', { stdio: 'inherit' });
  },

  'migrate:auth:local': () => {
    execSync('wrangler d1 migrations apply --local AUTH_DB', { stdio: 'inherit' });
  },
  
  'migrate:todo:local': () => {
    execSync('wrangler d1 migrations apply --local TODO_DB', { stdio: 'inherit' });
  },
  
  'migrate:local': () => {
    console.log('Migrating AUTH_DB...');
    execSync('wrangler d1 migrations apply --local AUTH_DB', { stdio: 'inherit' });
    console.log('Migrating TODO_DB...');
    execSync('wrangler d1 migrations apply --local TODO_DB', { stdio: 'inherit' });
  },
  
  'migrate:prod': () => {
    console.log('Migrating AUTH_DB to production...');
    execSync('drizzle-kit migrate --config=./configs/prod/drizzle.config.auth.ts', { stdio: 'inherit' });
    console.log('Migrating TODO_DB to production...');
    execSync('drizzle-kit migrate --config=./configs/prod/drizzle.config.todo.ts', { stdio: 'inherit' });
  },

  'studio:local': () => {
    spawn('bun', ['run', 'drizzle-kit', 'studio', '--config=./configs/local/drizzle.config.auth.ts', '--port', '3094'], { stdio: 'inherit' });
    spawn('bun', ['run', 'drizzle-kit', 'studio', '--config=./configs/local/drizzle.config.todo.ts', '--port', '3095'], { stdio: 'inherit' });
  },
  'studio:prod': () => {
    spawn('bun', ['run', 'drizzle-kit', 'studio', '--config=./configs/prod/drizzle.config.auth.ts', '--port', '3094'], { stdio: 'inherit' });
    spawn('bun', ['run', 'drizzle-kit', 'studio', '--config=./configs/prod/drizzle.config.todo.ts', '--port', '3095'], { stdio: 'inherit' });
  },
};

if (commands[command]) {
  commands[command]();
} else {
  console.log('Available commands:');
  console.log('  echo:db          - Show local database paths');
  console.log('  gen:auth         - Generate auth schema migrations');
  console.log('  gen:todo         - Generate todo schema migrations');
  console.log('  gen:all          - Generate all migrations');
  console.log('  migrate:auth:local - Migrate auth DB locally');
  console.log('  migrate:todo:local - Migrate todo DB locally');
  console.log('  migrate:local    - Migrate all DBs locally');
  console.log('  migrate:prod     - Migrate all DBs to production');
}