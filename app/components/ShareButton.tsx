"use client";

import { useState } from "react";
import { PrintButton } from "./PrintButton";

interface ShareButtonProps {
  shareData: {
    title: string;
    text: string;
    url?: string;
  };
}

export function ShareButton({ shareData }: ShareButtonProps) {
  const [shareSuccess, setShareSuccess] = useState(false);

  const handleShare = async () => {
    try {
      // Use current URL if no URL is provided
      const urlToShare = shareData.url || (typeof window !== "undefined" ? window.location.href : "");

      if (navigator.share) {
        await navigator.share({
          ...shareData,
          url: urlToShare,
        });
      } else {
        await navigator.clipboard.writeText(urlToShare);
        setShareSuccess(true);
        setTimeout(() => setShareSuccess(false), 2000);
      }
    } catch (err) {
      console.log("Share cancelled or failed", err);
    }
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <div className="hidden md:block"></div>
      <button
        onClick={handleShare}
        className="flex items-center justify-center gap-2 px-4 sm:px-6 py-3 rounded-xl text-sm font-semibold transition-all hover:brightness-110 active:scale-95 cursor-pointer shadow-lg backdrop-blur-sm border-2"
        style={{
          background:
            "linear-gradient(to bottom right, oklch(0.65 0.15 230), oklch(0.55 0.15 230))",
          borderColor: "oklch(0.7 0.15 230)",
          color: "white",
        }}
      >
        {shareSuccess ? (
          <>
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
            <span className="hidden sm:inline">Copied to Clipboard!</span>
            <span className="sm:hidden">Copied!</span>
          </>
        ) : (
          <>
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
              />
            </svg>
            <span className="hidden sm:inline">Share Result</span>
            <span className="sm:hidden">Share</span>
          </>
        )}
      </button>

      <PrintButton />

      <div className="hidden md:block"></div>
    </div>
  );
}
