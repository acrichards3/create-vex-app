import { readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export type WorkflowState = {
  activeId: string | null;
  enabled: boolean;
  step: number;
};

const FILENAME = ".vex-workflow";

export function workflowStatePath(workspaceRoot: string): string {
  return join(workspaceRoot, FILENAME);
}

export function writeWorkflowState(workspaceRoot: string, state: WorkflowState): void {
  writeFileSync(workflowStatePath(workspaceRoot), JSON.stringify(state, null, 2), "utf-8");
}

const EMPTY_WORKFLOW: WorkflowState = { activeId: null, enabled: false, step: 0 };

export function readWorkflowState(workspaceRoot: string): WorkflowState {
  const raw = safeReadFile(workflowStatePath(workspaceRoot));
  if (raw.length === 0) {
    return EMPTY_WORKFLOW;
  }
  const parsed: unknown = JSON.parse(raw);
  if (typeof parsed !== "object" || parsed === null) {
    return EMPTY_WORKFLOW;
  }
  const obj = parsed as Record<string, unknown>;
  if (typeof obj["step"] !== "number") {
    return EMPTY_WORKFLOW;
  }
  return {
    activeId: typeof obj["activeId"] === "string" ? obj["activeId"] : null,
    enabled: obj["enabled"] === true,
    step: obj["step"],
  };
}

export function deleteWorkflowState(workspaceRoot: string): void {
  safeUnlink(workflowStatePath(workspaceRoot));
}

function safeReadFile(filePath: string): string {
  try {
    return readFileSync(filePath, "utf-8");
  } catch {
    return "";
  }
}

function safeUnlink(filePath: string): void {
  try {
    unlinkSync(filePath);
  } catch {
    /* file may not exist */
  }
}
