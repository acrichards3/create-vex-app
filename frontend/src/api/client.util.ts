import { z } from "zod";
import { env } from "../env/env";

const errorResponseSchema = z.object({
  message: z.unknown().optional(),
});

function getCookie(name: string): string | undefined {
  return document.cookie
    .split("; ")
    .find((row) => row.startsWith(name + "="))
    ?.split("=")[1];
}

function getCsrfToken(): string | undefined {
  const possibleNames = ["csrf-token", "XSRF-TOKEN", "_csrf", "csrfToken"];
  for (const n of possibleNames) {
    const v = getCookie(n);
    if (v) return decodeURIComponent(v);
  }
  return undefined;
}

export async function apiFetch(path: string, init?: RequestInit): Promise<unknown> {
  const url = `${env.VITE_BACKEND_URL}${path}`;

  const method = (init?.method ?? "GET").toUpperCase();
  const headers = new Headers(init?.headers ?? {});
  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
    const token = getCsrfToken();
    if (token && !headers.has("X-CSRF-Token")) headers.set("X-CSRF-Token", token);
  }

  const response = await fetch(url, {
    credentials: "include",
    headers,
    ...init,
  });

  const contentType = response.headers.get("content-type") ?? "";
  const isJson = contentType.includes("application/json");

  if (!response.ok) {
    const body: unknown = isJson ? await response.json().catch(() => undefined) : undefined;
    const parsed = errorResponseSchema.safeParse(body);
    const errorMessage =
      parsed.success && parsed.data.message != null ? String(parsed.data.message) : response.statusText;
    throw new Error(`Request failed ${response.status}: ${errorMessage}`);
  }

  if (!isJson) {
    console.warn("Response is not JSON");
    return null;
  }

  return await response.json();
}
