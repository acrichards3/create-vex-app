export function countLeadingSpaces(rawLine: string): number {
  let n = 0;
  for (let i = 0; i < rawLine.length; i += 1) {
    if (rawLine[i] !== " ") {
      return n;
    }

    n += 1;
  }

  return n;
}

export function parseFunctionNameFromLine(content: string): { name: string | null } {
  if (content.startsWith("-")) {
    return { name: null };
  }

  if (!content.endsWith(":")) {
    return { name: null };
  }

  const core = content.slice(0, -1);
  if (core.length === 0) {
    return { name: null };
  }

  for (let i = 0; i < core.length; i += 1) {
    if (core[i] === " " || core[i] === "\t") {
      return { name: null };
    }
  }

  return { name: core };
}

export type ListKeyword = "AND" | "IT" | "WHEN";

export function parseListLineParts(content: string): {
  keyword: ListKeyword | null;
  label: string;
} {
  if (!content.startsWith("-")) {
    return { keyword: null, label: "" };
  }

  const trimmed = content.slice(1).trimStart();
  const pairs: readonly { keyword: ListKeyword; prefix: string }[] = [
    { keyword: "WHEN", prefix: "WHEN:" },
    { keyword: "AND", prefix: "AND:" },
    { keyword: "IT", prefix: "IT:" },
  ];

  for (const { keyword, prefix } of pairs) {
    if (trimmed.startsWith(prefix)) {
      return { keyword, label: trimmed.slice(prefix.length).trim() };
    }
  }

  return { keyword: null, label: "" };
}
