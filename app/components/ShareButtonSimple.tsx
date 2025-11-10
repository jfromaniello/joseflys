"use client";

import { useState } from "react";

interface ShareButtonSimpleProps {
  shareData: {
    title: string;
    text: string;
    url?: string;
  };
}

export function ShareButtonSimple({ shareData }: ShareButtonSimpleProps) {
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
    <button
      onClick={handleShare}
      className="w-full px-6 py-3 rounded-xl border-2 border-gray-600 hover:border-gray-500 hover:bg-slate-700/50 transition-all text-center flex items-center justify-center gap-2 cursor-pointer"
      style={{ color: "oklch(0.7 0.02 240)" }}
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
          <span className="text-sm font-medium">Copied!</span>
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
          <span className="text-sm font-medium">Share</span>
        </>
      )}
    </button>
  );
}
