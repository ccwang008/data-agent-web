/**
 * Mock API client — swap-point for a real HTTP client later.
 * Features register fixtures via `registerMockRoute`; the rest of the app
 * imports `mockClient` and calls it like a normal HTTP client.
 */

type Method = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
type Handler = (body?: unknown, params?: Record<string, string>) => unknown | Promise<unknown>;

interface RouteKey {
  method: Method;
  path: string;
}

const routes = new Map<string, Handler>();

const keyOf = ({ method, path }: RouteKey) => `${method} ${path}`;

export function registerMockRoute(method: Method, path: string, handler: Handler) {
  routes.set(keyOf({ method, path }), handler);
}

interface MockOptions {
  latencyMs?: number;
  failureRate?: number;
}

const DEFAULT_LATENCY = 220;
const DEFAULT_FAILURE = 0;

function matchPattern(pattern: string, actual: string): Record<string, string> | null {
  const pp = pattern.split("/");
  const ap = actual.split("/");
  if (pp.length !== ap.length) return null;
  const params: Record<string, string> = {};
  for (let i = 0; i < pp.length; i++) {
    if (pp[i].startsWith(":")) {
      params[pp[i].slice(1)] = ap[i];
    } else if (pp[i] !== ap[i]) {
      return null;
    }
  }
  return params;
}

async function dispatch<T>(
  method: Method,
  path: string,
  body?: unknown,
  opts: MockOptions = {},
): Promise<T> {
  const latency = opts.latencyMs ?? DEFAULT_LATENCY;
  const failure = opts.failureRate ?? DEFAULT_FAILURE;

  await new Promise((r) => setTimeout(r, latency));

  if (failure > 0 && Math.random() < failure) {
    throw new Error(`MockClient: simulated failure for ${method} ${path}`);
  }

  const exact = routes.get(keyOf({ method, path }));
  if (exact) {
    const data = await exact(body);
    return data as T;
  }

  // Wildcard / pattern matching (e.g. :id segments)
  for (const [key, handler] of routes) {
    const sp = key.indexOf(" ");
    if (key.slice(0, sp) !== method) continue;
    const routePath = key.slice(sp + 1);
    if (!routePath.includes(":")) continue;
    const params = matchPattern(routePath, path);
    if (params) {
      const data = await handler(body, params);
      return data as T;
    }
  }

  throw new Error(`MockClient: no route registered for ${method} ${path}`);
}

export const mockClient = {
  get: <T>(path: string, opts?: MockOptions) => dispatch<T>("GET", path, undefined, opts),
  post: <T>(path: string, body?: unknown, opts?: MockOptions) =>
    dispatch<T>("POST", path, body, opts),
  put: <T>(path: string, body?: unknown, opts?: MockOptions) =>
    dispatch<T>("PUT", path, body, opts),
  patch: <T>(path: string, body?: unknown, opts?: MockOptions) =>
    dispatch<T>("PATCH", path, body, opts),
  delete: <T>(path: string, opts?: MockOptions) =>
    dispatch<T>("DELETE", path, undefined, opts),
};

export type MockClient = typeof mockClient;
