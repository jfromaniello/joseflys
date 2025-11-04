"use client";

import { useState } from "react";

interface ShareButtonProps {
  shareData: {
    title: string;
    text: string;
    url: string;
  };
  ogImageUrl?: string;
}

export function ShareButton({ shareData, ogImageUrl }: ShareButtonProps) {
  const [shareSuccess, setShareSuccess] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(shareData.url);
        setShareSuccess(true);
        setTimeout(() => setShareSuccess(false), 2000);
      }
    } catch (err) {
      console.log("Share cancelled or failed");
    }
  };

  const handleDownloadImage = async () => {
    if (!ogImageUrl) return;

    try {
      const response = await fetch(ogImageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'calculation-result.png';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 2000);
    } catch (err) {
      console.log("Download failed", err);
    }
  };

  return (
    <div className="flex gap-3 justify-center">
      <button
        onClick={handleShare}
        className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold transition-all hover:brightness-110 active:scale-95 cursor-pointer shadow-lg backdrop-blur-sm border-2"
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
            Copied to Clipboard!
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
            Share Result
          </>
        )}
      </button>

      {ogImageUrl && (
        <button
          onClick={handleDownloadImage}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold transition-all hover:brightness-110 active:scale-95 cursor-pointer shadow-lg backdrop-blur-sm border-2"
          style={{
            background:
              "linear-gradient(to bottom right, oklch(0.65 0.15 230), oklch(0.55 0.15 230))",
            borderColor: "oklch(0.7 0.15 230)",
            color: "white",
          }}
        >
          {downloadSuccess ? (
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
              Downloaded!
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
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                />
              </svg>
              Download Image
            </>
          )}
        </button>
      )}
    </div>
  );
}
