"use client";

import dynamic from "next/dynamic";

const CourseCalculatorClient = dynamic(() => import("./CourseCalculatorClient").then(mod => ({ default: mod.CourseCalculatorClient })), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-linear-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center">
      <div className="text-slate-400 text-lg">Loading...</div>
    </div>
  ),
});

interface ClientWrapperProps {
  initialTh: string;
  initialTas: string;
  initialWd: string;
  initialWs: string;
  initialMagVar: string; // WMM convention (positive=E, negative=W)
  initialDist: string;
  initialFf: string;
  initialDevTable: string;
  initialDesc: string;
  initialSpeedUnit: string;
  initialFuelUnit: string;
  initialWaypoints: string;
  initialDepTime: string;
  initialElapsedMin: string;
  initialPrevFuel: string;
}

export function ClientWrapper(props: ClientWrapperProps) {
  return <CourseCalculatorClient {...props} />;
}
