/**
 * Canvas 2D rasterizer for the PFD scene (`pfdScene.ts`), used to composite the
 * glass-cockpit overlay onto recorded video frames. The SVG renderer in
 * `CockpitPfdOverlay` draws the exact same scene for the live view.
 */

import { PFD_FONT_FAMILY, type PfdNode } from "./pfdScene";

const DEG_TO_RAD = Math.PI / 180;

function applyStroke(
  ctx: CanvasRenderingContext2D,
  stroke: string | undefined,
  strokeWidth: number | undefined
): boolean {
  if (!stroke || !strokeWidth) return false;
  ctx.strokeStyle = stroke;
  ctx.lineWidth = strokeWidth;
  return true;
}

function tracePolygon(ctx: CanvasRenderingContext2D, points: [number, number][], close: boolean): void {
  ctx.beginPath();
  points.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
  if (close) ctx.closePath();
}

function drawNode(ctx: CanvasRenderingContext2D, node: PfdNode): void {
  switch (node.kind) {
    case "group": {
      ctx.save();
      if (node.opacity !== undefined) ctx.globalAlpha *= node.opacity;
      for (const t of node.transforms ?? []) {
        if (t.op === "translate") {
          ctx.translate(t.x, t.y);
        } else if (t.op === "rotate") {
          ctx.translate(t.cx, t.cy);
          ctx.rotate(t.deg * DEG_TO_RAD);
          ctx.translate(-t.cx, -t.cy);
        } else {
          ctx.translate(t.cx, t.cy);
          ctx.scale(t.factor, t.factor);
          ctx.translate(-t.cx, -t.cy);
        }
      }
      for (const child of node.children) drawNode(ctx, child);
      ctx.restore();
      break;
    }
    case "rect": {
      ctx.beginPath();
      ctx.roundRect(node.x, node.y, node.width, node.height, node.rx ?? 0);
      ctx.fillStyle = node.fill;
      ctx.fill();
      if (applyStroke(ctx, node.stroke, node.strokeWidth)) ctx.stroke();
      break;
    }
    case "line": {
      ctx.beginPath();
      ctx.moveTo(node.x1, node.y1);
      ctx.lineTo(node.x2, node.y2);
      ctx.lineCap = "butt";
      if (applyStroke(ctx, node.stroke, node.strokeWidth)) ctx.stroke();
      break;
    }
    case "polyline": {
      tracePolygon(ctx, node.points, false);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      if (applyStroke(ctx, node.stroke, node.strokeWidth)) ctx.stroke();
      break;
    }
    case "polygon": {
      tracePolygon(ctx, node.points, true);
      if (node.fill) {
        ctx.fillStyle = node.fill;
        ctx.fill();
      }
      ctx.lineJoin = "miter";
      if (applyStroke(ctx, node.stroke, node.strokeWidth)) ctx.stroke();
      break;
    }
    case "circle": {
      ctx.beginPath();
      ctx.arc(node.cx, node.cy, node.r, 0, Math.PI * 2);
      if (node.fill) {
        ctx.fillStyle = node.fill;
        ctx.fill();
      }
      if (applyStroke(ctx, node.stroke, node.strokeWidth)) ctx.stroke();
      break;
    }
    case "arc": {
      ctx.beginPath();
      ctx.arc(node.cx, node.cy, node.r, node.startDeg * DEG_TO_RAD, node.endDeg * DEG_TO_RAD);
      ctx.lineCap = node.round ? "round" : "butt";
      if (applyStroke(ctx, node.stroke, node.strokeWidth)) ctx.stroke();
      break;
    }
    case "text": {
      ctx.font = `${node.weight} ${node.size}px ${PFD_FONT_FAMILY}`;
      ctx.fillStyle = node.fill;
      ctx.textAlign = node.anchor === "middle" ? "center" : node.anchor === "end" ? "right" : "left";
      ctx.textBaseline = "alphabetic";
      ctx.fillText(node.text, node.x, node.y);
      break;
    }
  }
}

/**
 * Draws a PFD scene onto `ctx`. `scale` maps the scene's CSS-pixel layout onto
 * the canvas backing store (device pixels), so pass e.g.
 * `canvas.width / canvas.clientWidth`.
 */
export function drawPfdScene(ctx: CanvasRenderingContext2D, scene: PfdNode, scale: number): void {
  ctx.save();
  ctx.scale(scale, scale);
  drawNode(ctx, scene);
  ctx.restore();
}
