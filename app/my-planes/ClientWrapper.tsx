"use client";

import dynamic from "next/dynamic";

const MyPlanesClient = dynamic(() => import("./MyPlanesClient"), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-linear-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center">
      <div className="text-slate-400 text-lg">Loading...</div>
    </div>
  ),
});

export function ClientWrapper() {
  return <MyPlanesClient />;
}
