"use client";

import { LinkIcon } from "@heroicons/react/24/outline";
import { useCallback } from "react";

interface CardAnchorProps {
  id: string;
}

export function CardAnchor({ id }: CardAnchorProps) {
  const handleClick = useCallback(() => {
    // Update URL without reloading
    const url = new URL(window.location.href);
    url.hash = id;
    window.history.replaceState(null, "", url.toString());

    // Copy to clipboard
    navigator.clipboard.writeText(url.toString());

    // Scroll to element
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  }, [id]);

  return (
    <button
      onClick={handleClick}
      className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-700/50 transition-colors cursor-pointer"
      title="Copy link to this section"
    >
      <LinkIcon className="w-4 h-4" />
    </button>
  );
}
