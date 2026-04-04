import { mkdirSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const RULE_FILENAME = ".cursor/rules/vex-workflow.mdc";

function rulePath(workspaceRoot: string): string {
  return join(workspaceRoot, RULE_FILENAME);
}

const STEP_RULES: readonly string[] = [
  describeStepRule(),
  specStepRule(),
  approveStepRule(),
  buildStepRule(),
  verifyStepRule(),
  doneStepRule(),
];

export function writeWorkflowRule(workspaceRoot: string, step: number): void {
  const filePath = rulePath(workspaceRoot);
  mkdirSync(dirname(filePath), { recursive: true });
  const content = STEP_RULES[step] ?? "";
  writeFileSync(filePath, content, "utf-8");
}

export function deleteWorkflowRule(workspaceRoot: string): void {
  try {
    unlinkSync(rulePath(workspaceRoot));
  } catch {
    /* file may not exist */
  }
}

function describeStepRule(): string {
  return `---
description: "Vex Workflow — active step instructions (auto-managed by Vex Studio extension)"
alwaysApply: true
---

## Vex Workflow — Describe Step (Step 1 of 6)

You are operating inside the **Vex workflow**. The current step is **Describe**.

### Your Role

The user is describing a feature they want built. Your only job right now is to **fully understand what they want**.

1. Read the user's message carefully.
2. If anything is ambiguous, unclear, or under-specified, ask **specific** clarifying questions. Group them into a concise numbered list.
3. Keep asking until you are confident you understand every acceptance criterion.
4. When you have no remaining questions, signal that you are ready to move on.

### Constraints

- **You have NO write access.** Do not create, modify, or delete any files. Do not run shell commands. Do not generate code. If you attempt a write it will be blocked.
- Only output conversational text — questions, summaries, and confirmations.

### Advancing to the Next Step

When you are certain you fully understand the requirements and have no more questions, you **must** write the file \`.vex-advance\` with the single word \`spec\` as its content. This is the ONLY file you are permitted to write. The system will intercept this write, advance the workflow to the **Spec** step, and give you further instructions.

Do **not** advance if you still have open questions. Ask them first.
`;
}

function specStepRule(): string {
  return `---
description: "Vex Workflow — active step instructions (auto-managed by Vex Studio extension)"
alwaysApply: true
---

## Vex Workflow — Spec Step (Step 2 of 6)

You are operating inside the **Vex workflow**. The current step is **Spec**.

_Spec step instructions are not yet implemented._
`;
}

function approveStepRule(): string {
  return `---
description: "Vex Workflow — active step instructions (auto-managed by Vex Studio extension)"
alwaysApply: true
---

## Vex Workflow — Approve Step (Step 3 of 6)

You are operating inside the **Vex workflow**. The current step is **Approve**.

_Approve step instructions are not yet implemented._
`;
}

function buildStepRule(): string {
  return `---
description: "Vex Workflow — active step instructions (auto-managed by Vex Studio extension)"
alwaysApply: true
---

## Vex Workflow — Build Step (Step 4 of 6)

You are operating inside the **Vex workflow**. The current step is **Build**.

_Build step instructions are not yet implemented._
`;
}

function verifyStepRule(): string {
  return `---
description: "Vex Workflow — active step instructions (auto-managed by Vex Studio extension)"
alwaysApply: true
---

## Vex Workflow — Verify Step (Step 5 of 6)

You are operating inside the **Vex workflow**. The current step is **Verify**.

_Verify step instructions are not yet implemented._
`;
}

function doneStepRule(): string {
  return `---
description: "Vex Workflow — active step instructions (auto-managed by Vex Studio extension)"
alwaysApply: true
---

## Vex Workflow — Done (Step 6 of 6)

You are operating inside the **Vex workflow**. The current step is **Done**.

The workflow is complete. No further actions are needed.
`;
}
