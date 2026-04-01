const path = require("path");
const vscode = require("vscode");
const { getEditorVisualHtml } = require("./get-editor-html.js");
const { parseVexDocument } = require("./vex-parse.js");

const DEBOUNCE_MS = 150;

/**
 * @param {vscode.ExtensionContext} context
 */
function createVexTreeEditorProvider(context) {
  return {
    /**
     * @param {vscode.TextDocument} document
     * @param {vscode.WebviewPanel} webviewPanel
     * @param {vscode.CancellationToken} _token
     */
    resolveCustomTextEditor(document, webviewPanel, _token) {
      const mediaRoot = path.join(context.extensionPath, "media");
      const mediaUri = vscode.Uri.file(mediaRoot);

      webviewPanel.webview.options = {
        enableScripts: true,
        localResourceRoots: [mediaUri],
        retainContextWhenHidden: true,
      };

      const scriptUri = webviewPanel.webview.asWebviewUri(vscode.Uri.file(path.join(mediaRoot, "editor-visual.js")));

      webviewPanel.webview.html = getEditorVisualHtml(webviewPanel.webview, scriptUri);

      /** @type {ReturnType<typeof setTimeout> | undefined} */
      let debounceTimer;

      const pushState = () => {
        const text = document.getText();
        const result = parseVexDocument(text);
        if (!result.ok) {
          webviewPanel.webview.postMessage({
            type: "vexVisual",
            payload: { kind: "parseError", errors: result.errors, fileName: document.fileName },
          });
          return;
        }
        webviewPanel.webview.postMessage({
          type: "vexVisual",
          payload: { kind: "document", document: result.document, fileName: document.fileName },
        });
      };

      const subReady = webviewPanel.webview.onDidReceiveMessage((message) => {
        if (message && message.type === "vexVisualReady") {
          pushState();
        }
      });

      const subDoc = vscode.workspace.onDidChangeTextDocument((e) => {
        if (e.document.uri.toString() !== document.uri.toString()) {
          return;
        }
        if (debounceTimer) {
          clearTimeout(debounceTimer);
        }
        debounceTimer = setTimeout(function () {
          debounceTimer = undefined;
          pushState();
        }, DEBOUNCE_MS);
      });

      webviewPanel.onDidDispose(() => {
        if (debounceTimer) {
          clearTimeout(debounceTimer);
        }
        subReady.dispose();
        subDoc.dispose();
      });
    },
  };
}

module.exports = { createVexTreeEditorProvider };
