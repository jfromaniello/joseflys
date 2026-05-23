import { Suspense } from "react";
import { GpxReplayClient } from "./GpxReplayClient";

export { generateMetadata } from "./metadata";

export default function ReplayPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-slate-900 via-blue-950 to-slate-900">
          <div className="text-white">Loading...</div>
        </div>
      }
    >
      <GpxReplayClient />
    </Suspense>
  );
}
