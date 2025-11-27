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

    // Set canvas size with DPR for sharp rendering
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;

    // Clear canvas with sky gradient
    const skyGradient = ctx.createLinearGradient(0, 0, 0, height * 0.7);
    skyGradient.addColorStop(0, "#87CEEB");
    skyGradient.addColorStop(0.5, "#B0E0E6");
    skyGradient.addColorStop(1, "#E0F4FF");
    ctx.fillStyle = skyGradient;
    ctx.fillRect(0, 0, width, height);

    // Ground level
    const groundY = height * 0.75;

    // Layout constants
    const paddingLeft = 80; // Space for control tower
    const paddingRight = 100; // Space for aircraft after obstacle
    const drawableWidth = width - paddingLeft - paddingRight;

    // Calculate scale - ensure everything fits
    // The visualization spans from runway start to just past the obstacle/clearance point
    const visualizationEnd = Math.max(runwayLength, results.distances.obstacleDistance);
    const scaleX = drawableWidth / visualizationEnd;

    // Max height for vertical scale
    const maxHeight = Math.max(obstacleHeight * 2, 150);
    const scaleY = (height * 0.35) / maxHeight;

    // Draw distant mountains
    drawMountains(ctx, width, groundY);

    // Draw city skyline
    drawCitySkyline(ctx, width, groundY);

    // Draw clouds
    drawClouds(ctx, width);

    // Draw ground/grass
    const groundGradient = ctx.createLinearGradient(0, groundY, 0, height);
    groundGradient.addColorStop(0, "#4a7c23");
    groundGradient.addColorStop(0.3, "#3d6b1e");
    groundGradient.addColorStop(1, "#2d5016");
    ctx.fillStyle = groundGradient;
    ctx.fillRect(0, groundY, width, height - groundY);

    // Draw grass texture
    drawGrassTexture(ctx, width, height, groundY);

    // Draw runway
    const runwayStartX = paddingLeft;
    const runwayEndX = paddingLeft + runwayLength * scaleX;
    const runwayHeight = 12;

    // Runway base (asphalt)
    ctx.fillStyle = "#2d2d2d";
    ctx.fillRect(runwayStartX, groundY - runwayHeight / 2, runwayLength * scaleX, runwayHeight);

    // Runway edge lines
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(runwayStartX, groundY - runwayHeight / 2);
    ctx.lineTo(runwayEndX, groundY - runwayHeight / 2);
    ctx.moveTo(runwayStartX, groundY + runwayHeight / 2);
    ctx.lineTo(runwayEndX, groundY + runwayHeight / 2);
    ctx.stroke();

    // Runway centerline dashes
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1.5;
    ctx.setLineDash([15, 10]);
    ctx.beginPath();
    ctx.moveTo(runwayStartX + 20, groundY);
    ctx.lineTo(runwayEndX - 20, groundY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Runway threshold markings
    ctx.fillStyle = "#ffffff";
    for (let i = 0; i < 4; i++) {
      ctx.fillRect(runwayStartX + 10, groundY - 5 + (i * 3), 25, 2);
    }

    // Draw control tower
    drawControlTower(ctx, runwayStartX - 30, groundY);

    // Calculate key positions
    const groundRollEndX = paddingLeft + results.distances.groundRoll * scaleX;
    const obstacleX = paddingLeft + runwayLength * scaleX;
    const clearanceX = paddingLeft + results.distances.obstacleDistance * scaleX;
    const clearanceY = groundY - obstacleHeight * scaleY;

    // Ground roll indicator line (red)
    ctx.strokeStyle = "#dc2626";
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(runwayStartX, groundY);
    ctx.lineTo(groundRollEndX, groundY);
    ctx.stroke();

    // Determine if obstacle is cleared
    const isCleared = results.distances.obstacleDistance <= runwayLength;

    // Calculate climb gradient (height per horizontal distance)
    const climbDistance = results.distances.climbDistance;
    const climbGradientPx = (obstacleHeight * scaleY) / (climbDistance * scaleX);

    // Calculate climb angle for aircraft rotation
    const climbAngle = Math.atan(climbGradientPx) * 180 / Math.PI;

    // Define where the climb path ends (at the right edge of drawable area)
    const climbPathEndX = width - paddingRight;

    // Calculate height at the end of climb path
    const distanceFromLiftoff = (climbPathEndX - groundRollEndX) / scaleX;
    const heightAtEnd = (distanceFromLiftoff / climbDistance) * obstacleHeight;
    const climbPathEndY = Math.max(40, groundY - heightAtEnd * scaleY);

    // Draw climb path - solid line from liftoff to obstacle position
    ctx.strokeStyle = "#2563eb";
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(groundRollEndX, groundY);

    // Draw to obstacle position or end of drawable area, whichever is smaller
    const solidLineEndX = Math.min(obstacleX, climbPathEndX);
    const solidLineEndY = groundY - ((solidLineEndX - groundRollEndX) / scaleX / climbDistance * obstacleHeight * scaleY);
    ctx.lineTo(solidLineEndX, Math.max(40, solidLineEndY));
    ctx.stroke();

    // Continue with dashed line past obstacle if cleared
    if (isCleared && solidLineEndX < climbPathEndX) {
      ctx.setLineDash([8, 6]);
      ctx.beginPath();
      ctx.moveTo(solidLineEndX, Math.max(40, solidLineEndY));
      ctx.lineTo(climbPathEndX, climbPathEndY);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Draw trees at obstacle position (runway end)
    if (obstacleHeight > 0) {
      const treeHeight = obstacleHeight * scaleY;
      drawTreeGroup(ctx, obstacleX, groundY, treeHeight, isCleared);
    }

    // Limit climb angle to realistic values (max ~15° pitch for visualization)
    const displayClimbAngle = Math.min(15, Math.max(0, climbAngle));

    // Helper function to get Y position on climb line at any X
    const getClimbY = (x: number): number => {
      if (x <= groundRollEndX) return groundY;
      // Linear interpolation from liftoff point to end of climb path
      const t = (x - groundRollEndX) / (climbPathEndX - groundRollEndX);
      return groundY + t * (climbPathEndY - groundY);
    };

    // Draw aircraft
    if (isCleared) {
      // Success: draw aircraft at end of climb path
      // Aircraft nose (propeller) is ~35px ahead of center, so position center back from line end
      const aircraftX = climbPathEndX - 15;
      const aircraftY = getClimbY(aircraftX);
      drawAircraft(ctx, aircraftX, aircraftY, -displayClimbAngle, "#6b7280", 1);
    } else {
      // Failure: draw aircraft at the obstacle (impact)
      const treeHeight = obstacleHeight * scaleY;
      const aircraftY = groundY - treeHeight * 0.6;
      const aircraftX = obstacleX - 25;
      drawAircraft(ctx, aircraftX, aircraftY, -displayClimbAngle * 0.4, "#dc2626", 1);
    }

    // Labels
    ctx.font = "bold 12px system-ui, sans-serif";
    ctx.textAlign = "center";

    // Ground roll label
    ctx.fillStyle = "#dc2626";
    ctx.fillText(
      `Ground Roll: ${Math.round(results.distances.groundRoll)} ft`,
      (runwayStartX + groundRollEndX) / 2,
      groundY + 30
    );

    // Total distance to clear obstacle label
    ctx.fillStyle = "#2563eb";
    ctx.fillText(
      `Takeoff Distance: ${Math.round(results.distances.obstacleDistance)} ft`,
      (runwayStartX + clearanceX) / 2,
      groundY + 50
    );

    // Status indicator
    ctx.font = "bold 14px system-ui, sans-serif";
    if (isCleared) {
      ctx.fillStyle = "#15803d";
      ctx.fillText(
        `✓ Runway margin: ${Math.round(runwayLength - results.distances.obstacleDistance)} ft (${Math.round(results.safetyMargin * 100)}%)`,
        width / 2,
        35
      );
    } else {
      ctx.fillStyle = "#dc2626";
      ctx.fillText(
        `⚠ Insufficient runway: need ${Math.round(results.distances.obstacleDistance - runwayLength)} ft more`,
        width / 2,
        35
      );
    }

    // Obstacle height label if present
    if (obstacleHeight > 0) {
      ctx.fillStyle = "#15803d";
      ctx.font = "11px system-ui, sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(`Obstacle: ${obstacleHeight} ft`, obstacleX + 25, groundY - obstacleHeight * scaleY + 10);
    }

  }, [results, runwayLength, obstacleHeight]);

  return (
    <div className="relative w-full">
      <canvas
        ref={canvasRef}
        className="w-full rounded-lg shadow-md"
        style={{ height: "320px" }}
      />
    </div>
  );
}

