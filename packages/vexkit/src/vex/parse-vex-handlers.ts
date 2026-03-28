import type { VexAnd, VexDocument, VexFunction, VexIt, VexParseError, VexWhen } from "./ast";
import { countLeadingSpaces, parseFunctionNameFromLine, parseListLineParts } from "./parse-vex-line";
import type { StackEntry } from "./parse-vex-stack";
import { peekStack, popStackForListLine } from "./parse-vex-stack";

export type ParseContext = {
  document: VexDocument;
  errors: VexParseError[];
  stack: StackEntry[];
};

function pushError(errors: VexParseError[], line: number, message: string): void {
  errors.push({ line, message });
}

function processFunctionDeclarationLine(input: {
  content: string;
  ctx: ParseContext;
  leadingSpaces: number;
  lineNo: number;
}): void {
  const { content, ctx, leadingSpaces, lineNo } = input;
  if (leadingSpaces !== 0) {
    pushError(ctx.errors, lineNo, "Function names must start at column 0.");
    return;
  }

  const { name } = parseFunctionNameFromLine(content);
  if (name == null) {
    pushError(ctx.errors, lineNo, 'Expected a function line like "myFunction:".');
    return;
  }

  ctx.stack.length = 0;
  const fn: VexFunction = { line: lineNo, name, whens: [] };
  ctx.document.functions.push(fn);
  ctx.stack.push({ indent: 0, kind: "function", node: fn });
}

function processWhenLine(input: {
  ctx: ParseContext;
  label: string;
  leadingSpaces: number;
  lineNo: number;
  parent: StackEntry | null;
}): void {
  const { ctx, label, leadingSpaces, lineNo, parent } = input;
  if (parent == null || parent.kind !== "function") {
    pushError(ctx.errors, lineNo, 'WHEN must appear directly under a function (indent 2 spaces under "name:").');
    return;
  }

  if (leadingSpaces !== 2) {
    pushError(ctx.errors, lineNo, "WHEN is only allowed at the first list level under a function (indent 2).");
    return;
  }

  const whenNode: VexWhen = { branches: [], label, line: lineNo };
  parent.node.whens.push(whenNode);
  ctx.stack.push({ indent: leadingSpaces, kind: "when", node: whenNode });
}

function processAndLine(input: {
  ctx: ParseContext;
  label: string;
  leadingSpaces: number;
  lineNo: number;
  parent: StackEntry | null;
}): void {
  const { ctx, label, leadingSpaces, lineNo, parent } = input;
  if (parent == null) {
    pushError(ctx.errors, lineNo, "AND must appear under a WHEN or another AND.");
    return;
  }

  if (parent.kind === "function" || parent.kind === "it") {
    pushError(ctx.errors, lineNo, "AND must appear under a WHEN or another AND.");
    return;
  }

  if (parent.kind === "when") {
    const and: VexAnd = { child: undefined, kind: "and", label, line: lineNo };
    parent.node.branches.push(and);
    ctx.stack.push({ indent: leadingSpaces, kind: "and", node: and });
    return;
  }

  if (parent.node.child != null) {
    pushError(ctx.errors, lineNo, "This AND already has a child; use a nested AND for deeper branches.");
    return;
  }

  const and: VexAnd = { child: undefined, kind: "and", label, line: lineNo };
  parent.node.child = and;
  ctx.stack.push({ indent: leadingSpaces, kind: "and", node: and });
}

function processItLine(input: {
  ctx: ParseContext;
  label: string;
  leadingSpaces: number;
  lineNo: number;
  parent: StackEntry | null;
}): void {
  const { ctx, label, leadingSpaces, lineNo, parent } = input;
  const it: VexIt = { kind: "it", label, line: lineNo };

  if (parent == null) {
    pushError(ctx.errors, lineNo, "IT must appear under a WHEN or AND.");
    return;
  }

  if (parent.kind === "function") {
    pushError(ctx.errors, lineNo, "IT must appear under a WHEN or AND, not directly under a function.");
    return;
  }

  if (parent.kind === "when") {
    parent.node.branches.push(it);
    ctx.stack.push({ indent: leadingSpaces, kind: "it", node: it });
    return;
  }

  if (parent.kind === "and") {
    if (parent.node.child != null) {
      pushError(ctx.errors, lineNo, "This AND already has a child.");
      return;
    }

    parent.node.child = it;
    ctx.stack.push({ indent: leadingSpaces, kind: "it", node: it });
    return;
  }

  pushError(ctx.errors, lineNo, "IT cannot appear nested under another IT.");
}

function processListLine(input: { content: string; ctx: ParseContext; leadingSpaces: number; lineNo: number }): void {
  const { content, ctx, leadingSpaces, lineNo } = input;
  const { keyword, label } = parseListLineParts(content);
  if (keyword == null) {
    pushError(ctx.errors, lineNo, 'Expected a list item starting with "- WHEN:", "- AND:", or "- IT:".');
    return;
  }

  if (label === "") {
    pushError(ctx.errors, lineNo, "Missing text after the colon; add a non-empty label.");
    return;
  }

  const popped = popStackForListLine(
    ctx.stack,
    leadingSpaces,
    keyword,
    (line, message) => {
      pushError(ctx.errors, line, message);
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
    pushError(ctx.errors, lineNo, "Tabs are not allowed; use spaces for indentation.");
    return;
  }

  const leadingSpaces = countLeadingSpaces(rawLine);
  const content = rawLine.slice(leadingSpaces);

  if (leadingSpaces % 2 !== 0) {
    pushError(ctx.errors, lineNo, "Indentation must use a multiple of 2 spaces.");
    return;
  }

  if (!content.startsWith("-")) {
    processFunctionDeclarationLine({ content, ctx, leadingSpaces, lineNo });
    return;
  }

  processListLine({ content, ctx, leadingSpaces, lineNo });
}
