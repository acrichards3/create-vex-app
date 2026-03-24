import { tryCatch, tryCatchAsync } from "@vex-app/lib";

export type NdjsonChatEvent = { message: string; type: "error" } | { text: string; type: "delta" } | { type: "done" };

export type OpenAiChatMessage =
  | {
      content: string | null;
      role: "assistant";
      tool_calls?: OpenAiToolCall[];
    }
  | { content: string; role: "system" | "user" }
  | { content: string; role: "tool"; tool_call_id: string };

export type OpenAiToolCall = {
  function: { arguments: string; name: string };
  id: string;
  type: "function";
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function readChatEnv(): { apiKey: string | null; baseUrl: string; model: string } {
  const apiKey = Bun.env.VEXKIT_CHAT_API_KEY ?? null;
  const baseUrl = Bun.env.VEXKIT_CHAT_BASE_URL ?? "https://api.openai.com/v1";
  const model = Bun.env.VEXKIT_CHAT_MODEL ?? "gpt-4o-mini";
  return { apiKey, baseUrl, model };
}

export function getAssistantChatEnv(): { baseUrl: string; hasApiKey: boolean; model: string } {
  const { apiKey, baseUrl, model } = readChatEnv();
  return { baseUrl, hasApiKey: apiKey != null && apiKey.length > 0, model };
}

function parseToolCallsFromMessage(msg: Record<string, unknown>): OpenAiToolCall[] {
  const raw = msg.tool_calls;
  if (!Array.isArray(raw)) {
    return [];
  }
  const out: OpenAiToolCall[] = [];
  for (const item of raw) {
    if (!isRecord(item)) {
      return [];
    }
    if (item.type !== "function") {
      return [];
    }
    const id = item.id;
    const fn = item.function;
    if (typeof id !== "string" || !isRecord(fn)) {
      return [];
    }
    const name = fn.name;
    const argStr = fn.arguments;
    if (typeof name !== "string" || typeof argStr !== "string") {
      return [];
    }
    out.push({
      function: { arguments: argStr, name },
      id,
      type: "function",
    });
  }
  return out;
}

type AssistantExtract = { error: string | null; message: OpenAiChatMessage | null };

function buildAssistantMessageFromApiMessage(message: Record<string, unknown>): AssistantExtract {
  const role = message.role;
  if (role !== "assistant") {
    return { error: "Unexpected assistant role.", message: null };
  }
  const contentVal = message.content;
  const content = typeof contentVal === "string" ? contentVal : null;
  const toolCallsRaw = message.tool_calls;
  if (Array.isArray(toolCallsRaw) && toolCallsRaw.length > 0) {
    const toolCalls = parseToolCallsFromMessage(message);
    if (toolCalls.length === 0) {
      return { error: "Invalid tool_calls in assistant response.", message: null };
    }
    return {
      error: null,
      message: { content, role: "assistant", tool_calls: toolCalls },
    };
  }
  if (content == null) {
    return { error: "Empty assistant response.", message: null };
  }
  return { error: null, message: { content, role: "assistant" } };
}

function extractAssistantFromCompletionData(data: unknown): AssistantExtract {
  if (!isRecord(data)) {
    return { error: "Invalid response from chat API.", message: null };
  }
  const choices = data.choices;
  if (!Array.isArray(choices) || choices.length === 0) {
    return { error: "No completion choices returned.", message: null };
  }
  const first = choices[0];
  if (!isRecord(first)) {
    return { error: "Invalid completion shape.", message: null };
  }
  const message = first.message;
  if (!isRecord(message)) {
    return { error: "Invalid completion message.", message: null };
  }
  return buildAssistantMessageFromApiMessage(message);
}

export async function completeChatNonStreaming(input: {
  messages: OpenAiChatMessage[];
  tools?: Array<{
    function: { description?: string; name: string; parameters: Record<string, unknown> };
    type: "function";
  }>;
}): Promise<{ assistantMessage: OpenAiChatMessage } | { error: string }> {
  const { apiKey, baseUrl, model } = readChatEnv();
  if (apiKey == null || apiKey.length === 0) {
    return { error: "Chat is not configured. Set VEXKIT_CHAT_API_KEY." };
  }
  const body: Record<string, unknown> = {
    messages: input.messages,
    model,
    stream: false,
  };
  if (input.tools != null && input.tools.length > 0) {
    body.tools = input.tools;
  }
  const [res, fetchErr] = await tryCatchAsync(async () =>
    fetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
      body: JSON.stringify(body),
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      method: "POST",
    }),
  );
  if (fetchErr != null) {
    return { error: "Request to chat API failed." };
  }
  if (!res.ok) {
    const errText = await res.text();
    return { error: errText.length > 0 ? errText : `Chat API error (${String(res.status)})` };
  }
  const [data, jsonErr] = await tryCatchAsync(async () => res.json());
  if (jsonErr != null) {
    return { error: "Invalid response from chat API." };
  }
  const extracted = extractAssistantFromCompletionData(data);
  if (extracted.error != null) {
    return { error: extracted.error };
  }
  if (extracted.message == null) {
    return { error: "Invalid response from chat API." };
  }
  return { assistantMessage: extracted.message };
}

