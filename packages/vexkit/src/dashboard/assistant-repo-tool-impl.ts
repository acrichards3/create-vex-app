import { mkdir, readdir, stat } from "node:fs/promises";
import { dirname } from "bun:path";
import { tryCatchAsync } from "@vex-app/lib";
import {
  joinUnderRoot,
  isPathUnderRoot,
  MAX_LIST_ENTRIES,
  MAX_READ_CHARS,
  MAX_WRITE_CHARS,
  rootRealAndPrefix,
  segmentsInvalid,
  splitPathSegments,
} from "./assistant-repo-path.js";

export async function handleRepoListDir(input: { rawPath: string; rootAbs: string }): Promise<string> {
  const segments = splitPathSegments(input.rawPath === "" ? "" : input.rawPath);
  if (segmentsInvalid(segments)) {
    return "Invalid path.";
  }
  const dirAbs = joinUnderRoot(input.rootAbs, segments);
  const { rootReal, rootWithSeparator } = await rootRealAndPrefix(input.rootAbs);
  const under = await isPathUnderRoot({ absPath: dirAbs, rootReal, rootWithSeparator });
  if (!under) {
    return "Path escapes project root.";
  }
  const [st, stErr] = await tryCatchAsync(async () => stat(dirAbs));
  if (stErr != null) {
    return "Directory not found.";
  }
  if (!st.isDirectory()) {
    return "Not a directory.";
  }
  const [names, rdErr] = await tryCatchAsync(async () => readdir(dirAbs));
  if (rdErr != null) {
    return "Could not read directory.";
  }
  const sorted = [...names].toSorted((a, b) => a.localeCompare(b));
  const limited = sorted.slice(0, MAX_LIST_ENTRIES);
  const suffix = sorted.length > MAX_LIST_ENTRIES ? `\n… and ${String(sorted.length - MAX_LIST_ENTRIES)} more` : "";
  return limited.length === 0 ? "(empty)" : `${limited.join("\n")}${suffix}`;
}

export async function handleRepoReadFile(input: { rawPath: string; rootAbs: string }): Promise<string> {
  const segments = splitPathSegments(input.rawPath);
  if (segments.length === 0 || segmentsInvalid(segments)) {
    return "Invalid path.";
  }
  const fileAbs = joinUnderRoot(input.rootAbs, segments);
  const { rootReal, rootWithSeparator } = await rootRealAndPrefix(input.rootAbs);
  const under = await isPathUnderRoot({ absPath: fileAbs, rootReal, rootWithSeparator });
  if (!under) {
    return "Path escapes project root.";
  }
  const [st, stErr] = await tryCatchAsync(async () => stat(fileAbs));
  if (stErr != null) {
    return "File not found.";
  }
  if (!st.isFile()) {
    return "Not a file.";
  }
  const [text, readErr] = await tryCatchAsync(async () => Bun.file(fileAbs).text());
  if (readErr != null) {
    return "Could not read file.";
  }
  if (text.length > MAX_READ_CHARS) {
    return `File too large to read (${String(text.length)} chars; max ${String(MAX_READ_CHARS)}).`;
  }
  return text;
}

export async function handleRepoWriteFile(input: {
  content: string;
  rawPath: string;
  rootAbs: string;
}): Promise<string> {
  if (input.content.length > MAX_WRITE_CHARS) {
    return `Content too large (max ${String(MAX_WRITE_CHARS)} characters).`;
  }
  const segments = splitPathSegments(input.rawPath);
  if (segments.length === 0 || segmentsInvalid(segments)) {
    return "Invalid path.";
  }
  const fileAbs = joinUnderRoot(input.rootAbs, segments);
  const parentDir = dirname(fileAbs);
  const { rootReal, rootWithSeparator } = await rootRealAndPrefix(input.rootAbs);
  const [, mkdirErr] = await tryCatchAsync(async () => mkdir(parentDir, { recursive: true }));
  if (mkdirErr != null) {
    return "Could not create parent directories.";
  }
  const parentUnder = await isPathUnderRoot({ absPath: parentDir, rootReal, rootWithSeparator });
  if (!parentUnder) {
    return "Path escapes project root.";
  }
  const [, writeErr] = await tryCatchAsync(async () => Bun.write(fileAbs, input.content));
  if (writeErr != null) {
    return "Could not write file.";
  }
  return `Wrote ${String(segments.at(-1) ?? input.rawPath)} (${String(input.content.length)} characters).`;
}

export async function handleRepoSearchReplace(input: {
  new_string: string;
  old_string: string;
  rawPath: string;
  rootAbs: string;
}): Promise<string> {
  const segments = splitPathSegments(input.rawPath);
  if (segments.length === 0 || segmentsInvalid(segments)) {
    return "Invalid path.";
  }
  const fileAbs = joinUnderRoot(input.rootAbs, segments);
  const { rootReal, rootWithSeparator } = await rootRealAndPrefix(input.rootAbs);
  const under = await isPathUnderRoot({ absPath: fileAbs, rootReal, rootWithSeparator });
  if (!under) {
    return "Path escapes project root.";
  }
  const [text, readErr] = await tryCatchAsync(async () => Bun.file(fileAbs).text());
  if (readErr != null) {
    return "Could not read file.";
  }
  if (text.length > MAX_READ_CHARS) {
    return "File too large.";
  }
  const first = text.indexOf(input.old_string);
  if (first === -1) {
    return "old_string not found in file.";
  }
  const second = text.indexOf(input.old_string, first + input.old_string.length);
  if (second !== -1) {
    return "old_string appears more than once; use a longer unique snippet.";
  }
  const next = `${text.slice(0, first)}${input.new_string}${text.slice(first + input.old_string.length)}`;
  if (next.length > MAX_WRITE_CHARS) {
    return "Resulting file would be too large.";
  }
  const [, writeErr] = await tryCatchAsync(async () => Bun.write(fileAbs, next));
  if (writeErr != null) {
    return "Could not write file.";
  }
  return "Replaced one occurrence.";
}
