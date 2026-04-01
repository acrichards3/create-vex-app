function countLeadingSpaces(rawLine) {
  let n = 0;
  for (let i = 0; i < rawLine.length; i += 1) {
    if (rawLine[i] !== " ") {
      return n;
    }
    n += 1;
  }
  return n;
}

function parseDescribeHeaderFromLine(content) {
  const trimmed = content.trimStart();
  const lower = trimmed.toLowerCase();
  if (!lower.startsWith("describe")) {
    return { label: null };
  }
  const afterKeyword = trimmed.slice(8).trimStart();
  if (!afterKeyword.startsWith(":")) {
    return { label: null };
  }
  const label = afterKeyword.slice(1).trim();
  return { label: label.length > 0 ? label : null };
}

function labelAfterKeywordPrefix(trimmed, keywordLen) {
  const after = trimmed.slice(keywordLen).trimStart();
  if (!after.startsWith(":")) {
    return [false, ""];
  }
  return [true, after.slice(1).trim()];
}

function parseListLineParts(content) {
  const trimmed = content.trimStart();
  const lower = trimmed.toLowerCase();
  if (lower.startsWith("when")) {
    const [ok, label] = labelAfterKeywordPrefix(trimmed, 4);
    if (ok) {
      return { keyword: "WHEN", label };
    }
  }
  if (lower.startsWith("and")) {
    const [ok, label] = labelAfterKeywordPrefix(trimmed, 3);
    if (ok) {
      return { keyword: "AND", label };
    }
  }
  if (lower.startsWith("it")) {
    const [ok, label] = labelAfterKeywordPrefix(trimmed, 2);
    if (ok) {
      return { keyword: "IT", label };
    }
  }
  return { keyword: null, label: "" };
}

function popDeeperThan(stack, leadingSpaces) {
  while (stack.length > 0) {
    const top = stack.at(-1);
    if (top == null) {
      break;
    }
    if (top.indent <= leadingSpaces) {
      break;
    }
    stack.pop();
  }
}

function popSiblingDescribesAtIndent(stack, describeIndent) {
  while (stack.length > 0) {
    const top = stack.at(-1);
    if (top == null) {
      break;
    }
    if (top.indent !== describeIndent) {
      break;
    }
    if (top.kind !== "describe") {
      break;
    }
    stack.pop();
  }
}

function popWhenSiblingsAtIndent(stack, whenIndent) {
  while (stack.length > 0) {
    const top = stack.at(-1);
    if (top == null) {
      break;
    }
    if (top.indent !== whenIndent) {
      break;
    }
    if (top.kind !== "when") {
      break;
    }
    stack.pop();
  }
}

function popCompletedListSiblingsAtIndent(stack, leadingSpaces, onError, lineNo) {
  while (stack.length > 0) {
    const top = stack.at(-1);
    if (top == null) {
      break;
    }
    if (top.indent !== leadingSpaces) {
      break;
    }
    if (top.kind === "it") {
      stack.pop();
      continue;
    }
    if (top.kind === "and") {
      if (top.node.child == null) {
        onError(lineNo, "Complete this AND with a nested AND or IT before a sibling branch at the same indent.");
        return false;
      }
      stack.pop();
      continue;
    }
    break;
  }
  return true;
}

function popStackForListLine(stack, leadingSpaces, keyword, onError, lineNo) {
  popDeeperThan(stack, leadingSpaces);
  if (keyword === "WHEN") {
    popWhenSiblingsAtIndent(stack, leadingSpaces);
    return true;
  }
  return popCompletedListSiblingsAtIndent(stack, leadingSpaces, onError, lineNo);
}

function peekStack(stack) {
  const parent = stack.at(-1);
  if (parent == null) {
    return { parent: null };
  }
  return { parent };
}

function pushError(errors, line, message) {
  errors.push({ line, message });
}

function processDescribeDeclarationLine(input) {
  const { content, ctx, leadingSpaces, lineNo } = input;
  const { label } = parseDescribeHeaderFromLine(content);
  if (label == null) {
    pushError(ctx.errors, lineNo, 'Expected a line like "describe: Label" (describe may be upper or lower case).');
    return;
  }

  popDeeperThan(ctx.stack, leadingSpaces);
  popSiblingDescribesAtIndent(ctx.stack, leadingSpaces);

  const block = { label, line: lineNo, nestedDescribes: [], whens: [] };

  if (leadingSpaces === 0) {
    ctx.document.describes.push(block);
    ctx.stack.length = 0;
    ctx.stack.push({ indent: 0, kind: "describe", node: block });
    return;
  }

  const { parent } = peekStack(ctx.stack);
  if (parent == null || parent.kind !== "describe") {
    pushError(ctx.errors, lineNo, "Nested describe must be indented under a describe block.");
    return;
  }

  if (leadingSpaces !== parent.indent + 4) {
    pushError(ctx.errors, lineNo, "describe must be indented one level (4 spaces) deeper than its parent describe.");
    return;
  }

  parent.node.nestedDescribes.push(block);
  ctx.stack.push({ indent: leadingSpaces, kind: "describe", node: block });
}

