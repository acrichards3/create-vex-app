import type { DescribeBlock } from "../vex-parse/types";
import {
  H_GAP,
  KIND_STYLES,
  NODE_FILL,
  SIDE_PAD,
  SVG_NS,
  STUB,
  TEXT_MAIN,
  TOP_PAD,
  V_GAP,
  type SizedNode,
} from "./tree-types";
import { drawArrow, drawBranchConnector, LINE_COLOR } from "./tree-edges";
import { sizeDescribe } from "./tree-layout";
import { BODY_FIRST_BASELINE, BODY_LINE_STEP, KIND_BASELINE, getWrappedBodyLines, measureNodeCard } from "./tree-text";

function elSvg(tag: string, attrs: Record<string, string> | undefined, children: Node[]): SVGElement {
  const e = document.createElementNS(SVG_NS, tag);
  if (attrs) {
    Object.keys(attrs).forEach((k) => {
      e.setAttribute(k, attrs[k] ?? "");
    });
  }
  children.forEach((ch) => {
    e.appendChild(ch);
  });
  return e;
}

function appendCenteredLine(
  parent: SVGElement,
  cx: number,
  baselineY: number,
  content: string,
  attrs: Record<string, string>,
): void {
  const lineG = document.createElementNS(SVG_NS, "g");
  lineG.setAttribute("pointer-events", "none");
  lineG.setAttribute("transform", `translate(${String(cx)}, ${String(baselineY)})`);
  lineG.appendChild(
    elSvg(
      "text",
      {
        ...attrs,
        "dominant-baseline": "middle",
        "pointer-events": "none",
        "text-anchor": "middle",
        x: "0",
        y: "0",
      },
      [document.createTextNode(content)],
    ),
  );
  parent.appendChild(lineG);
}

function drawCard(g: SVGElement, n: SizedNode, x: number, y: number, cardH: number, cardW: number): void {
  const k = KIND_STYLES[n.kind];
  const layoutW = n.w;
  const cardLeft = x + (layoutW - cardW) / 2;
  const cx = cardLeft + cardW / 2;
  const bodyLines = getWrappedBodyLines(n.label);
  g.appendChild(
    elSvg(
      "rect",
      {
        class: "vex-node-card",
        "data-label-end": String(n.labelSpan.end),
        "data-label-start": String(n.labelSpan.start),
        fill: NODE_FILL,
        height: String(cardH),
        rx: "8",
        stroke: k.color,
        "stroke-width": "2",
        width: String(cardW),
        x: String(cardLeft),
        y: String(y),
      },
      [],
    ),
  );
  appendCenteredLine(g, cx, y + KIND_BASELINE, k.label, {
    fill: k.color,
    "font-family": "system-ui, sans-serif",
    "font-size": "9",
    "font-weight": "700",
    "letter-spacing": "1",
  });
  bodyLines.forEach((line, i) => {
    appendCenteredLine(g, cx, y + BODY_FIRST_BASELINE + i * BODY_LINE_STEP, line, {
      fill: TEXT_MAIN,
      "font-family": "system-ui, sans-serif",
      "font-size": "11",
      "font-weight": "600",
    });
  });
}

function paint(g: SVGElement, n: SizedNode, x: number, y: number): void {
  const cardMetrics = measureNodeCard(n.label);
  const cardH = cardMetrics.h;
  const cardW = cardMetrics.w;
  drawCard(g, n, x, y, cardH, cardW);
  if (n.kids.length === 0) {
    return;
  }
  const px = x + n.w / 2;
  const cardBottom = y + cardH;
  if (n.kids.length === 1) {
    const k0 = n.kids[0];
    const kx0 = x + (n.w - k0.w) / 2;
    drawArrow(g, px, cardBottom + 2, px, cardBottom + V_GAP - 2);
    paint(g, k0, kx0, cardBottom + V_GAP);
    return;
  }
  let totalRowW = 0;
  n.kids.forEach((kid, ri) => {
    totalRowW += kid.w;
    if (ri < n.kids.length - 1) {
      totalRowW += H_GAP;
    }
  });
  const startX = x + (n.w - totalRowW) / 2;
  const elbow = cardBottom + V_GAP + STUB;
  const childTopY = elbow + V_GAP - 2;
  let curX = startX;
  n.kids.forEach((kid) => {
    const cx2 = curX + kid.w / 2;
    drawBranchConnector(g, px, cardBottom + 2, cx2, childTopY);
    paint(g, kid, curX, elbow + V_GAP);
    curX += kid.w + H_GAP;
  });
}

export function renderDescribeBlock(block: DescribeBlock): HTMLDivElement {
  const sized = sizeDescribe(block);
  const svgW = Math.max(sized.w + SIDE_PAD * 2, 320);
  const svgH = sized.h + TOP_PAD * 2;
  const wrap = document.createElement("div");
  wrap.id = "tree-wrap";
  wrap.style.boxSizing = "border-box";
  wrap.style.display = "block";
  wrap.style.maxWidth = "none";
  wrap.style.overflow = "visible";
  wrap.style.width = "fit-content";
  const svgEl = document.createElementNS(SVG_NS, "svg");
  svgEl.setAttribute("data-svg-base-h", String(svgH));
  svgEl.setAttribute("data-svg-base-w", String(svgW));
  svgEl.setAttribute("height", String(svgH));
  svgEl.setAttribute("overflow", "visible");
  svgEl.setAttribute("viewBox", `0 0 ${String(svgW)} ${String(svgH)}`);
  svgEl.setAttribute("width", String(svgW));
  svgEl.style.display = "block";
  const defs = document.createElementNS(SVG_NS, "defs");
  const marker = document.createElementNS(SVG_NS, "marker");
  marker.setAttribute("id", "vex-arr");
  marker.setAttribute("markerWidth", "8");
  marker.setAttribute("markerHeight", "6");
  marker.setAttribute("refX", "7");
  marker.setAttribute("refY", "3");
  marker.setAttribute("orient", "auto");
  marker.appendChild(elSvg("polygon", { fill: LINE_COLOR, points: "0 0, 8 3, 0 6" }, []));
  defs.appendChild(marker);
  svgEl.appendChild(defs);
  const g = document.createElementNS(SVG_NS, "g");
  svgEl.appendChild(g);
  paint(g, sized, SIDE_PAD, TOP_PAD);
  wrap.appendChild(svgEl);
  return wrap;
}