export async function streamChatCompletion(input: {
  messages: OpenAiChatMessage[];
}): Promise<ReadableStream<Uint8Array> | { error: string }> {
  const { apiKey, baseUrl, model } = readChatEnv();
  if (apiKey == null || apiKey.length === 0) {
    return { error: "Chat is not configured. Set VEXKIT_CHAT_API_KEY." };
  }
  const body = {
    messages: input.messages,
    model,
    stream: true,
  };
  const [res, fetchErr] = await tryCatchAsync(async () =>
    fetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
      body: JSON.stringify(body),
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      method: "POST",
    }),
  );
  if (fetchErr != null) {
    return { error: "Request to chat API failed." };
  }
  if (!res.ok) {
    const errText = await res.text();
    return { error: errText.length > 0 ? errText : `Chat API error (${String(res.status)})` };
  }
  if (res.body == null) {
    return { error: "Empty response body." };
  }
  return res.body;
}

export function ndjsonLine(event: NdjsonChatEvent): string {
  return `${JSON.stringify(event)}\n`;
}

function encodeDeltaLine(enc: TextEncoder, token: string): Uint8Array {
  return enc.encode(ndjsonLine({ text: token, type: "delta" }));
}

function processSseDataLine(
  enc: TextEncoder,
  line: string,
  controller: ReadableStreamDefaultController<Uint8Array>,
): void {
  const t = line.trim();
  if (t === "" || t === "data: [DONE]") {
    return;
  }
  if (!t.startsWith("data: ")) {
    return;
  }
  const jsonStr = t.slice(6);
  const [parsed, err] = tryCatch((): unknown => JSON.parse(jsonStr));
  if (err != null || !isRecord(parsed)) {
    return;
  }
  const choices = parsed.choices;
  if (!Array.isArray(choices) || choices.length === 0) {
    return;
  }
  const ch0 = choices[0];
  if (!isRecord(ch0)) {
    return;
  }
  const delta = ch0.delta;
  if (!isRecord(delta)) {
    return;
  }
  const token = delta.content;
  if (typeof token === "string" && token.length > 0) {
    controller.enqueue(encodeDeltaLine(enc, token));
  }
}

export function pipeOpenAiSseToNdjson(openAiStream: ReadableStream<Uint8Array>): ReadableStream<Uint8Array> {
  const reader = openAiStream.getReader();
  const dec = new TextDecoder();
  let carry = "";
  const enc = new TextEncoder();
  return new ReadableStream({
    async start(controller) {
      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) {
            break;
          }
          carry += dec.decode(value, { stream: true });
          const parts = carry.split("\n");
          carry = parts.pop() ?? "";
          for (const line of parts) {
            processSseDataLine(enc, line, controller);
          }
        }
      } finally {
        controller.enqueue(enc.encode(ndjsonLine({ type: "done" })));
        controller.close();
      }
    },
  });
}
