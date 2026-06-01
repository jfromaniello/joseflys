interface FullscreenButtonProps {
  isFullscreen: boolean;
  onToggle: () => void;
}

/** Top-right toggle that enters/exits fullscreen for the 3D globe. */
export function FullscreenButton({ isFullscreen, onToggle }: FullscreenButtonProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
      title={isFullscreen ? "Exit fullscreen (Esc)" : "Enter fullscreen"}
      className="absolute top-3 right-3 z-[600] flex h-9 w-9 items-center justify-center rounded-md bg-slate-900/80 text-white border border-slate-600 cursor-pointer hover:bg-slate-800 transition-colors"
    >
      {isFullscreen ? (
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </button>
  );
}