/**
 * Draw distant mountain range
 */
function drawMountains(ctx: CanvasRenderingContext2D, width: number, groundY: number) {
  // Far mountains (lighter)
  ctx.fillStyle = "#a8c4d4";
  ctx.beginPath();
  ctx.moveTo(0, groundY);

  const farPeaks = [
    { x: 0.05, h: 0.12 },
    { x: 0.15, h: 0.18 },
    { x: 0.25, h: 0.14 },
    { x: 0.35, h: 0.22 },
    { x: 0.45, h: 0.16 },
    { x: 0.55, h: 0.20 },
    { x: 0.65, h: 0.15 },
    { x: 0.75, h: 0.19 },
    { x: 0.85, h: 0.13 },
    { x: 0.95, h: 0.17 },
  ];

  for (const peak of farPeaks) {
    ctx.lineTo(width * peak.x, groundY - groundY * peak.h);
  }
  ctx.lineTo(width, groundY);
  ctx.closePath();
  ctx.fill();

  // Near mountains (darker)
  ctx.fillStyle = "#8fb3a8";
  ctx.beginPath();
  ctx.moveTo(0, groundY);

  const nearPeaks = [
    { x: 0.0, h: 0.08 },
    { x: 0.1, h: 0.12 },
    { x: 0.2, h: 0.09 },
    { x: 0.3, h: 0.15 },
    { x: 0.4, h: 0.10 },
    { x: 0.5, h: 0.14 },
    { x: 0.6, h: 0.11 },
    { x: 0.7, h: 0.13 },
    { x: 0.8, h: 0.09 },
    { x: 0.9, h: 0.12 },
    { x: 1.0, h: 0.08 },
  ];

  for (const peak of nearPeaks) {
    ctx.lineTo(width * peak.x, groundY - groundY * peak.h);
  }
  ctx.lineTo(width, groundY);
  ctx.closePath();
  ctx.fill();
}

