'use client';

import { useCallback, useRef, useState } from "react";

interface ImageUploaderProps {
  currentImage: string | null;
  onImageUpload: (imageDataUrl: string) => void;
}

export function ImageUploader({ currentImage, onImageUpload }: ImageUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFiles = useCallback(
    (file?: File) => {
      if (!file) return;
      if (!file.type.startsWith("image/")) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result;
        if (typeof result === "string") {
          onImageUpload(result);
        }
      };
      reader.readAsDataURL(file);
    },
    [onImageUpload]
  );

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    handleFiles(file);
    event.target.value = "";
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    const file = event.dataTransfer.files?.[0];
    handleFiles(file);
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (!isDragging) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  if (currentImage) {
    return (
      <div className="relative w-full max-w-3xl mx-auto overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/70">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={currentImage}
          alt="Uploaded image"
          className="w-full h-auto max-h-[520px] object-contain"
        />
        <div className="absolute inset-x-0 bottom-0 flex flex-wrap items-center justify-between gap-2 bg-slate-950/80 px-4 py-3">
          <span className="text-sm text-slate-200">Image loaded</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onImageUpload("")}
              className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-100 transition hover:border-slate-500 hover:text-white cursor-pointer"
            >
              Replace image
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-500 cursor-pointer"
            >
              Upload different file
            </button>
          </div>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleInputChange}
        />
      </div>
    );
  }

  return (
    <div className="w-full max-w-3xl mx-auto">
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`flex min-h-[260px] w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-12 text-center transition-all cursor-pointer ${
          isDragging
            ? "border-sky-400 bg-sky-500/10 shadow-[0_0_30px_rgba(14,165,233,0.25)]"
            : "border-slate-700 bg-slate-900/70 hover:border-slate-500"
        }`}
        onClick={() => fileInputRef.current?.click()}
      >
        <svg
          className={`mb-4 h-16 w-16 ${isDragging ? "text-sky-300" : "text-slate-600"}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.6}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 16V4m0 0l-4 4m4-4l4 4M6 16h12m-9 4h6"
          />
        </svg>
        <div className="space-y-2">
          <p className="text-lg font-semibold text-white">Drop your chart or click to select</p>
          <p className="text-sm text-slate-400">
            Processed entirely in your browser. Supported formats: PNG, JPG, JPEG, GIF, WebP.
          </p>
        </div>
        <p className="mt-6 text-xs uppercase tracking-widest text-slate-500">Drop & Upload</p>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleInputChange}
      />
    </div>
  );
}
