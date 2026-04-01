import { VEX_STEPPER_INLINE_CSS } from "./stepper-css";

const STEPS = [
  { label: "Describe" },
  { label: "Spec" },
  { label: "Approve" },
  { label: "Build" },
  { label: "Verify" },
  { label: "Done" },
] as const;

function escapeHtml(text: string): string {
  return text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

function escapeAttr(text: string): string {
  return escapeHtml(text).replaceAll("\n", " ");
}

export function buildStepperHtml(): string {
  const segments: string[] = [];
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
  <style>${VEX_STEPPER_INLINE_CSS}
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
