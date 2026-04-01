const vscode = require("vscode");
const { createVexTreeEditorProvider } = require("./vex-tree-editor-provider.js");

const VIEW_ID = "vex.panel.stepper";
const VEX_TREE_VIEW_TYPE = "vex.tree";

const STEPS = [
  { label: "Describe" },
  { label: "Spec" },
  { label: "Approve" },
  { label: "Build" },
  { label: "Verify" },
  { label: "Done" },
];

function buildStepperHtml() {
  const segments = [];
  STEPS.forEach((step, index) => {
    const n = index + 1;
    const isActive = index === 0;
    const nodeClass = isActive ? "vex-node vex-node--active" : "vex-node vex-node--pending";
    const ariaCurrent = isActive ? ' aria-current="step"' : "";
    segments.push(`<div class="vex-step-outer" role="listitem">
    <button type="button" class="vex-step"${ariaCurrent} data-step-index="${String(index)}" title="${escapeAttr(step.label)}">
    <span class="vex-node-wrap">
    <span class="${nodeClass}">
      <span class="vex-node-num">${String(n)}</span>
    </span>
    </span>
    <span class="vex-label">${escapeHtml(step.label)}</span>
    </button>
  </div>`);
    if (index < STEPS.length - 1) {
      segments.push(`<div class="vex-connector" aria-hidden="true"><span class="vex-connector-line"></span></div>`);
    }
  });
  const trackInner = segments.join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline';" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Vex</title>
  <style>
    :root {
      --vex-purple-300: #c4b5fd;
      --vex-surface: rgba(88, 28, 135, 0.22);
    }
    body {
      margin: 0;
      padding: 6px 8px 8px;
      font-family: var(--vscode-font-family), system-ui, sans-serif;
      font-size: 12px;
      color: var(--vscode-foreground);
      background: var(--vscode-sideBar-background);
    }
    .vex-shell {
      border-radius: 8px;
      padding: 8px 10px 10px;
      overflow: visible;
      background: linear-gradient(145deg, var(--vex-surface), rgba(15, 23, 42, 0.35));
      border: 1px solid rgba(167, 139, 250, 0.28);
      box-shadow: 0 0 0 1px rgba(124, 58, 237, 0.12), 0 6px 20px rgba(15, 23, 42, 0.4);
    }
    .vex-shell-header {
      display: flex;
      flex-direction: row;
      align-items: center;
      justify-content: space-between;
      gap: 6px;
      flex-wrap: wrap;
      padding-bottom: 4px;
    }
    .vex-shell-header-right {
      display: flex;
      flex-direction: row;
      align-items: center;
      gap: 6px;
      flex-shrink: 0;
      flex-wrap: wrap;
      justify-content: flex-end;
    }
    .vex-open-visual {
      margin: 0;
      padding: 3px 8px;
      border-radius: 6px;
      border: 1px solid rgba(167, 139, 250, 0.45);
      background: rgba(124, 58, 237, 0.25);
      color: var(--vex-purple-300);
      font-family: inherit;
      font-size: 10px;
      font-weight: 600;
      cursor: pointer;
      -webkit-appearance: none;
      appearance: none;
      flex-shrink: 0;
      white-space: nowrap;
    }
    .vex-open-visual:hover {
      background: rgba(124, 58, 237, 0.4);
    }
    .vex-open-visual:focus-visible {
      outline: 2px solid var(--vscode-focusBorder);
      outline-offset: 2px;
    }
    .vex-title {
      font-size: 10px;
      font-weight: 600;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: var(--vex-purple-300);
      margin: 0;
    }
    .vex-spec-toggle {
      display: flex;
      flex-direction: row;
      align-items: center;
      gap: 6px;
      cursor: pointer;
      user-select: none;
      flex-shrink: 0;
    }
    .vex-spec-toggle-label {
      font-size: 10px;
      font-weight: 600;
      color: var(--vex-purple-300);
      white-space: nowrap;
    }
    .vex-spec-toggle-track {
      position: relative;
      width: 38px;
      height: 20px;
      border-radius: 999px;
      background: rgba(15, 23, 42, 0.65);
      border: 1px solid rgba(167, 139, 250, 0.35);
      flex-shrink: 0;
      transition: background 0.2s ease, border-color 0.2s ease;
    }
    .vex-spec-toggle-track:has(.vex-spec-toggle-input:checked) {
      background: rgba(124, 58, 237, 0.45);
      border-color: rgba(196, 181, 253, 0.55);
    }
    .vex-spec-toggle-input {
      opacity: 0;
      position: absolute;
      width: 100%;
      height: 100%;
      margin: 0;
      cursor: pointer;
    }
    .vex-spec-toggle-knob {
      position: absolute;
      top: 50%;
      left: 2px;
      width: 14px;
      height: 14px;
      border-radius: 999px;
      background: var(--vscode-foreground);
      opacity: 0.45;
      transform: translate(0, -50%);
      transition: transform 0.2s ease, background 0.2s ease, opacity 0.2s ease;
      pointer-events: none;
    }
    .vex-spec-toggle-input:checked + .vex-spec-toggle-knob {
      transform: translate(18px, -50%);
      background: #c4b5fd;
      opacity: 1;
    }
    .vex-spec-toggle-input:focus-visible + .vex-spec-toggle-knob {
      outline: 2px solid var(--vscode-focusBorder);
      outline-offset: 2px;
    }
    .vex-track {
      display: flex;
      flex-direction: row;
      align-items: flex-start;
      justify-content: space-between;
      gap: 0;
      overflow-x: auto;
      overflow-y: visible;
      padding: 2px 0 2px;
    }
    .vex-step-outer {
      display: flex;
      flex-direction: column;
      align-items: center;
      flex: 0 0 auto;
      overflow: visible;
    }
    button.vex-step {
      margin: 0;
      padding: 0;
      border: none;
      background: transparent;
      font: inherit;
      color: inherit;
      cursor: pointer;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
      border-radius: 8px;
      -webkit-tap-highlight-color: transparent;
      -webkit-appearance: none;
      appearance: none;
      overflow: visible;
      box-shadow: none;
    }
    button.vex-step:focus-visible {
      outline: 2px solid var(--vscode-focusBorder);
      outline-offset: 2px;
    }
    .vex-node-wrap {
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      overflow: visible;
    }
    .vex-node {
      width: 28px;
      height: 28px;
      border-radius: 999px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 11px;
      box-sizing: border-box;
      border-style: solid;
      border-width: 1px;
      transition: border-color 0.2s ease, background 0.2s ease, box-shadow 0.2s ease;
    }
    .vex-node--pending {
      color: rgba(196, 181, 253, 0.75);
      background: radial-gradient(circle at 30% 25%, rgba(192, 132, 252, 0.22), rgba(76, 29, 149, 0.45));
      border-color: rgba(196, 181, 253, 0.35);
      box-shadow: 0 2px 6px rgba(15, 23, 42, 0.45);
    }
    .vex-node--active {
      color: #f5f3ff;
      background: radial-gradient(circle at 30% 25%, rgba(216, 180, 254, 0.55), rgba(124, 58, 237, 0.85));
      border-color: rgba(237, 233, 254, 0.65);
      box-shadow:
        0 0 0 1px rgba(237, 233, 254, 0.35),
        0 0 10px rgba(167, 139, 250, 0.22),
        0 3px 10px rgba(76, 29, 149, 0.35);
    }
    button.vex-step:hover .vex-node--pending {
      border-color: rgba(196, 181, 253, 0.55);
      box-shadow: 0 2px 8px rgba(15, 23, 42, 0.5);
    }
    .vex-node-num {
      line-height: 1;
    }
    .vex-label {
      font-size: 9px;
      font-weight: 600;
      color: rgba(196, 181, 253, 0.75);
      text-align: center;
      max-width: 72px;
      line-height: 1.2;
      transition: color 0.2s ease;
    }
    button.vex-step[aria-current="step"] .vex-label {
      color: #ede9fe;
    }
    .vex-connector {
      flex: 1 1 0;
      min-width: 8px;
      height: 32px;
      display: flex;
      align-items: center;
      align-self: flex-start;
      padding-left: 2px;
      padding-right: 2px;
    }
    .vex-connector-line {
      display: block;
      width: 100%;
      height: 2px;
      border-radius: 999px;
      background: linear-gradient(90deg, rgba(167, 139, 250, 0.15), rgba(167, 139, 250, 0.85), rgba(167, 139, 250, 0.15));
      opacity: 0.85;
    }
  </style>
</head>
<body>
  <div class="vex-shell">
    <div class="vex-shell-header">
      <p class="vex-title">Progress</p>
      <div class="vex-shell-header-right">
        <label class="vex-spec-toggle">
          <span class="vex-spec-toggle-label">Enable spec-first workflow</span>
          <span class="vex-spec-toggle-track">
            <input class="vex-spec-toggle-input" type="checkbox" role="switch" checked />
            <span class="vex-spec-toggle-knob"></span>
          </span>
        </label>
        <button type="button" class="vex-open-visual" id="vex-open-visual">Open tree view</button>
      </div>
    </div>
    <div class="vex-track" role="list" aria-label="Vex workflow steps">
${trackInner}
    </div>
  </div>
  <script>
    (function () {
      const vscodeApi = acquireVsCodeApi();
      const openBtn = document.getElementById("vex-open-visual");
      if (openBtn) {
        openBtn.addEventListener("click", function () {
          vscodeApi.postMessage({ type: "openEditorVisual" });
        });
      }
      const buttons = Array.from(document.querySelectorAll("button.vex-step"));
      function setActive(index) {
        buttons.forEach(function (btn, i) {
          const node = btn.querySelector(".vex-node");
          if (!node) {
            return;
          }
          if (i === index) {
            node.classList.remove("vex-node--pending");
            node.classList.add("vex-node--active");
            btn.setAttribute("aria-current", "step");
          } else {
            node.classList.remove("vex-node--active");
            node.classList.add("vex-node--pending");
            btn.removeAttribute("aria-current");
          }
        });
      }
      buttons.forEach(function (btn, index) {
        btn.addEventListener("click", function () {
          setActive(index);
        });
      });
    })();
  </script>
</body>
</html>`;
}

function escapeHtml(text) {
  return text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

function escapeAttr(text) {
  return escapeHtml(text).replaceAll("\n", " ");
}

async function openVexTreeEditorForActiveFile() {
  const doc = vscode.window.activeTextEditor?.document;
  const fsPath = doc && doc.uri.fsPath ? doc.uri.fsPath.toLowerCase() : "";
  const isVex = doc && (doc.languageId === "vex" || fsPath.endsWith(".vex"));
  if (!isVex) {
    await vscode.window.showInformationMessage("Open a .vex file first.");
    return;
  }
  await vscode.commands.executeCommand("vscode.openWith", doc.uri, VEX_TREE_VIEW_TYPE, vscode.ViewColumn.Active);
}

function activate(context) {
  const vexTreeProvider = createVexTreeEditorProvider(context);

  context.subscriptions.push(
    vscode.window.registerCustomEditorProvider(VEX_TREE_VIEW_TYPE, vexTreeProvider, {
      webviewOptions: {
        retainContextWhenHidden: true,
      },
      supportsMultipleEditorsPerDocument: false,
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("vex.panel.openEditorVisual", () => {
      return openVexTreeEditorForActiveFile();
    }),
  );

  const provider = {
    resolveWebviewView(webviewView) {
      webviewView.webview.options = {
        enableScripts: true,
      };
      webviewView.webview.html = buildStepperHtml();

      webviewView.webview.onDidReceiveMessage((message) => {
        if (message && message.type === "openEditorVisual") {
          void openVexTreeEditorForActiveFile();
        }
      });
    },
  };

  context.subscriptions.push(vscode.window.registerWebviewViewProvider(VIEW_ID, provider));
}

function deactivate() {}

module.exports = { activate, deactivate };