/**
 * Draw city skyline silhouette
 */
function drawCitySkyline(ctx: CanvasRenderingContext2D, width: number, groundY: number) {
  ctx.fillStyle = "#c9d6df";

  const buildings = [
    { x: 0.02, w: 0.03, h: 0.06 },
    { x: 0.06, w: 0.025, h: 0.08 },
    { x: 0.09, w: 0.02, h: 0.05 },
    { x: 0.12, w: 0.035, h: 0.10 },
    { x: 0.16, w: 0.02, h: 0.07 },
    { x: 0.19, w: 0.03, h: 0.09 },
    { x: 0.23, w: 0.025, h: 0.06 },
    { x: 0.26, w: 0.02, h: 0.08 },
    { x: 0.29, w: 0.03, h: 0.05 },
    { x: 0.33, w: 0.025, h: 0.07 },
  ];

  for (const b of buildings) {
    const x = width * b.x;
    const w = width * b.w;
    const h = groundY * b.h;
    ctx.fillRect(x, groundY - h, w, h);
  }
}

/**
 * Draw decorative clouds
 */
function drawClouds(ctx: CanvasRenderingContext2D, width: number) {
  ctx.fillStyle = "rgba(255, 255, 255, 0.8)";

  const clouds = [
    { x: 0.15, y: 50, size: 25 },
    { x: 0.35, y: 70, size: 20 },
    { x: 0.55, y: 45, size: 30 },
    { x: 0.75, y: 65, size: 22 },
  ];

  for (const cloud of clouds) {
    const x = width * cloud.x;
    // Draw cloud as overlapping circles
    ctx.beginPath();
    ctx.arc(x, cloud.y, cloud.size, 0, Math.PI * 2);
    ctx.arc(x + cloud.size * 0.8, cloud.y - 5, cloud.size * 0.7, 0, Math.PI * 2);
    ctx.arc(x + cloud.size * 1.4, cloud.y, cloud.size * 0.8, 0, Math.PI * 2);
    ctx.arc(x + cloud.size * 0.5, cloud.y + 5, cloud.size * 0.6, 0, Math.PI * 2);
    ctx.fill();
  }
}

