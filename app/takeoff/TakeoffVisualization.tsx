"use client";

import { useEffect, useRef } from "react";
import type { TakeoffResults } from "@/lib/takeoffCalculations";

interface TakeoffVisualizationProps {
  results: TakeoffResults;
  runwayLength: number;
  obstacleHeight: number;
}

export function TakeoffVisualization({ results, runwayLength, obstacleHeight }: TakeoffVisualizationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas size
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    // Clear canvas
    ctx.clearRect(0, 0, rect.width, rect.height);

    // Constants for drawing
    const padding = 40;
    const drawWidth = rect.width - padding * 2;
    const drawHeight = rect.height - padding * 2;

    // Calculate scale (pixels per foot)
    const maxDistance = Math.max(runwayLength, results.distances.obstacleDistance);
    const scaleX = drawWidth / maxDistance;

    // Vertical scale (for obstacle height)
    const maxHeight = Math.max(obstacleHeight + 50, 150); // At least 150 ft for better proportions
    const scaleY = (drawHeight * 0.4) / maxHeight; // Use 40% of height for vertical scale

    // Base line (ground level)
    const groundY = rect.height - padding - 20;

    // Colors
    const runwayColor = "#4a5568";
    const grassColor = "#2d5016";
    const groundRollColor = "#fbbf24";
    const climbColor = "#60a5fa";
    const runwayAvailableColor = results.safetyMargin >= 0.2 ? "#10b981" : results.safetyMargin >= 0 ? "#f59e0b" : "#ef4444";

    // Draw background (grass/ground)
    ctx.fillStyle = grassColor;
    ctx.fillRect(0, groundY - 40, rect.width, 60);

    // Draw runway
    ctx.fillStyle = runwayColor;
    const runwayWidth = 30;
    ctx.fillRect(padding, groundY - runwayWidth / 2, drawWidth, runwayWidth);

    // Draw runway markings (centerline)
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1;
    ctx.setLineDash([10, 10]);
    ctx.beginPath();
    ctx.moveTo(padding, groundY);
    ctx.lineTo(padding + drawWidth, groundY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw runway available distance
    ctx.fillStyle = runwayAvailableColor + "30";
    ctx.fillRect(padding, groundY - runwayWidth / 2 - 5, runwayLength * scaleX, runwayWidth + 10);

    // Draw ground roll distance
    ctx.fillStyle = groundRollColor + "40";
    ctx.fillRect(padding, groundY - 50, results.distances.groundRoll * scaleX, 70);

    // Draw ground roll label
    ctx.fillStyle = groundRollColor;
    ctx.font = "bold 11px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(
      `Ground Roll: ${Math.round(results.distances.groundRoll)} ft`,
      padding + (results.distances.groundRoll * scaleX) / 2,
      groundY - 55
    );

    // Obstacle is at a FIXED position (typically at the end of available runway)
    // User can specify obstacle distance, but default is at runway end
    const obstacleX = padding + runwayLength * scaleX;
    const obstacleBaseY = groundY;
    const obstacleTopY = groundY - obstacleHeight * scaleY;

    // Draw climb path
    const climbStartX = padding + results.distances.groundRoll * scaleX;

    // Calculate where airplane reaches obstacle height
    const climbEndX = padding + results.distances.obstacleDistance * scaleX;
    const climbEndY = groundY - obstacleHeight * scaleY;

    // Draw full climb path to obstacle height
    ctx.strokeStyle = climbColor;
    ctx.lineWidth = 3;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(climbStartX, groundY);
    ctx.lineTo(climbEndX, climbEndY);
    ctx.stroke();
    ctx.setLineDash([]);

    // If airplane clears before obstacle, draw continuation to obstacle position
    if (climbEndX < obstacleX) {
      // Continue climb path to show clearing
      ctx.strokeStyle = "#10b981";
      ctx.lineWidth = 2;
      ctx.setLineDash([2, 4]);
      ctx.beginPath();
      ctx.moveTo(climbEndX, climbEndY);
      // Calculate height at obstacle position (continuing same climb gradient)
      const climbGradient = obstacleHeight / results.distances.climbDistance;
      const additionalDistance = (obstacleX - climbEndX) / scaleX;
      const heightAtObstacle = obstacleHeight + (climbGradient * additionalDistance);
      const yAtObstacle = groundY - heightAtObstacle * scaleY;
      ctx.lineTo(obstacleX, yAtObstacle);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Draw airplane at takeoff position
    drawAirplane(ctx, padding + 10, groundY, 0, "#3b82f6");

    // Draw airplane at rotation point
    drawAirplane(ctx, climbStartX - 15, groundY, 5, "#60a5fa");

    // Draw airplane at obstacle clearance point
    drawAirplane(ctx, climbEndX - 15, climbEndY, 15, "#10b981");

    // Draw obstacle at FIXED position (end of runway)
    if (obstacleHeight > 0) {

      // Determine obstacle color based on clearance
      const obstacleCleared = climbEndX <= obstacleX;
      const obstacleColor = obstacleCleared ? "#15803d" : "#dc2626";

      // Draw tree/obstacle
      ctx.fillStyle = obstacleColor;
      ctx.beginPath();
      ctx.moveTo(obstacleX - 8, obstacleBaseY);
      ctx.lineTo(obstacleX, obstacleTopY);
      ctx.lineTo(obstacleX + 8, obstacleBaseY);
      ctx.closePath();
      ctx.fill();

      // Obstacle height label
      ctx.fillStyle = obstacleColor;
      ctx.font = "bold 10px sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(`${obstacleHeight} ft`, obstacleX + 12, obstacleTopY + 5);

      // Draw horizontal line for obstacle height reference
      ctx.strokeStyle = obstacleColor;
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(padding, obstacleTopY);
      ctx.lineTo(obstacleX - 10, obstacleTopY);
      ctx.stroke();
      ctx.setLineDash([]);

      // Warning if obstacle not cleared
      if (!obstacleCleared) {
        ctx.fillStyle = "#dc2626";
        ctx.font = "bold 12px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("⚠ OBSTACLE NOT CLEARED", obstacleX, obstacleTopY - 15);
      }
    }

    // Draw distance markers
    ctx.strokeStyle = "#94a3b8";
    ctx.lineWidth = 1;
    ctx.font = "10px sans-serif";
    ctx.fillStyle = "#94a3b8";
    ctx.textAlign = "center";

    // Ground roll marker
    ctx.setLineDash([2, 2]);
    ctx.beginPath();
    ctx.moveTo(climbStartX, groundY + 25);
    ctx.lineTo(climbStartX, groundY + 35);
    ctx.stroke();
    ctx.setLineDash([]);

    // Clearance point marker (where plane reaches obstacle height)
    ctx.setLineDash([2, 2]);
    ctx.beginPath();
    ctx.moveTo(climbEndX, groundY + 25);
    ctx.lineTo(climbEndX, groundY + 35);
    ctx.stroke();
    ctx.setLineDash([]);

    // Obstacle position marker
    ctx.strokeStyle = obstacleHeight > 0 ? "#15803d" : "#94a3b8";
    ctx.setLineDash([2, 2]);
    ctx.beginPath();
    ctx.moveTo(obstacleX, groundY + 25);
    ctx.lineTo(obstacleX, groundY + 35);
    ctx.stroke();
    ctx.setLineDash([]);

    // Distance scale line (from start to clearance point)
    ctx.strokeStyle = "#cbd5e1";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(padding, groundY + 30);
    ctx.lineTo(climbEndX, groundY + 30);
    ctx.stroke();

    // Required distance label
    ctx.fillStyle = climbColor;
    ctx.font = "bold 11px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(
      `Required: ${Math.round(results.distances.obstacleDistance)} ft`,
      padding + (results.distances.obstacleDistance * scaleX) / 2,
      groundY + 45
    );

    // Runway available comparison
    const runwayEndX = padding + runwayLength * scaleX;
    if (runwayEndX > climbEndX) {
      // Draw runway remaining (clearance successful)
      ctx.fillStyle = runwayAvailableColor + "20";
      ctx.fillRect(climbEndX, groundY - 50, (runwayEndX - climbEndX), 70);

      // Draw end marker
      ctx.strokeStyle = runwayAvailableColor;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(runwayEndX, groundY - 25);
      ctx.lineTo(runwayEndX, groundY + 25);
      ctx.stroke();

      // Margin label
      ctx.fillStyle = runwayAvailableColor;
      ctx.font = "bold 10px sans-serif";
      ctx.textAlign = "center";
      const marginText = `Margin: ${Math.round(results.safetyMargin * 100)}%`;
      ctx.fillText(marginText, (climbEndX + runwayEndX) / 2, groundY + 15);
    } else {
      // Insufficient runway - clearance NOT achieved
      ctx.strokeStyle = "#ef4444";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(runwayEndX, groundY - 25);
      ctx.lineTo(runwayEndX, groundY + 25);
      ctx.stroke();

      ctx.fillStyle = "#ef4444";
      ctx.font = "bold 11px sans-serif";
      ctx.textAlign = "left";
      ctx.fillText("⚠ Insufficient", runwayEndX + 5, groundY - 10);
    }

    // Draw scale reference at bottom
    ctx.fillStyle = "#64748b";
    ctx.font = "9px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(`0 ft`, padding, rect.height - 5);
    ctx.textAlign = "center";
    ctx.fillText(`${Math.round(maxDistance / 2)} ft`, padding + drawWidth / 2, rect.height - 5);
    ctx.textAlign = "right";
    ctx.fillText(`${Math.round(maxDistance)} ft`, padding + drawWidth, rect.height - 5);

  }, [results, runwayLength, obstacleHeight]);

  return (
    <div className="relative w-full">
      <canvas
        ref={canvasRef}
        className="w-full"
        style={{ height: "300px" }}
      />
    </div>
  );
}

/**
 * Draw a simple airplane icon
 */
function drawAirplane(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  angle: number,
  color: string
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate((angle * Math.PI) / 180);

  // Fuselage
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(0, 0, 12, 3, 0, 0, Math.PI * 2);
  ctx.fill();

  // Wings
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(-8, -1);
  ctx.lineTo(-8, -8);
  ctx.lineTo(8, -8);
  ctx.lineTo(8, -1);
  ctx.closePath();
  ctx.fill();

  // Tail
  ctx.beginPath();
  ctx.moveTo(-10, 0);
  ctx.lineTo(-12, -5);
  ctx.lineTo(-8, -5);
  ctx.closePath();
  ctx.fill();

  // Cockpit window
  ctx.fillStyle = "#1e293b";
  ctx.beginPath();
  ctx.ellipse(5, 0, 3, 1.5, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}
