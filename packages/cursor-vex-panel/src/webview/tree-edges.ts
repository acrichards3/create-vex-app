import { SVG_NS } from "./tree-types";

export const LINE_COLOR = "#64748b";

function lineElement(attrs: Record<string, string>): SVGElement {
  const line = document.createElementNS(SVG_NS, "line");
  Object.keys(attrs).forEach((k) => {
    line.setAttribute(k, attrs[k] ?? "");
  });
  return line;
}

function pathElement(attrs: Record<string, string>): SVGElement {
  const path = document.createElementNS(SVG_NS, "path");
  Object.keys(attrs).forEach((k) => {
    path.setAttribute(k, attrs[k] ?? "");
  });
  return path;
}

function lineAttrs(x1: number, y1: number, x2: number, y2: number, markerEnd: boolean): Record<string, string> {
  const attrs: Record<string, string> = {
    stroke: LINE_COLOR,
    "stroke-linecap": "round",
    "stroke-linejoin": "round",
    "stroke-width": "1.5",
    x1: String(x1),
    x2: String(x2),
    y1: String(y1),
    y2: String(y2),
  };
  if (markerEnd) {
    attrs["marker-end"] = "url(#vex-arr)";
  }
  return attrs;
}

export function drawArrow(g: SVGElement, x1: number, y1: number, x2: number, y2: number): void {
  g.appendChild(lineElement(lineAttrs(x1, y1, x2, y2, true)));
}

export function drawBranchConnector(g: SVGElement, x1: number, y1: number, x2: number, y2: number): void {
  if (Math.abs(x1 - x2) < 0.01) {
    drawArrow(g, x1, y1, x2, y2);
    return;
  }
  const dy = y2 - y1;
  const dx = Math.abs(x2 - x1);
  const raw = 0.38 * dy + 0.1 * dx;
  const c = Math.min(56, Math.max(16, Math.min(raw, dy * 0.48 - 0.5)));
  const d = `M ${String(x1)} ${String(y1)} C ${String(x1)} ${String(y1 + c)} ${String(x2)} ${String(y2 - c)} ${String(x2)} ${String(y2)}`;
  g.appendChild(
    pathElement({
      d,
      fill: "none",
      "marker-end": "url(#vex-arr)",
      stroke: LINE_COLOR,
      "stroke-linecap": "round",
      "stroke-linejoin": "round",
      "stroke-width": "1.5",
    }),
  );
}
