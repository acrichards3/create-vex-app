import type { ExtensionContext } from "vscode";
import * as vscode from "vscode";
import { buildStepperHtml } from "./stepper-html";
import { createVexTreeEditorProvider } from "./vex-tree-editor-provider";

const VIEW_ID = "vex.panel.stepper";
const VEX_TREE_VIEW_TYPE = "vex.tree";

async function openVexTreeEditorForActiveFile(): Promise<void> {
  const doc = vscode.window.activeTextEditor?.document;
  if (doc == null) {
    await vscode.window.showInformationMessage("Open a .vex file first.");
    return;
  }
  const fsPath = doc.uri.fsPath.toLowerCase();
  const isVex = doc.languageId === "vex" ? true : fsPath.endsWith(".vex");
  if (!isVex) {
    await vscode.window.showInformationMessage("Open a .vex file first.");
    return;
  }
  await vscode.commands.executeCommand("vscode.openWith", doc.uri, VEX_TREE_VIEW_TYPE, {
    viewColumn: vscode.ViewColumn.Active,
  });
}

export function activate(context: ExtensionContext): void {
  const vexTreeProvider = createVexTreeEditorProvider(context);

  context.subscriptions.push(
    vscode.window.registerCustomEditorProvider(VEX_TREE_VIEW_TYPE, vexTreeProvider, {
      supportsMultipleEditorsPerDocument: false,
      webviewOptions: {
        retainContextWhenHidden: false,
      },
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("vex.panel.openEditorVisual", () => {
      return openVexTreeEditorForActiveFile();
    }),
  );

  const provider = {
    resolveWebviewView(webviewView: vscode.WebviewView): void {
      webviewView.webview.options = {
        enableScripts: true,
      };
      webviewView.webview.html = buildStepperHtml();

      webviewView.webview.onDidReceiveMessage((message: { type?: string }) => {
        if (message.type === "openEditorVisual") {
          void openVexTreeEditorForActiveFile();
        }
      });
    },
  };

  context.subscriptions.push(vscode.window.registerWebviewViewProvider(VIEW_ID, provider));
}

export function deactivate(): void {}
