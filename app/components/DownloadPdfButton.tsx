"use client";

import { useState } from "react";
import { ArrowDownTrayIcon } from "@heroicons/react/24/outline";
import type { FlightPlan } from "@/lib/flightPlanStorage";
import { generateFlightPlanPDF } from "@/lib/flightPlanPdfExport";

interface DownloadPdfButtonProps {
  flightPlan: FlightPlan;
  variant?: "primary" | "secondary";
  size?: "sm" | "md";
  showText?: boolean;
}

export function DownloadPdfButton({
  flightPlan,
  variant = "secondary",
  size = "md",
  showText = true,
}: DownloadPdfButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false);

  const handleDownload = async () => {
    try {
      setIsGenerating(true);

      // Small delay to show loading state
      await new Promise((resolve) => setTimeout(resolve, 100));

      generateFlightPlanPDF(flightPlan);
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Failed to generate PDF. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const baseClasses = "inline-flex items-center gap-2 font-medium rounded-lg transition-colors cursor-pointer";

  const variantClasses = {
    primary: "bg-blue-600 hover:bg-blue-700 text-white",
    secondary: "bg-slate-700 hover:bg-slate-600 text-white",
  };

  const sizeClasses = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2 text-sm",
  };

  const iconSize = size === "sm" ? "h-4 w-4" : "h-5 w-5";

  return (
    <button
      onClick={handleDownload}
      disabled={isGenerating}
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${
        isGenerating ? "opacity-50 cursor-not-allowed" : ""
      }`}
      title="Download flight plan as PDF"
    >
      <ArrowDownTrayIcon className={iconSize} />
      {showText && (isGenerating ? "Generating..." : "Download PDF")}
    </button>
  );
}
