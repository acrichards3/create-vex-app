import {
  countLeadingSpaces,
  parseDescribeHeaderFromLine,
  parseListLineParts,
  peekStack,
  popStackForListLine,
  pushError,
} from "./stack-and-lines";
import { processAndLine, processDescribeDeclarationLine, processItLine, processWhenLine } from "./statement-handlers";
import type { ParseContext, ParseError, VexDocument } from "./types";

export function processListLine(input: {
  content: string;
  ctx: ParseContext;
  leadingSpaces: number;
  lineNo: number;
}): void {
  const { content, ctx, leadingSpaces, lineNo } = input;
  const { keyword, label } = parseListLineParts(content);
  if (keyword == null) {
    pushError(ctx, lineNo, 'Expected a line starting with "when:", "and:", or "it:" (case-insensitive).');
    return;
  }

  if (label === "") {
    pushError(ctx, lineNo, "Missing text after the colon; add a non-empty label.");
    return;
  }

  const popped = popStackForListLine(
    ctx.stack,
    leadingSpaces,
    keyword,
    (line, message) => {
      pushError(ctx, line, message);
    },
    lineNo,
  );
  if (!popped) {
    return;
  }

  const { parent } = peekStack(ctx.stack);

  if (keyword === "WHEN") {
    processWhenLine({ ctx, label, leadingSpaces, lineNo, parent });
    return;
  }

  if (keyword === "AND") {
    processAndLine({ ctx, label, leadingSpaces, lineNo, parent });
    return;
  }

  processItLine({ ctx, label, leadingSpaces, lineNo, parent });
}

export function processVexLine(input: { ctx: ParseContext; line: { lineNo: number; rawLine: string } }): void {
  const { ctx, line } = input;
  const { lineNo, rawLine } = line;
  if (rawLine.trim() === "") {
    return;
  }

  if (rawLine.includes("\t")) {
    pushError(ctx, lineNo, "Tabs are not allowed; use spaces for indentation.");
    return;
  }

  const leadingSpaces = countLeadingSpaces(rawLine);
  const content = rawLine.slice(leadingSpaces);

  if (leadingSpaces !== 0 && leadingSpaces % 4 !== 0) {
    pushError(ctx, lineNo, "Indentation must use a multiple of 4 spaces.");
    return;
  }

  const { keyword } = parseListLineParts(content);
  if (keyword != null) {
    if (leadingSpaces === 0) {
      pushError(ctx, lineNo, "when, and, it lines must be indented under a describe block (multiples of 4 spaces).");
      return;
    }

    if (leadingSpaces < 4) {
      pushError(ctx, lineNo, "The first when under a describe must be indented with at least 4 spaces.");
      return;
    }

    processListLine({ content, ctx, leadingSpaces, lineNo });
    return;
  }

  const { label: describeLabel } = parseDescribeHeaderFromLine(content);
  if (describeLabel != null) {
    processDescribeDeclarationLine({ content, ctx, leadingSpaces, lineNo });
    return;
  }

  if (leadingSpaces === 0) {
    pushError(ctx, lineNo, 'Expected a top-level line starting with "describe:".');
    return;
  }

  pushError(
    ctx,
    lineNo,
    'Expected a line starting with "describe:", "when:", "and:", or "it:" (case-insensitive) at the correct indent.',
  );
}

export function parseVexDocument(source: string): {
  document: VexDocument | undefined;
  errors: ParseError[];
  ok: boolean;
} {
  const errors: ParseError[] = [];
  const document: VexDocument = { describes: [] };
  const ctx: ParseContext = { document, errors, stack: [] };

  const lines = source.split(/\r?\n/u);
  let lineNo = 0;

  lines.forEach((rawLine) => {
    lineNo += 1;
    processVexLine({ ctx, line: { lineNo, rawLine } });
  });

  if (document.describes.length === 0 && errors.length === 0) {
    pushError(ctx, 1, 'Expected at least one describe block (a line like "describe: Label").');
  }

  const ok = errors.length === 0;
  const documentOut = ok ? document : undefined;
  return { document: documentOut, errors, ok };
}
