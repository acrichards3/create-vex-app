import { tryCatchAsync } from "@vex-app/lib";
import { z } from "zod";
import { env } from "../env/env";

const errorResponseSchema = z.object({
  message: z.unknown().optional(),
});

const CSRF_COOKIE_NAMES = ["csrf-token", "XSRF-TOKEN", "_csrf", "csrfToken"];
const MUTATION_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

const getCookie = (name: string): string => {
  let value = "";
  const rows = document.cookie.split("; ");
  const row = rows.find((r) => r.startsWith(`${name}=`));
  if (row != null) {
    const eq = row.indexOf("=");
    if (eq >= 0) {
      value = row.slice(eq + 1);
    }
  }
  return value;
};

const getCsrfToken = (): string => {
  for (const cookieName of CSRF_COOKIE_NAMES) {
    const raw = getCookie(cookieName);
    if (raw !== "") {
      return decodeURIComponent(raw);
    }
  }
  return "";
};

const buildHeaders = (init: RequestInit | undefined, method: string): Headers => {
  const headers = new Headers(init?.headers);
  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (MUTATION_METHODS.has(method)) {
    const token = getCsrfToken();
    if (token !== "" && !headers.has("X-CSRF-Token")) {
      headers.set("X-CSRF-Token", token);
    }
  }

  return headers;
};

const parseErrorMessage = async (response: Response, isJson: boolean): Promise<string> => {
  const [body] = isJson ? await tryCatchAsync<unknown>(() => response.json()) : [null];
  const parsed = errorResponseSchema.safeParse(body);
  if (parsed.success && parsed.data.message != null) {
    return String(parsed.data.message);
  }
  return response.statusText;
};

export const apiFetch = async (path: string, init?: RequestInit): Promise<unknown> => {
  const url = `${env.VITE_BACKEND_URL}${path}`;
  const method = (init?.method ?? "GET").toUpperCase();
  const headers = buildHeaders(init, method);

  const response = await fetch(url, {
    credentials: "include",
    headers,
    ...init,
  });

  const contentType = response.headers.get("content-type") ?? "";
  const isJson = contentType.includes("application/json");

  if (!response.ok) {
    const errorMessage = await parseErrorMessage(response, isJson);
    throw new Error(`Request failed ${String(response.status)}: ${errorMessage}`);
  }

  if (!isJson) {
    return null;
  }

  return response.json();
};
