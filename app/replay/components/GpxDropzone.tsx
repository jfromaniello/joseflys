"use client";

import { useState } from "react";

interface GpxDropzoneProps {
  /** Called with the dropped/selected file. */
  onFile: (file: File) => void;
  /** Opens the native file picker (wired to a hidden input by the parent). */
  onChoose: () => void;
}

/** Drag-and-drop target (plus a "Choose file" button) for loading a GPX track. */
export function GpxDropzone({ onFile, onChoose }: GpxDropzoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragOver(true);
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragOver(false);
        const file = e.dataTransfer.files?.[0];
        if (file) onFile(file);
      }}
      className={`mb-6 rounded-xl border-2 border-dashed p-10 text-center transition-colors ${
        isDragOver ? "border-sky-400 bg-sky-500/10" : "border-gray-600 bg-slate-900/40"
      }`}
    >
      <p className="text-white font-medium mb-2">Drag and drop your GPX file here</p>
      <p className="text-sm mb-4" style={{ color: "oklch(0.65 0.02 240)" }}>
        File must include track point timestamps (`time` in `trkpt`).
      </p>
      <button
        type="button"
        onClick={onChoose}
        className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-medium cursor-pointer transition-colors"
      >
        Choose GPX File
      </button>
    </div>
  );
}
