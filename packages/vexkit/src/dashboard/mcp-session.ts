import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { tryCatch, tryCatchAsync } from "@vex-app/lib";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

type McpToolShape = {
  description?: string;
  inputSchema: Record<string, unknown>;
  name: string;
};

function isMcpToolShape(v: unknown): v is McpToolShape {
  if (!isRecord(v)) {
    return false;
  }
  if (typeof v.name !== "string") {
    return false;
  }
  const schema = v.inputSchema;
  if (!isRecord(schema)) {
    return false;
  }
  return true;
}

let projectRootForMcp = "";
let mcpClient: Client | null = null;
let mcpConnectPromise: Promise<Client | null> | null = null;

export function setMcpProjectRootForSession(path: string): void {
  projectRootForMcp = path;
}

function parseMcpCommandFlat(): string[] {
  const raw = Bun.env.VEXKIT_MCP_COMMAND_JSON;
  if (raw == null) {
    return [];
  }
  if (raw.trim() === "") {
    return [];
  }
  const [parsed, err] = tryCatch((): unknown => JSON.parse(raw));
  if (err != null) {
    return [];
  }
  if (!Array.isArray(parsed)) {
    return [];
  }
  if (parsed.length === 0) {
    return [];
  }
  const cmd0 = parsed[0];
  if (typeof cmd0 !== "string" || cmd0.length === 0) {
    return [];
  }
  const rest = parsed.slice(1);
  for (const p of rest) {
    if (typeof p !== "string") {
      return [];
    }
  }
  return [cmd0, ...rest];
}

export function isMcpConfiguredInEnv(): boolean {
  return parseMcpCommandFlat().length > 0;
}

export async function getMcpClient(): Promise<Client | null> {
  const flat = parseMcpCommandFlat();
  if (flat.length === 0) {
    return null;
  }
  if (mcpClient != null) {
    return mcpClient;
  }
  if (mcpConnectPromise != null) {
    return mcpConnectPromise;
  }
  mcpConnectPromise = (async () => {
    const command = flat[0];
    const args = flat.slice(1);
    const transport = new StdioClientTransport({
      args,
      command,
      cwd: projectRootForMcp.length > 0 ? projectRootForMcp : undefined,
    });
    const client = new Client({ name: "vexkit-dashboard", version: "0.0.0" });
    const [, connectErr] = await tryCatchAsync(async () => {
      await client.connect(transport);
    });
    if (connectErr != null) {
      mcpConnectPromise = null;
      return null;
    }
    mcpClient = client;
    return client;
  })();
  return mcpConnectPromise;
}

export async function listMcpTools(): Promise<McpToolShape[]> {
  const client = await getMcpClient();
  if (client == null) {
    return [];
  }
  const [res, err] = await tryCatchAsync(async () => client.listTools());
  if (err != null) {
    return [];
  }
  return res.tools.filter(isMcpToolShape);
}

export async function callMcpTool(input: { argumentsJson: string; name: string }): Promise<string> {
  const client = await getMcpClient();
  if (client == null) {
    return "MCP is not connected.";
  }
  const [argsParsed, argsErr] = tryCatch((): unknown => JSON.parse(input.argumentsJson));
  if (argsErr != null) {
    return "Invalid tool arguments JSON.";
  }
  const argsObj = isRecord(argsParsed) ? argsParsed : {};
  const [result, callErr] = await tryCatchAsync(async () => client.callTool({ arguments: argsObj, name: input.name }));
  if (callErr != null) {
    return `Tool error: ${callErr.message}`;
  }
  const parts = result.content;
  if (!Array.isArray(parts)) {
    return "";
  }
  const texts = parts
    .filter((p): p is { type: "text"; text: string } => p.type === "text" && typeof p.text === "string")
    .map((p) => p.text);
  return texts.join("\n");
}

export function mcpToolsToOpenAiShapes(tools: McpToolShape[]): Array<{
  function: { description?: string; name: string; parameters: Record<string, unknown> };
  type: "function";
}> {
  return tools.map((t) => {
    const params = { ...t.inputSchema };
    return {
      function: {
        description: t.description,
        name: t.name,
        parameters: params,
      },
      type: "function" as const,
    };
  });
}
