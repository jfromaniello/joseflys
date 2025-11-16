"use client";

import { useState } from "react";

interface TooltipProps {
  content: string;
}

export function Tooltip({ content }: TooltipProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative inline-block">
      <button
        type="button"
        tabIndex={-1}
        onClick={() => setIsOpen(!isOpen)}
        onBlur={() => setTimeout(() => setIsOpen(false), 200)}
        className="w-5 h-5 rounded-full border-2 flex items-center justify-center text-xs font-bold transition-colors hover:brightness-125 ml-1"
        style={{
          borderColor: "oklch(0.65 0.15 230)",
          color: "oklch(0.65 0.15 230)",
          backgroundColor: "transparent",
        }}
      >
        ?
      </button>

      {/* Tooltip popup */}
      {isOpen && (
        <div
          className="absolute z-[9999] w-64 p-3 rounded-lg shadow-xl text-sm leading-relaxed left-1/2 -translate-x-1/2 mt-2 border"
          style={{
            backgroundColor: "oklch(0.2 0.025 240)",
            borderColor: "oklch(0.65 0.15 230)",
            color: "oklch(0.85 0.02 240)",
          }}
        >
          <div
            className="absolute w-3 h-3 rotate-45 -top-1.5 left-1/2 -translate-x-1/2 border-l border-t z-[9999]"
            style={{
              backgroundColor: "oklch(0.2 0.025 240)",
              borderColor: "oklch(0.65 0.15 230)",
            }}
          />
          {content}
        </div>
      )}
    </div>
  );
}