function processWhenLine(input) {
  const { ctx, label, leadingSpaces, lineNo, parent } = input;
  if (parent == null || parent.kind !== "describe") {
    pushError(
      ctx.errors,
      lineNo,
      "when must appear directly under a describe block (4 spaces under the describe line).",
    );
    return;
  }

  if (leadingSpaces !== parent.indent + 4) {
    pushError(ctx.errors, lineNo, "when must be indented 4 spaces under its parent describe.");
    return;
  }

  const whenNode = { branches: [], label, line: lineNo };
  parent.node.whens.push(whenNode);
  ctx.stack.push({ indent: leadingSpaces, kind: "when", node: whenNode });
}

function processAndLine(input) {
  const { ctx, label, leadingSpaces, lineNo, parent } = input;
  if (parent == null) {
    pushError(ctx.errors, lineNo, "and must appear under a when or another and.");
    return;
  }

  if (parent.kind === "describe" || parent.kind === "it") {
    pushError(ctx.errors, lineNo, "and must appear under a when or another and.");
    return;
  }

  if (leadingSpaces !== parent.indent + 4) {
    pushError(ctx.errors, lineNo, "and must be indented one level (4 spaces) deeper than its parent.");
    return;
  }

  if (parent.kind === "when") {
    const and = { child: undefined, kind: "and", label, line: lineNo };
    parent.node.branches.push(and);
    ctx.stack.push({ indent: leadingSpaces, kind: "and", node: and });
    return;
  }

  if (parent.node.child != null) {
    pushError(ctx.errors, lineNo, "This and already has a child; use a nested and for deeper branches.");
    return;
  }

  const and = { child: undefined, kind: "and", label, line: lineNo };
  parent.node.child = and;
  ctx.stack.push({ indent: leadingSpaces, kind: "and", node: and });
}

function processItLine(input) {
  const { ctx, label, leadingSpaces, lineNo, parent } = input;
  const it = { kind: "it", label, line: lineNo };

  if (parent == null) {
    pushError(ctx.errors, lineNo, "it must appear under a when or and.");
    return;
  }

  if (leadingSpaces !== parent.indent + 4) {
    pushError(ctx.errors, lineNo, "it must be indented one level (4 spaces) deeper than its parent.");
    return;
  }

  if (parent.kind === "describe") {
    pushError(ctx.errors, lineNo, "it must appear under a when or and, not directly under a describe.");
    return;
  }

  if (parent.kind === "when") {
    parent.node.branches.push(it);
    ctx.stack.push({ indent: leadingSpaces, kind: "it", node: it });
    return;
  }

  if (parent.kind === "and") {
    if (parent.node.child != null) {
      pushError(ctx.errors, lineNo, "This and already has a child.");
      return;
    }

    parent.node.child = it;
    ctx.stack.push({ indent: leadingSpaces, kind: "it", node: it });
    return;
  }

  pushError(ctx.errors, lineNo, "it cannot appear nested under another it.");
}

