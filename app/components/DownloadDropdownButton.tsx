"use client";

import { useState, useRef, useEffect } from "react";
import type { FlightPlan } from "@/lib/flightPlan";
import { generateFlightPlanPDF } from "@/lib/flightPlan";
import { generateFlightPlanXLS } from "@/lib/flightPlan";
import { ChevronDownIcon } from "@heroicons/react/24/outline";

interface DownloadDropdownButtonProps {
  flightPlan: FlightPlan;
  variant?: "primary" | "secondary";
  size?: "sm" | "md" | "lg";
  showText?: boolean;
}

export function DownloadDropdownButton({
  flightPlan,
  variant = "secondary",
  size = "md",
  showText = true,
}: DownloadDropdownButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  const handleDownload = async (format: "pdf" | "excel") => {
    try {
      setIsGenerating(true);
      setIsOpen(false);

      // Small delay to show loading state
      await new Promise((resolve) => setTimeout(resolve, 100));

      if (format === "pdf") {
        generateFlightPlanPDF(flightPlan);
      } else {
        generateFlightPlanXLS(flightPlan);
      }
    } catch (error) {
      console.error(`Error generating ${format}:`, error);
      alert(`Failed to generate ${format.toUpperCase()} file. Please try again.`);
    } finally {
      setIsGenerating(false);
    }
  };

  const baseClasses = "inline-flex items-center gap-2 rounded font-medium transition-colors cursor-pointer relative";

  const variantClasses = {
    primary: "bg-blue-600 text-white hover:bg-blue-700",
    secondary: "bg-slate-700 text-slate-200 hover:bg-slate-600",
  };

  // Adjust padding based on whether text is shown
  const sizeClasses = {
    sm: showText ? "px-3 py-1.5 text-sm" : "p-2",
    md: showText ? "px-4 py-2 text-sm" : "p-2",
    lg: showText ? "px-5 py-2.5 text-base" : "p-2.5",
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isGenerating}
        className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${
          isGenerating ? "opacity-50 cursor-not-allowed" : ""
        }`}
      >
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
        {showText && (
          <span>{isGenerating ? "Generating..." : "Download"}</span>
        )}
        <ChevronDownIcon className="w-4 h-4" />
      </button>

      {isOpen && !isGenerating && (
        <div className="absolute right-0 mt-2 w-48 rounded-lg bg-slate-800 shadow-lg ring-1 ring-black ring-opacity-5 z-50">
          <div className="py-1">
            <button
              onClick={() => handleDownload("pdf")}
              className="w-full text-left px-4 py-2 text-sm text-slate-200 hover:bg-slate-700 flex items-center gap-3 cursor-pointer transition-colors"
            >
              {/* PDF Icon - Red document */}
              <svg
                className="w-5 h-5 text-red-400"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <path d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                <path d="M9 12h6M9 16h6" />
              </svg>
              <span>Download as PDF</span>
            </button>
            <button
              onClick={() => handleDownload("excel")}
              className="w-full text-left px-4 py-2 text-sm text-slate-200 hover:bg-slate-700 flex items-center gap-3 cursor-pointer transition-colors"
            >
              {/* Excel Icon - Green table */}
              <svg
                className="w-5 h-5 text-green-400"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <path d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                <path d="M9 9h6M9 13h6M9 17h6M12 9v8" />
              </svg>
              <span>Download as Excel</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
