import { swaggerUI } from "@hono/swagger-ui";
import { Hono } from "hono";
import { openAPISpecs } from "hono-openapi";
import { getRuntimeKey } from "hono/adapter";
import { cors } from "hono/cors";
import { renderToReadableStream } from "react-dom/server";
import {
  Link,
  ReactRefresh,
  Script,
  ViteClient,
} from "vite-ssr-components/react";
import apiRoutes from "./routes";

const app = new Hono();

// call getRuntimeKey only once server started
const runtimeKey = getRuntimeKey();
console.log(`Runtime key: ${runtimeKey}`);

app.use("*", cors());
// api routes
app.route("/api", apiRoutes);

app.get("/", async (c) => {
  c.header("Content-Type", "text/html");
  return c.body(
    await renderToReadableStream(
      <html>
        <head>
          <ViteClient />
          <ReactRefresh />
          <Script src="/src/client/index.tsx" />
          <Link href="/src/style.css" rel="stylesheet" />
        </head>
        <body>
          <div id="root" />
        </body>
      </html>
    )
  );
});

// Apply the OpenAPI middleware
app.get(
  "/openapi",
  openAPISpecs(app, {
    documentation: {
      info: {
        title: "Hono API",
        version: "1.0.0",
        description: "Greeting API",
      },
      servers: [
        { url: "http://localhost:5173", description: "Local Development" },
        {
          url: "https://api-gateway.hasdev.workers.dev",
          description: "Production",
        },
      ],
    },
  })
);

app.get("/swagger", swaggerUI({ url: "/openapi" }));

export default app;
