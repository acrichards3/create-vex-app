export const VEXKIT_VERSION = "0.0.0" as const;

export { parseAndValidateVexDocument, parseVexDocument, validateVexDocument } from "./vex";
export type { VexAnd, VexBody, VexDocument, VexFunction, VexIt, VexParseError, VexParseResult, VexWhen } from "./vex";