/**
 * Draw grass texture lines
 */
function drawGrassTexture(ctx: CanvasRenderingContext2D, width: number, height: number, groundY: number) {
  ctx.strokeStyle = "#5a8f2a";
  ctx.lineWidth = 1;

  for (let x = 0; x < width; x += 8) {
    const grassHeight = 3 + Math.random() * 4;
    ctx.beginPath();
    ctx.moveTo(x, groundY);
    ctx.lineTo(x + 1, groundY - grassHeight);
    ctx.stroke();
  }
}

/**
 * Draw control tower
 */
function drawControlTower(ctx: CanvasRenderingContext2D, x: number, groundY: number) {
  // Tower base
  ctx.fillStyle = "#4a5568";
  ctx.fillRect(x - 4, groundY - 50, 8, 50);

  // Tower cab
  ctx.fillStyle = "#2d3748";
  ctx.fillRect(x - 10, groundY - 65, 20, 15);

  // Windows
  ctx.fillStyle = "#63b3ed";
  ctx.fillRect(x - 8, groundY - 62, 16, 8);

  // Antenna
  ctx.strokeStyle = "#4a5568";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, groundY - 65);
  ctx.lineTo(x, groundY - 80);
  ctx.stroke();

  // Antenna light
  ctx.fillStyle = "#48bb78";
  ctx.beginPath();
  ctx.arc(x, groundY - 80, 3, 0, Math.PI * 2);
  ctx.fill();
}

/**
 * Draw a group of trees
 */
function drawTreeGroup(
  ctx: CanvasRenderingContext2D,
  x: number,
  groundY: number,
  height: number,
  cleared: boolean
) {
  // Use darker/different tones to contrast with aircraft
  // Cleared: dark forest green, Not cleared: dark maroon/brown-red
  const treeColor = cleared ? "#1a4d2e" : "#7f1d1d";
  const trunkColor = "#8B4513";

  // Draw 3 trees in a group
  const positions = [-15, 0, 15];
  const sizes = [0.8, 1, 0.85];

  for (let i = 0; i < positions.length; i++) {
    const treeX = x + positions[i];
    const treeHeight = height * sizes[i];
    const treeWidth = treeHeight * 0.6;

    // Trunk
    ctx.fillStyle = trunkColor;
    ctx.fillRect(treeX - 3, groundY - treeHeight * 0.3, 6, treeHeight * 0.3);

    // Foliage (layered triangles for pine tree effect)
    ctx.fillStyle = treeColor;

    // Bottom layer
    ctx.beginPath();
    ctx.moveTo(treeX - treeWidth / 2, groundY - treeHeight * 0.25);
    ctx.lineTo(treeX, groundY - treeHeight * 0.6);
    ctx.lineTo(treeX + treeWidth / 2, groundY - treeHeight * 0.25);
    ctx.closePath();
    ctx.fill();

    // Middle layer
    ctx.beginPath();
    ctx.moveTo(treeX - treeWidth / 2.5, groundY - treeHeight * 0.5);
    ctx.lineTo(treeX, groundY - treeHeight * 0.85);
    ctx.lineTo(treeX + treeWidth / 2.5, groundY - treeHeight * 0.5);
    ctx.closePath();
    ctx.fill();

    // Top layer
    ctx.beginPath();
    ctx.moveTo(treeX - treeWidth / 4, groundY - treeHeight * 0.75);
    ctx.lineTo(treeX, groundY - treeHeight);
    ctx.lineTo(treeX + treeWidth / 4, groundY - treeHeight * 0.75);
    ctx.closePath();
    ctx.fill();
  }
}

