import * as vscode from "vscode";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function isVexEditLabelRequest(
  value: unknown,
): value is { end: number; start: number; type: "vexEditLabelRequest" } {
  if (!isRecord(value)) {
    return false;
  }
  if (value.type !== "vexEditLabelRequest") {
    return false;
  }
  if (typeof value.start !== "number" || typeof value.end !== "number") {
    return false;
  }
  return value.start <= value.end;
}

export async function applyVexLabelEdit(uri: vscode.Uri, start: number, end: number): Promise<void> {
  const doc = await vscode.workspace.openTextDocument(uri);
  const len = doc.getText().length;
  const rangeOk = start >= 0 && end <= len && start <= end;
  if (!rangeOk) {
    await vscode.window.showErrorMessage("Invalid label range.");
    return;
  }
  const range = new vscode.Range(doc.positionAt(start), doc.positionAt(end));
  const current = doc.getText(range);
  const next = await vscode.window.showInputBox({
    title: "Edit Vex label",
    value: current,
  });
  if (typeof next !== "string") {
    return;
  }
  const edit = new vscode.WorkspaceEdit();
  edit.replace(uri, range, next);
  await vscode.workspace.applyEdit(edit);
}
