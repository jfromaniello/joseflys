'use client';

import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { CropArea } from "@/lib/chartCutter";

interface ImageCropperProps {
  imageSrc: string;
  onCropComplete: (cropArea: CropArea) => void;
  initialCrop?: CropArea;
}

type DragHandle = "move" | "nw" | "ne" | "sw" | "se" | null;

export function ImageCropper({ imageSrc, onCropComplete, initialCrop }: ImageCropperProps) {
  const imageRef = useRef<HTMLImageElement>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [startPoint, setStartPoint] = useState({ x: 0, y: 0 });
  const [currentCrop, setCurrentCrop] = useState<CropArea>(
    initialCrop || { x: 0, y: 0, width: 0, height: 0 }
  );
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [displaySize, setDisplaySize] = useState({ width: 0, height: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragHandle, setDragHandle] = useState<DragHandle>(null);
  const [dragStartCrop, setDragStartCrop] = useState<CropArea>({ x: 0, y: 0, width: 0, height: 0 });

  useEffect(() => {
    if (!imageRef.current) return;
    const img = imageRef.current;

    const handleLoad = () => {
      setImageSize({ width: img.naturalWidth, height: img.naturalHeight });
      const defaultCrop = initialCrop || {
        x: img.naturalWidth * 0.1,
        y: img.naturalHeight * 0.1,
        width: img.naturalWidth * 0.8,
        height: img.naturalHeight * 0.8,
      };
      setCurrentCrop(defaultCrop);
      const rect = img.getBoundingClientRect();
      setDisplaySize({ width: rect.width, height: rect.height });
    };

    if (img.complete) {
      handleLoad();
    } else {
      img.addEventListener("load", handleLoad);
      return () => img.removeEventListener("load", handleLoad);
    }
  }, [imageSrc, initialCrop]);

  useEffect(() => {
    if (!imageRef.current) return;
    const img = imageRef.current;

    const updateDisplaySize = () => {
      const rect = img.getBoundingClientRect();
      if (rect.width && rect.height) {
        setDisplaySize({ width: rect.width, height: rect.height });
      }
    };

    updateDisplaySize();

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(updateDisplaySize);
      resizeObserver.observe(img);
    }

    window.addEventListener("resize", updateDisplaySize);
    return () => {
      window.removeEventListener("resize", updateDisplaySize);
      resizeObserver?.disconnect();
    };
  }, [imageSrc]);

  const getScaledCoordinates = (clientX: number, clientY: number) => {
    if (!imageRef.current) return { x: 0, y: 0 };
    const rect = imageRef.current.getBoundingClientRect();
    const scaleX = imageRef.current.naturalWidth / rect.width;
    const scaleY = imageRef.current.naturalHeight / rect.height;

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  };

  const handleMouseDown = (event: React.MouseEvent, handle: DragHandle = null) => {
    event.preventDefault();
    event.stopPropagation();
    const coords = getScaledCoordinates(event.clientX, event.clientY);

    if (handle) {
      setIsDragging(true);
      setDragHandle(handle);
      setStartPoint(coords);
      setDragStartCrop({ ...currentCrop });
    } else {
      setIsSelecting(true);
      setStartPoint(coords);
      setCurrentCrop({ ...coords, width: 0, height: 0 });
    }
  };

  const handleMouseMove = (event: React.MouseEvent) => {
    if (!isSelecting && !isDragging) return;
    const coords = getScaledCoordinates(event.clientX, event.clientY);

    if (isSelecting) {
      const newCrop: CropArea = {
        x: Math.min(startPoint.x, coords.x),
        y: Math.min(startPoint.y, coords.y),
        width: Math.abs(coords.x - startPoint.x),
        height: Math.abs(coords.y - startPoint.y),
      };

      newCrop.x = Math.max(0, newCrop.x);
      newCrop.y = Math.max(0, newCrop.y);
      newCrop.width = Math.min(newCrop.width, imageSize.width - newCrop.x);
      newCrop.height = Math.min(newCrop.height, imageSize.height - newCrop.y);
      setCurrentCrop(newCrop);
    } else if (isDragging && dragHandle) {
      const newCrop = { ...dragStartCrop };
      const deltaX = coords.x - startPoint.x;
      const deltaY = coords.y - startPoint.y;

      switch (dragHandle) {
        case "move":
          newCrop.x = Math.max(0, Math.min(imageSize.width - dragStartCrop.width, dragStartCrop.x + deltaX));
          newCrop.y = Math.max(0, Math.min(imageSize.height - dragStartCrop.height, dragStartCrop.y + deltaY));
          break;
        case "nw": {
          const maxDeltaX = dragStartCrop.x;
          const maxDeltaY = dragStartCrop.y;
          const actualDeltaX = Math.max(-maxDeltaX, Math.min(deltaX, dragStartCrop.width - 20));
          const actualDeltaY = Math.max(-maxDeltaY, Math.min(deltaY, dragStartCrop.height - 20));
          newCrop.x = dragStartCrop.x + actualDeltaX;
          newCrop.y = dragStartCrop.y + actualDeltaY;
          newCrop.width = dragStartCrop.width - actualDeltaX;
          newCrop.height = dragStartCrop.height - actualDeltaY;
          break;
        }
        case "ne": {
          const maxDeltaX = imageSize.width - (dragStartCrop.x + dragStartCrop.width);
          const maxDeltaY = dragStartCrop.y;
          const actualDeltaX = Math.max(-(dragStartCrop.width - 20), Math.min(deltaX, maxDeltaX));
          const actualDeltaY = Math.max(-maxDeltaY, Math.min(deltaY, dragStartCrop.height - 20));
          newCrop.y = dragStartCrop.y + actualDeltaY;
          newCrop.width = dragStartCrop.width + actualDeltaX;
          newCrop.height = dragStartCrop.height - actualDeltaY;
          break;
        }
        case "sw": {
          const maxDeltaX = dragStartCrop.x;
          const maxDeltaY = imageSize.height - (dragStartCrop.y + dragStartCrop.height);
          const actualDeltaX = Math.max(-maxDeltaX, Math.min(deltaX, dragStartCrop.width - 20));
          const actualDeltaY = Math.max(-(dragStartCrop.height - 20), Math.min(deltaY, maxDeltaY));
          newCrop.x = dragStartCrop.x + actualDeltaX;
          newCrop.width = dragStartCrop.width - actualDeltaX;
          newCrop.height = dragStartCrop.height + actualDeltaY;
          break;
        }
        case "se": {
          const maxDeltaX = imageSize.width - (dragStartCrop.x + dragStartCrop.width);
          const maxDeltaY = imageSize.height - (dragStartCrop.y + dragStartCrop.height);
          const actualDeltaX = Math.max(-(dragStartCrop.width - 20), Math.min(deltaX, maxDeltaX));
          const actualDeltaY = Math.max(-(dragStartCrop.height - 20), Math.min(deltaY, maxDeltaY));
          newCrop.width = dragStartCrop.width + actualDeltaX;
          newCrop.height = dragStartCrop.height + actualDeltaY;
          break;
        }
        default:
          break;
      }

      setCurrentCrop(newCrop);
    }
  };

  const handleMouseUp = () => {
    setIsSelecting(false);
    setIsDragging(false);
    setDragHandle(null);
  };

  const handleResetCrop = () => {
    const defaultCrop = {
      x: imageSize.width * 0.1,
      y: imageSize.height * 0.1,
      width: imageSize.width * 0.8,
      height: imageSize.height * 0.8,
    };
    setCurrentCrop(defaultCrop);
  };

  const scaledCrop = useMemo(() => {
    if (!imageSize.width || !imageSize.height || !displaySize.width || !displaySize.height) {
      return null;
    }
    const scaleX = displaySize.width / imageSize.width;
    const scaleY = displaySize.height / imageSize.height;
    return {
      style: {
        left: `${currentCrop.x * scaleX}px`,
        top: `${currentCrop.y * scaleY}px`,
        width: `${currentCrop.width * scaleX}px`,
        height: `${currentCrop.height * scaleY}px`,
      } as CSSProperties,
      values: {
        left: currentCrop.x * scaleX,
        top: currentCrop.y * scaleY,
        width: currentCrop.width * scaleX,
        height: currentCrop.height * scaleY,
      },
    };
  }, [currentCrop, imageSize, displaySize]);

  const overlayReady = currentCrop.width > 0 && currentCrop.height > 0 && !!scaledCrop;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-900/60 px-4 py-3">
        <div className="flex items-center gap-2 text-sm text-slate-300">
          <svg className="h-4 w-4 text-sky-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16M4 17h16M12 7v10" />
          </svg>
          Drag the handles or draw a new selection.
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleResetCrop}
            className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-100 transition hover:border-slate-500 hover:text-white cursor-pointer"
          >
            Reset
          </button>
          <button
            type="button"
            onClick={() => onCropComplete(currentCrop)}
            className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-400 cursor-pointer"
          >
            Save crop
          </button>
        </div>
      </div>

      <div
        className="relative inline-block w-full overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/80"
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          ref={imageRef}
          src={imageSrc}
          alt="Image to crop"
          className="block h-auto max-h-[620px] w-full select-none object-contain"
          draggable={false}
          onMouseDown={(event) => handleMouseDown(event)}
        />

        {overlayReady && scaledCrop && (
          <>
            <svg className="pointer-events-none absolute inset-0" style={{ width: "100%", height: "100%" }}>
              <defs>
                <mask id="cropMask">
                  <rect x="0" y="0" width="100%" height="100%" fill="white" />
                  <rect
                    x={scaledCrop.values.left}
                    y={scaledCrop.values.top}
                    width={scaledCrop.values.width}
                    height={scaledCrop.values.height}
                    fill="black"
                  />
                </mask>
              </defs>
              <rect x="0" y="0" width="100%" height="100%" fill="rgba(2,6,23,0.75)" mask="url(#cropMask)" />
            </svg>

            <div
              className="absolute border border-sky-300 shadow-[0_0_25px_rgba(14,165,233,0.35)]"
              style={scaledCrop.style}
            >
              <div className="absolute inset-0 cursor-move" onMouseDown={(event) => handleMouseDown(event, "move")} />

              {(["nw", "ne", "sw", "se"] as DragHandle[]).map((handle) => (
                <div
                  key={handle}
                  className={`absolute h-4 w-4 rounded-full border-2 border-sky-300 bg-slate-900 ${
                    handle === "nw"
                      ? "-top-2 -left-2 cursor-nw-resize"
                      : handle === "ne"
                      ? "-top-2 -right-2 cursor-ne-resize"
                      : handle === "sw"
                      ? "-bottom-2 -left-2 cursor-sw-resize"
                      : "-bottom-2 -right-2 cursor-se-resize"
                  }`}
                  onMouseDown={(event) => handleMouseDown(event, handle)}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {currentCrop.width > 0 && currentCrop.height > 0 && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 px-4 py-3 text-sm text-slate-300">
          Selected area: <span className="font-semibold text-white">{Math.round(currentCrop.width)}px</span> ×
          <span className="font-semibold text-white"> {Math.round(currentCrop.height)}px</span>
        </div>
      )}
    </div>
  );
}
