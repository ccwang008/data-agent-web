import { createServer as createHttpServer } from "node:http";
import { createServer as createViteServer } from "vite";

import { getDatabaseInfo, getState, listStates, removeState, setState } from "./sqlite.mjs";

const port = Number(process.env.PORT ?? 5173);
const vite = await createViteServer({
  server: { middlewareMode: true, hmr: false },
  appType: "spa",
});

function json(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload));
}

async function readJson(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

async function handleApi(req, res) {
  const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);

  if (req.method === "GET" && url.pathname === "/api/sqlite/health") {
    return json(res, 200, { ok: true, database: getDatabaseInfo() });
  }

  if (url.pathname === "/api/sqlite/state" && req.method === "GET") {
    const scope = url.searchParams.get("scope");
    if (!scope) return json(res, 200, { items: listStates() });
    return json(res, 200, { item: getState(scope) });
  }

  if (url.pathname === "/api/sqlite/state" && req.method === "PUT") {
    const body = await readJson(req);
    const scope = typeof body.scope === "string" ? body.scope : "";
    if (!scope || !("value" in body)) return json(res, 400, { error: "scope and value are required" });
    return json(res, 200, { item: setState(scope, body.value, "upsert") });
  }

  if (url.pathname === "/api/sqlite/state" && req.method === "DELETE") {
    const scope = url.searchParams.get("scope");
    if (!scope) return json(res, 400, { error: "scope is required" });
    return json(res, 200, { removed: removeState(scope) });
  }

  return json(res, 404, { error: "API route not found" });
}

const server = createHttpServer(async (req, res) => {
  if (req.url?.startsWith("/api/")) {
    try {
      await handleApi(req, res);
    } catch (error) {
      json(res, 500, { error: error instanceof Error ? error.message : "Unknown server error" });
    }
    return;
  }

  vite.middlewares(req, res, () => {
    res.statusCode = 404;
    res.end("Not found");
  });
});

server.listen(port, "127.0.0.1", () => {
  console.log(`SQLite + Vite development server listening on http://localhost:${port}`);
  console.log(`SQLite database: ${getDatabaseInfo().databasePath}`);
});
