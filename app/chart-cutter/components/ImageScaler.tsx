'use client';

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { CropArea, cropImage, downloadImage, pixelsToCm } from "@/lib/chartCutter";

interface ImageScalerProps {
  imageSrc: string;
  cropArea: CropArea;
  onDownload?: () => void;
}

const GRID_COLORS = [
  { name: "Gris", value: "rgba(148, 163, 184, 0.8)" },
  { name: "Cian", value: "rgba(56, 189, 248, 0.8)" },
  { name: "Magenta", value: "rgba(244, 114, 182, 0.8)" },
  { name: "Verde", value: "rgba(74, 222, 128, 0.8)" },
  { name: "Blanco", value: "rgba(248, 250, 252, 0.95)" },
];

const DPI_PRESETS = [72, 150, 300, 600];
const CM_TO_INCH = 0.393701;

interface ChartGridOverlayProps {
  width: number;
  height: number;
  gridSize: number;
  gridColor: string;
  gridOffsetX: number;
  gridOffsetY: number;
  dpi: number;
  displayScale: number;
}

function ChartGridOverlay({
  width,
  height,
  gridSize,
  gridColor,
  gridOffsetX,
  gridOffsetY,
  dpi,
  displayScale,
}: ChartGridOverlayProps) {
  if (!width || !height) return null;

  const gridSizePx = gridSize * CM_TO_INCH * dpi * displayScale;
  const mmSizePx = gridSizePx / 10;
  const offsetX = Math.min(Math.max(gridOffsetX, 0), width);
  const offsetY = Math.min(Math.max(gridOffsetY, 0), height);

  const startX = Math.floor(-offsetX / gridSizePx) - 1;
  const endX = Math.ceil((width - offsetX) / gridSizePx) + 1;
  const startY = Math.floor(-offsetY / gridSizePx) - 1;
  const endY = Math.ceil((height - offsetY) / gridSizePx) + 1;

  const centimeterLines: ReactNode[] = [];
  const millimeterLines: ReactNode[] = [];
  const labels: ReactNode[] = [];

  const pushLabel = (x: number, y: number, value: number, orientation: "vertical" | "horizontal") => {
    const fontSize = Math.max(10, Math.min(16, gridSizePx / 4));
    const text = value.toFixed(gridSize >= 1 ? 0 : 1);
    const rectWidth = Math.max(34, fontSize * 2.5);
    const rectHeight = fontSize + 6;

    labels.push(
      <g key={`label-${orientation}-${value}-${x}-${y}`}>
        <rect
          x={orientation === "vertical" ? x - rectWidth / 2 : x + 6}
          y={orientation === "vertical" ? 8 : y - rectHeight / 2}
          width={rectWidth}
          height={rectHeight}
          fill="rgba(15,23,42,0.85)"
          stroke={gridColor}
          strokeWidth={0.5}
          rx={4}
        />
        <text
          x={orientation === "vertical" ? x : x + rectWidth / 2 + 6}
          y={orientation === "vertical" ? 8 + rectHeight / 1.4 : y + 4}
          fill={gridColor}
          fontSize={fontSize}
          fontWeight={600}
          textAnchor="middle"
        >
          {text} cm
        </text>
      </g>
    );
  };

  for (let i = startX; i <= endX; i++) {
    const x = i * gridSizePx + offsetX;
    if (x < 0 || x > width) continue;
    centimeterLines.push(
      <line
        key={`v-${i}`}
        x1={x}
        y1={0}
        x2={x}
        y2={height}
        stroke={gridColor}
        strokeWidth={i === 0 ? 2 : 1.4}
        opacity={i === 0 ? 1 : 0.85}
      />
    );

    if (i !== 0 || gridSize >= 1) {
      pushLabel(x, 0, i * gridSize, "vertical");
    }

    if ((gridSize <= 1 || gridSize === 11.22) && mmSizePx > 3) {
      for (let j = 1; j < 10; j++) {
        const xMm = x + j * mmSizePx;
        if (xMm < 0 || xMm > width) continue;
        const isMid = j === 5;
        millimeterLines.push(
          <line
            key={`v-mm-${i}-${j}`}
            x1={xMm}
            y1={0}
            x2={xMm}
            y2={height}
            stroke={gridColor}
            strokeWidth={isMid ? 0.9 : 0.4}
            opacity={isMid ? 0.45 : 0.25}
            strokeDasharray={isMid ? undefined : "2,4"}
          />
        );
      }
    }
  }

  for (let i = startY; i <= endY; i++) {
    const y = i * gridSizePx + offsetY;
    if (y < 0 || y > height) continue;
    centimeterLines.push(
      <line
        key={`h-${i}`}
        x1={0}
        y1={y}
        x2={width}
        y2={y}
        stroke={gridColor}
        strokeWidth={i === 0 ? 2 : 1.4}
        opacity={i === 0 ? 1 : 0.85}
      />
    );

    if (i !== 0 || gridSize >= 1) {
      pushLabel(0, y, i * gridSize, "horizontal");
    }

    if ((gridSize <= 1 || gridSize === 11.22) && mmSizePx > 3) {
      for (let j = 1; j < 10; j++) {
        const yMm = y + j * mmSizePx;
        if (yMm < 0 || yMm > height) continue;
        const isMid = j === 5;
        millimeterLines.push(
          <line
            key={`h-mm-${i}-${j}`}
            x1={0}
            y1={yMm}
            x2={width}
            y2={yMm}
            stroke={gridColor}
            strokeWidth={isMid ? 0.9 : 0.4}
            opacity={isMid ? 0.45 : 0.25}
            strokeDasharray={isMid ? undefined : "2,4"}
          />
        );
      }
    }
  }

  return (
    <svg width={width} height={height} className="pointer-events-none absolute inset-0">
      {millimeterLines}
      {centimeterLines}
      {labels}
    </svg>
  );
}

