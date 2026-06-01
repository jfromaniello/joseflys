import { Tooltip } from "../../components/Tooltip";

interface StatCardProps {
  label: string;
  value: string;
  tooltip?: string;
}

/** A single labeled metric card, with an optional explanatory tooltip. */
export function StatCard({ label, value, tooltip }: StatCardProps) {
  return (
    <div className="flex flex-col h-full rounded-lg border border-gray-700 bg-slate-900/40 p-3">
      <div
        className="text-xs uppercase tracking-wide flex items-center gap-2"
        style={{ color: "oklch(0.6 0.02 240)" }}
      >
        <span>{label}</span>
        {tooltip ? <Tooltip content={tooltip} /> : null}
      </div>
      <div className="mt-auto pt-2 text-white text-lg font-semibold tabular-nums">{value}</div>
    </div>
  );
}
