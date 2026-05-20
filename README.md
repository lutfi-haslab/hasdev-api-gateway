# HasDev API Gateway

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-4.9.5-blue.svg)](https://www.typescriptlang.org/)
[![Hono](https://img.shields.io/badge/Hono-v4.7.10-FF6B6B.svg)](https://hono.dev/)

A modern API Gateway built with Hono.js, React, and Cloudflare Workers. This project provides a scalable and performant API layer with built-in authentication, request validation, and database integration.

## ✨ Features

- **Fast & Lightweight**: Built on Cloudflare Workers for edge computing
- **Type Safety**: Full TypeScript support
- **Database Ready**: SQLite with Drizzle ORM for data persistence
- **Authentication**: JWT-based authentication system
- **Validation**: Request/Response validation with Zod
- **API Documentation**: Auto-generated OpenAPI/Swagger documentation
- **Modern Stack**: React 19, Vite, and Tailwind CSS for the admin interface

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- Bun (recommended) or npm
- Cloudflare Wrangler CLI
- Cloudflare account (for deployment)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/hasdev-api-gateway.git
   cd hasdev-api-gateway
   ```

2. Install dependencies:
   ```bash
   bun install
   # or
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env.local
   cp wrangler.example.jsonc wrangler.local.jsonc
   ```

4. Update the configuration files with your local settings.

### Development

Start the development server:

```bash
bun run dev
```

### Database Management

- Run migrations locally:
  ```bash
  bun run db:migrate:local
  ```

- Open database studio:
  ```bash
  bun run db:studio:local
  ```

## 🛠️ Scripts

- `dev`: Start development server
- `build`: Build for production
- `preview`: Preview production build locally
- `deploy`: Deploy to Cloudflare Workers
- `db:migrate:local`: Run database migrations locally
- `db:migrate:prod`: Run database migrations in production
- `db:studio:local`: Open database studio for local development
- `db:studio:prod`: Open database studio for production

## 📝 API Documentation

Once the server is running, access the interactive API documentation at:

```
http://localhost:5173/docs
```

### Set Cloudflare token

| Token name | Permissions | Resources | Permissions |
| --- | --- | --- | --- |
| hasdev api gateway | Edit | Account | AutoRAG |
|  |  | Account | Workers AI |
|  |  | Account | Vectorize |
|  |  | Account | D1 |
|  |  | Account | Pub/Sub |
|  |  | Account | Workers R2 Storage |
|  |  | Account | Workers KV Storage |
|  |  | Account | Workers Scripts |
|  | Read | User | User Details |

## 🤝 Contributing

Contributions are welcome! Please read our [contributing guidelines](CONTRIBUTING.md) to get started.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
