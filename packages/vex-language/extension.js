const vscode = require("vscode");
const { parseAndValidateVexDocument } = require("./vex-parse.js");

const DIAGNOSTIC_SOURCE = "vex-language";
const VALIDATION_DEBOUNCE_MS = 300;

/**
 * @param {vscode.TextDocument} doc
 * @returns {vscode.Diagnostic[]}
 */
function getDiagnostics(doc) {
  const text = doc.getText();
  const parsed = parseAndValidateVexDocument(text);
  if (parsed.ok) {
    return [];
  }

  const lineCount = doc.lineCount;
  const lastIdx = Math.max(0, lineCount - 1);

  return parsed.errors.map((err) => {
    let lineIndex = err.line > 0 ? err.line - 1 : 0;
    if (lineIndex >= lineCount) {
      lineIndex = lastIdx;
    }

    const line = doc.lineAt(lineIndex);
    const firstLine = doc.lineAt(0);
    const fallbackRange = new vscode.Range(0, 0, 0, firstLine.text.length);
    const range = err.line > 0 ? line.range : fallbackRange;
    const d = new vscode.Diagnostic(range, err.message, vscode.DiagnosticSeverity.Error);
    d.source = DIAGNOSTIC_SOURCE;
    return d;
  });
}

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
  const collection = vscode.languages.createDiagnosticCollection(DIAGNOSTIC_SOURCE);
  context.subscriptions.push(collection);

  /** @type {Map<string, ReturnType<typeof setTimeout>>} */
  const pending = new Map();

  context.subscriptions.push({
    dispose: () => {
      [...pending.values()].forEach((t) => {
        clearTimeout(t);
      });
      pending.clear();
    },
  });

  /**
   * @param {vscode.TextDocument} doc
   */
  const refreshNow = (doc) => {
    if (doc.languageId !== "vex" || doc.uri.scheme !== "file") {
      return;
    }

    collection.set(doc.uri, getDiagnostics(doc));
  };

  /**
   * @param {vscode.TextDocument} doc
   * @param {boolean} immediate
   */
  const scheduleRefresh = (doc, immediate) => {
    if (doc.languageId !== "vex" || doc.uri.scheme !== "file") {
      return;
    }

    if (immediate) {
      const prev = pending.get(doc.uri.toString());
      if (prev) {
        clearTimeout(prev);
        pending.delete(doc.uri.toString());
      }

      refreshNow(doc);
      return;
    }

    const id = doc.uri.toString();
    const prev = pending.get(id);
    if (prev) {
      clearTimeout(prev);
    }

    pending.set(
      id,
      setTimeout(() => {
        pending.delete(id);
        refreshNow(doc);
      }, VALIDATION_DEBOUNCE_MS),
    );
  };

  [...vscode.workspace.textDocuments].forEach((doc) => {
    scheduleRefresh(doc, true);
  });

  context.subscriptions.push(
    vscode.workspace.onDidOpenTextDocument((doc) => {
      scheduleRefresh(doc, true);
    }),
  );

  context.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument((e) => {
      scheduleRefresh(e.document, false);
    }),
  );

  context.subscriptions.push(
    vscode.workspace.onDidCloseTextDocument((doc) => {
      const id = doc.uri.toString();
      const t = pending.get(id);
      if (t) {
        clearTimeout(t);
        pending.delete(id);
      }

      collection.delete(doc.uri);
    }),
  );
}

function deactivate() {}

module.exports = { activate, deactivate };