const IconPrinter = () => (
  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 9V4h12v5" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 14H4v-3a3 3 0 013-3h10a3 3 0 013 3v3h-2" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 14h12v7H6z" />
  </svg>
);

const IconDownload = () => (
  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v12m0 0l-4-4m4 4 4-4" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 21h14" />
  </svg>
);

const IconGrid = () => (
  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 8h16M4 16h16M8 4v16m8-16v16" />
  </svg>
);

const IconPalette = () => (
  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3a9 9 0 00-9 9 4 4 0 004 4h1a1 1 0 011 1v1a3 3 0 003 3 9 9 0 000-18z" />
    <circle cx="8.5" cy="10.5" r="1" />
    <circle cx="12" cy="7.5" r="1" />
    <circle cx="15.5" cy="10.5" r="1" />
    <circle cx="11.5" cy="13.5" r="1" />
  </svg>
);

const IconMove = () => (
  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14M5 12h14M8 9l-3 3 3 3m8-6 3 3-3 3" />
  </svg>
);

const IconZoomIn = () => (
  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4a8 8 0 018 8 8 8 0 11-8-8zm0 0v8m0 0H8m4 0h4" />
  </svg>
);

const IconZoomOut = () => (
  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4a8 8 0 018 8 8 8 0 11-8-8zm-4 8h8" />
  </svg>
);