function processListLine(input) {
  const { content, ctx, leadingSpaces, lineNo } = input;
  const { keyword, label } = parseListLineParts(content);
  if (keyword == null) {
    pushError(ctx.errors, lineNo, 'Expected a line starting with "when:", "and:", or "it:" (case-insensitive).');
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

function processVexLine(input) {
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

  if (leadingSpaces !== 0 && leadingSpaces % 4 !== 0) {
    pushError(ctx.errors, lineNo, "Indentation must use a multiple of 4 spaces.");
    return;
  }

  const { keyword } = parseListLineParts(content);
  if (keyword != null) {
    if (leadingSpaces === 0) {
      pushError(
        ctx.errors,
        lineNo,
        "when, and, it lines must be indented under a describe block (multiples of 4 spaces).",
      );
      return;
    }

    if (leadingSpaces < 4) {
      pushError(ctx.errors, lineNo, "The first when under a describe must be indented with at least 4 spaces.");
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
    pushError(ctx.errors, lineNo, 'Expected a top-level line starting with "describe:".');
    return;
  }

  pushError(
    ctx.errors,
    lineNo,
    'Expected a line starting with "describe:", "when:", "and:", or "it:" (case-insensitive) at the correct indent.',
  );
}

function parseVexDocument(source) {
  const errors = [];
  const document = { describes: [] };
  const ctx = { document, errors, stack: [] };

  const lines = source.split(/\r?\n/);
  let lineNo = 0;

  for (const rawLine of lines) {
    lineNo += 1;
    processVexLine({ ctx, line: { lineNo, rawLine } });
  }

  if (document.describes.length === 0 && errors.length === 0) {
    pushError(errors, 1, 'Expected at least one describe block (a line like "describe: Label").');
  }

  const ok = errors.length === 0;
  const documentOut = ok ? document : undefined;
  return { document: documentOut, errors, ok };
}

function countItNodes(body) {
  if (body == null) {
    return 0;
  }
  if (body.kind === "it") {
    return 1;
  }
  return countItNodes(body.child);
}

function collectStructureErrors(body, path) {
  const out = [];
  if (body == null) {
    out.push({ line: 0, message: `${path}: missing body (add an it or and chain).` });
    return out;
  }
  if (body.kind === "it") {
    return out;
  }
  if (body.child == null) {
    out.push({
      line: body.line,
      message: `${path} (and "${body.label}"): missing child; add a nested and or an it.`,
    });
    return out;
  }
  return out.concat(collectStructureErrors(body.child, `${path} > and "${body.label}"`));
}

function validateWhenBranch(pathPrefix, when) {
  const path = `${pathPrefix} > when "${when.label}"`;
  const branchErrors = [];

  if (when.branches.length === 0) {
    branchErrors.push({ line: when.line, message: `${path}: add at least one branch (an it or and chain).` });
    return branchErrors;
  }

  const directIts = when.branches.filter((b) => b.kind === "it");
  if (directIts.length > 1) {
    const extra = directIts[1];
    branchErrors.push({
      line: extra.line,
      message: `${path}: a when may have at most one it at this level; use and for additional branches.`,
    });
  }

  for (let i = 0; i < when.branches.length; i += 1) {
    const branch = when.branches[i];
    const branchPath = `${path} > branch ${String(i + 1)}`;
    const structural = collectStructureErrors(branch, branchPath);
    branchErrors.push(...structural);

    const itCount = countItNodes(branch);
    const skipZero = itCount === 0 && structural.length > 0;
    if (skipZero || itCount === 1) {
      continue;
    }

    branchErrors.push({
      line: branch.line,
      message: `${branchPath}: expected exactly one it (found ${String(itCount)}).`,
    });
  }

  return branchErrors;
}

function collectDuplicateLabelsInSiblings(blocks, path) {
  const seen = new Set();
  const out = [];
  for (const b of blocks) {
    if (seen.has(b.label)) {
      out.push({ line: b.line, message: `${path}: duplicate describe label "${b.label}" among siblings.` });
    }
    seen.add(b.label);
  }
  return out;
}

function validateDescribeBlock(block, pathPrefix) {
  const errors = [];
  const path = `${pathPrefix}describe "${block.label}"`;

  errors.push(...collectDuplicateLabelsInSiblings(block.nestedDescribes, path));

  for (const nested of block.nestedDescribes) {
    errors.push(...validateDescribeBlock(nested, `${path} > `));
  }

  for (const when of block.whens) {
    errors.push(...validateWhenBranch(path, when));
  }

  return errors;
}

function validateVexDocument(document) {
  const errors = [];

  errors.push(...collectDuplicateLabelsInSiblings(document.describes, "Document"));

  for (const root of document.describes) {
    errors.push(...validateDescribeBlock(root, ""));
  }

  return errors;
}

function parseAndValidateVexDocument(source) {
  const parsed = parseVexDocument(source);
  if (!parsed.ok) {
    return { document: undefined, errors: parsed.errors, ok: false };
  }

  const doc = parsed.document;
  if (doc == null) {
    return {
      document: undefined,
      errors: [{ line: 0, message: "Internal parse state: document missing when ok is true." }],
      ok: false,
    };
  }

  const structuralErrors = validateVexDocument(doc);
  if (structuralErrors.length > 0) {
    return { document: undefined, errors: structuralErrors, ok: false };
  }

  return { document: doc, errors: [], ok: true };
}

module.exports = {
  parseAndValidateVexDocument,
  parseVexDocument,
  validateVexDocument,
};
