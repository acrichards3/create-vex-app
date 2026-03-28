import type { VexDocument, VexParseResult } from "./ast";
import { parseVexDocument } from "./parse-vex-document";
import { validateVexDocument } from "./validate-vex-document";

export function parseAndValidateVexDocument(source: string): VexParseResult {
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

  const document: VexDocument = doc;
  return { document, errors: [], ok: true };
}