export function ImageScaler({ imageSrc, cropArea, onDownload }: ImageScalerProps) {
  const [currentDpi, setCurrentDpi] = useState(300);
  const [tempDpi, setTempDpi] = useState(300);
  const [isDraggingDpi, setIsDraggingDpi] = useState(false);
  const [showGrid, setShowGrid] = useState(true);
  const [gridSize, setGridSize] = useState(1);
  const [gridColor, setGridColor] = useState(GRID_COLORS[0].value);
  const [gridOffsetX, setGridOffsetX] = useState(0);
  const [gridOffsetY, setGridOffsetY] = useState(0);
  const [processedImage, setProcessedImage] = useState<string>("");
  const [pixelDimensions, setPixelDimensions] = useState({ width: 0, height: 0 });
  const [displayScale, setDisplayScale] = useState(1);
  const imageCanvasRef = useRef<HTMLCanvasElement>(null);

  const displayWidth = pixelDimensions.width * displayScale;
  const displayHeight = pixelDimensions.height * displayScale;
  const clampedGridOffsetX = Math.min(Math.max(gridOffsetX, 0), displayWidth || 0);
  const clampedGridOffsetY = Math.min(Math.max(gridOffsetY, 0), displayHeight || 0);


  useEffect(() => {
    let isMounted = true;

    const processImage = async () => {
      try {
        const cropped = await cropImage(imageSrc, cropArea, 1);
        if (!isMounted) return;
        setProcessedImage(cropped);
        setPixelDimensions({ width: cropArea.width, height: cropArea.height });

        const maxWidth = 900;
        const maxHeight = 620;
        const scale = Math.min(1, Math.min(maxWidth / cropArea.width, maxHeight / cropArea.height));
        setDisplayScale(scale);

        if (imageCanvasRef.current) {
          const img = new Image();
          img.onload = () => {
            if (!imageCanvasRef.current) return;
            const canvas = imageCanvasRef.current;
            const ctx = canvas.getContext("2d");
            if (!ctx) return;
            canvas.width = cropArea.width * scale;
            canvas.height = cropArea.height * scale;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          };
          img.src = cropped;
        }
      } catch (error) {
        console.error("Error processing image", error);
      }
    };

    processImage();
    return () => {
      isMounted = false;
    };
  }, [imageSrc, cropArea]);

  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === "s") {
        setShowGrid((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, []);

  const handleDownload = () => {
    if (!processedImage) return;
    const timestamp = new Date().toISOString().replace(/[-:T]/g, "").slice(0, 14);
    downloadImage(processedImage, `chart_${timestamp}_${currentDpi}dpi.png`, currentDpi);
    onDownload?.();
  };

  const printWidthCm = pixelsToCm(pixelDimensions.width, currentDpi);
  const printHeightCm = pixelsToCm(pixelDimensions.height, currentDpi);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-6">
        <div className="mb-6 flex flex-col gap-4 rounded-xl border border-slate-800/80 bg-slate-900/50 p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-3 text-slate-200">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-800/80 text-sky-300">
                  <IconPrinter />
                </div>
                <div>
                  <p className="text-lg font-semibold text-white">Configure the printed output</p>
                  <p className="text-sm text-slate-400">Adjust DPI to control the physical size without resampling</p>
                </div>
              </div>

            <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-300">
              <input
                type="checkbox"
                className="h-4 w-4 cursor-pointer accent-sky-500"
                checked={showGrid}
                onChange={(event) => setShowGrid(event.target.checked)}
              />
              <IconGrid />
              <span>Show grid overlay (press S)</span>
            </label>
          </div>

          {showGrid && (
            <div className="grid gap-4 rounded-xl border border-slate-800/70 bg-slate-900/40 p-4 md:grid-cols-3">
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                  Grid spacing
                </label>
                <select
                  value={gridSize}
                  onChange={(event) => setGridSize(Number(event.target.value))}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950/80 px-3 py-2 text-sm text-white focus:border-sky-500 focus:outline-none"
                >
                  <option value={0.5}>0.5 cm</option>
                  <option value={1}>1 cm</option>
                  <option value={2}>2 cm</option>
                  <option value={5}>5 cm</option>
                  <option value={11.22}>11.22 cm</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                  Grid color
                </label>
                <div className="flex items-center gap-2">
                  <IconPalette />
                  <select
                    value={gridColor}
                    onChange={(event) => setGridColor(event.target.value)}
                    className="flex-1 rounded-lg border border-slate-700 bg-slate-950/80 px-3 py-2 text-sm text-white focus:border-sky-500 focus:outline-none"
                  >
                    {GRID_COLORS.map((color) => (
                      <option key={color.value} value={color.value}>
                        {color.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                  Grid origin offset
                </label>
                <div className="space-y-3 text-sm text-slate-300">
                  <div className="flex items-center gap-2">
                    <span className="w-16 text-xs uppercase tracking-widest text-slate-500">Horizontal</span>
                  <input
                    type="range"
                    min={0}
                    max={displayWidth || 0}
                    value={clampedGridOffsetX}
                    onChange={(event) => setGridOffsetX(Number(event.target.value))}
                    className="flex-1"
                  />

                    <button
                      type="button"
                      onClick={() => setGridOffsetX(displayWidth ? displayWidth / 2 : 0)}
                      className="rounded-lg border border-slate-700 px-3 py-1 text-xs font-medium text-white transition hover:border-slate-500 cursor-pointer"
                    >
                      Center
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-16 text-xs uppercase tracking-widest text-slate-500">Vertical</span>
                  <input
                    type="range"
                    min={0}
                    max={displayHeight || 0}
                    value={clampedGridOffsetY}
                    onChange={(event) => setGridOffsetY(Number(event.target.value))}
                    className="flex-1"
                  />

                    <button
                      type="button"
                      onClick={() => setGridOffsetY(displayHeight ? displayHeight / 2 : 0)}
                      className="rounded-lg border border-slate-700 px-3 py-1 text-xs font-medium text-white transition hover:border-slate-500 cursor-pointer"
                    >
                      Center
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-widest text-slate-500">
              Presets
              {DPI_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => {
                    setCurrentDpi(preset);
                    setTempDpi(preset);
                  }}
                  className={`rounded-full px-3 py-1 text-xs font-semibold transition cursor-pointer ${
                    currentDpi === preset
                      ? "bg-sky-500/20 text-sky-300 border border-sky-500/40"
                      : "border border-slate-700 text-slate-300 hover:border-slate-500"
                  }`}
                >
                  {preset} DPI
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <label className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                Exact DPI
              </label>
              <div className="flex flex-1 items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setCurrentDpi((prev) => Math.max(50, prev - 25));
                    setTempDpi((prev) => Math.max(50, prev - 25));
                  }}
                  className="rounded-lg border border-slate-700 p-2 text-slate-200 transition hover:border-slate-500 cursor-pointer"
                  disabled={currentDpi <= 50}
                >
                  <IconZoomOut />
                </button>
                <input
                  type="range"
                  min={50}
                  max={1200}
                  step={1}
                  value={tempDpi}
                  onChange={(event) => {
                    setTempDpi(Number(event.target.value));
                    setIsDraggingDpi(true);
                  }}
                  onMouseUp={() => {
                    setCurrentDpi(tempDpi);
                    setIsDraggingDpi(false);
                  }}
                  onTouchEnd={() => {
                    setCurrentDpi(tempDpi);
                    setIsDraggingDpi(false);
                  }}
                  className="flex-1"
                />
                <button
                  type="button"
                  onClick={() => {
                    setCurrentDpi((prev) => Math.min(1200, prev + 25));
                    setTempDpi((prev) => Math.min(1200, prev + 25));
                  }}
                  className="rounded-lg border border-slate-700 p-2 text-slate-200 transition hover:border-slate-500 cursor-pointer"
                  disabled={currentDpi >= 1200}
                >
                  <IconZoomIn />
                </button>
                <span className="rounded-lg border border-slate-700 bg-slate-900/70 px-4 py-2 text-sm font-semibold text-white">
                  {isDraggingDpi ? `${tempDpi} DPI` : `${currentDpi} DPI`}
                </span>
              </div>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 text-sm text-slate-300">
              <p className="flex items-center gap-2 text-xs uppercase tracking-widest text-slate-500">
                <IconMove />
                Estimated size
              </p>
              <div className="mt-2 grid gap-4 md:grid-cols-3">
                <div>
                  <p className="text-xs text-slate-400">Original pixels</p>
                  <p className="text-lg font-semibold text-white">
                    {pixelDimensions.width} × {pixelDimensions.height}px
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Print size ({currentDpi} DPI)</p>
                  <p className="text-lg font-semibold text-sky-300">
                    {printWidthCm.toFixed(2)} × {printHeightCm.toFixed(2)} cm
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Inches</p>
                  <p className="text-lg font-semibold text-slate-200">
                    {(printWidthCm / 2.54).toFixed(2)} × {(printHeightCm / 2.54).toFixed(2)}&quot;
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800/70 bg-slate-900/40 p-4">
          <div className="relative mx-auto max-w-full overflow-auto rounded-xl border border-slate-800 bg-slate-950/70 p-4">
            <canvas
              ref={imageCanvasRef}
              className="block max-w-full rounded border border-slate-800 bg-slate-900"
              style={{ width: displayWidth || undefined, height: displayHeight || undefined }}
            />
            {showGrid && displayWidth > 0 && displayHeight > 0 && (
              <ChartGridOverlay
                width={displayWidth}
                height={displayHeight}
                gridSize={gridSize}
                gridColor={gridColor}
                gridOffsetX={clampedGridOffsetX}
                gridOffsetY={clampedGridOffsetY}
                dpi={currentDpi}
                displayScale={displayScale}
              />
            )}
          </div>
        </div>

        <div className="flex flex-col gap-4 rounded-xl border border-slate-800/80 bg-slate-900/40 p-4 md:flex-row md:items-center md:justify-between">
          <p className="text-sm text-slate-300">
            Final output: <span className="font-semibold text-white">{pixelDimensions.width}×{pixelDimensions.height}px</span> @
            <span className="font-semibold text-white"> {currentDpi} DPI</span> =
            <span className="font-semibold text-sky-300"> {printWidthCm.toFixed(2)}×{printHeightCm.toFixed(2)} cm</span>
          </p>
          <button
            type="button"
            onClick={handleDownload}
            className="flex items-center justify-center gap-2 rounded-lg bg-sky-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-sky-500 cursor-pointer"
          >
            <IconDownload />
            Download ({currentDpi} DPI)
          </button>
        </div>
      </div>
    </div>
  );
}
