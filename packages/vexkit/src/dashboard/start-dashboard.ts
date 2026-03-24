import type { ServerWebSocket } from "bun";
import { join } from "bun:path";
import { parseAndValidateVexDocument } from "../vex/parse-and-validate-vex-document";
import { getAssistantStatusResponse, postAssistantChat, setAssistantProjectContext } from "./assistant-chat-route";
import { buildDashboardFileTree } from "./build-file-tree";
import { startDashboardFileWatch } from "./project-file-watch";
import { resolveSafeVexPath } from "./resolve-safe-vex-path";

const staticDir = join(import.meta.dirname, "static");

function jsonResponse(data: unknown, status: number): Response {
  return new Response(JSON.stringify(data), {
    headers: { "Content-Type": "application/json; charset=utf-8" },
    status,
  });
}

async function serveTree(rootAbs: string): Promise<Response> {
  const tree = await buildDashboardFileTree(rootAbs);
  return jsonResponse({ root: rootAbs, tree }, 200);
}

async function serveDocument(input: { pathParam: string | null; rootAbs: string }): Promise<Response> {
  const { pathParam, rootAbs } = input;
  if (pathParam == null || pathParam === "") {
    return jsonResponse({ message: "Missing path query parameter." }, 400);
  }

  const resolved = await resolveSafeVexPath({ rawRelativePath: pathParam, rootAbs });
  if (resolved.kind === "ok") {
    const source = await Bun.file(resolved.absolutePath).text();
    const result = parseAndValidateVexDocument(source);
    return jsonResponse(result, 200);
  }

  return jsonResponse({ message: resolved.message }, 400);
}

async function serveStatic(relativeName: string, contentType: string): Promise<Response> {
  const fullPath = join(staticDir, relativeName);
  const file = Bun.file(fullPath);
  if (!(await file.exists())) {
    return new Response("Not found", { status: 404 });
  }

  return new Response(file, { headers: { "Content-Type": contentType } });
}

async function routeRequest(input: { req: Request; rootAbs: string }): Promise<Response> {
  const { req, rootAbs } = input;
  const url = new URL(req.url);

  if (url.pathname === "/api/assistant/status") {
    return getAssistantStatusResponse();
  }

  if (url.pathname === "/api/assistant/chat" && req.method === "POST") {
    return postAssistantChat(req);
  }

  if (url.pathname === "/api/tree") {
    return serveTree(rootAbs);
  }

  if (url.pathname === "/api/document") {
    return serveDocument({ pathParam: url.searchParams.get("path"), rootAbs });
  }

  if (url.pathname === "/" || url.pathname === "") {
    return await serveStatic("index.html", "text/html; charset=utf-8");
  }

  if (url.pathname === "/app.js") {
    return await serveStatic("app.js", "application/javascript; charset=utf-8");
  }

  if (url.pathname === "/chat-panel.js") {
    return await serveStatic("chat-panel.js", "application/javascript; charset=utf-8");
  }

  return new Response("Not found", { status: 404 });
}

const dashboardWsClients = new Set<ServerWebSocket>();

function broadcastVexFilesChanged(): void {
  const payload = JSON.stringify({ type: "vexFilesChanged" });
  for (const client of [...dashboardWsClients]) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  }
}

export function startDashboard(input: { cwd: string; port: number }): void {
  const rootAbs = input.cwd;
  setAssistantProjectContext(rootAbs);

  const server = Bun.serve({
    async fetch(req: Request, server: { upgrade: (req: Request) => boolean }): Promise<Response | undefined> {
      const url = new URL(req.url);
      if (url.pathname === "/api/watch") {
        const upgraded = server.upgrade(req);
        if (upgraded) {
          return undefined;
        }
        return new Response("WebSocket upgrade failed", { status: 400 });
      }
      return routeRequest({ req, rootAbs });
    },
    port: input.port,
    websocket: {
      close(ws: ServerWebSocket) {
        dashboardWsClients.delete(ws);
      },
      message() {},
      open(ws: ServerWebSocket) {
        dashboardWsClients.add(ws);
      },
    },
  });

  startDashboardFileWatch({
    debounceMs: 160,
    onDebouncedChange: broadcastVexFilesChanged,
    rootAbs,
  });

  void Bun.write(Bun.stdout, `vexkit dashboard — http://localhost:${String(server.port)}/  (cwd: ${rootAbs})\n`);
}
