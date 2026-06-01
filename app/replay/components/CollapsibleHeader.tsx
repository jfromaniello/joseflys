"use client";

interface CollapsibleHeaderProps {
  title: string;
  count: number;
  hint: string;
  collapsed: boolean;
  onToggle: () => void;
}

/** Clickable section header that toggles a collapsible body (rotating chevron). */
export function CollapsibleHeader({ title, count, hint, collapsed, onToggle }: CollapsibleHeaderProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={!collapsed}
      className="flex w-full items-center gap-2 border-b border-slate-700/70 px-4 py-2.5 text-left cursor-pointer hover:bg-slate-800/40 transition-colors"
    >
      <svg
        viewBox="0 0 24 24"
        className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${collapsed ? "" : "rotate-90"}`}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <div className="min-w-0">
        <h3 className="text-sm font-semibold text-slate-200">
          {title} <span className="font-normal text-slate-500">· {count}</span>
        </h3>
        {!collapsed ? <p className="text-[11px] text-slate-500">{hint}</p> : null}
      </div>
    </button>
  );
}