/**
 * Draw aircraft silhouette - SIDE VIEW (profile)
 * Similar to the reference image - viewed from the side
 */
function drawAircraft(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  angle: number,
  color: string,
  scale: number
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate((angle * Math.PI) / 180);
  ctx.scale(scale, scale);

  ctx.fillStyle = color;

  // Fuselage (side view - elongated body)
  ctx.beginPath();
  ctx.moveTo(30, 0);  // Nose tip
  ctx.quadraticCurveTo(25, -4, 15, -5);  // Nose curve up to cabin
  ctx.lineTo(-5, -5);  // Top of cabin
  ctx.quadraticCurveTo(-15, -5, -25, -3);  // Taper to tail
  ctx.lineTo(-30, -3);  // Tail
  ctx.lineTo(-30, 3);  // Tail bottom
  ctx.quadraticCurveTo(-20, 5, -5, 5);  // Bottom rear
  ctx.lineTo(15, 5);  // Bottom front
  ctx.quadraticCurveTo(25, 4, 30, 0);  // Nose bottom curve
  ctx.closePath();
  ctx.fill();

  // Cockpit window (side view)
  ctx.fillStyle = "#87CEEB";
  ctx.beginPath();
  ctx.moveTo(20, -3);
  ctx.quadraticCurveTo(15, -6, 8, -5);
  ctx.lineTo(8, -3);
  ctx.lineTo(20, -3);
  ctx.closePath();
  ctx.fill();

  // Wing (side view - single wing visible as a thick line/shape)
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(5, 0);
  ctx.lineTo(-5, -2);
  ctx.lineTo(-10, -2);
  ctx.lineTo(-10, 2);
  ctx.lineTo(-5, 2);
  ctx.lineTo(5, 0);
  ctx.closePath();
  ctx.fill();

  // Vertical stabilizer (tail fin - prominent in side view)
  ctx.beginPath();
  ctx.moveTo(-25, -3);
  ctx.lineTo(-30, -18);  // Top of tail
  ctx.lineTo(-35, -18);
  ctx.lineTo(-32, -3);
  ctx.closePath();
  ctx.fill();

  // Horizontal stabilizer (small in side view)
  ctx.beginPath();
  ctx.moveTo(-28, -2);
  ctx.lineTo(-35, -4);
  ctx.lineTo(-35, 0);
  ctx.lineTo(-28, 2);
  ctx.closePath();
  ctx.fill();

  // Engine cowling (nose)
  ctx.fillStyle = color === "#6b7280" ? "#4b5563" : "#1f2937";
  ctx.beginPath();
  ctx.ellipse(30, 0, 4, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  // Propeller (side view - disc/blur)
  ctx.fillStyle = "rgba(100, 100, 100, 0.5)";
  ctx.beginPath();
  ctx.ellipse(33, 0, 2, 8, 0, 0, Math.PI * 2);
  ctx.fill();

  // Landing gear (if on ground - angle near 0)
  if (Math.abs(angle) < 5) {
    ctx.fillStyle = "#374151";
    // Main gear
    ctx.fillRect(0, 5, 3, 8);
    ctx.beginPath();
    ctx.arc(1.5, 14, 3, 0, Math.PI * 2);
    ctx.fill();
    // Nose gear
    ctx.fillRect(18, 5, 2, 6);
    ctx.beginPath();
    ctx.arc(19, 12, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}
