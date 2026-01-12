import type { Metadata } from "next";
import { ChartCutterClient } from "./ChartCutterClient";

export const metadata: Metadata = {
  title: "Chart Cutter | José Flies",
  description: "Crop scanned charts, align centimeter grids, and export images with precise DPI metadata for high-confidence printing.",
};

export default function ChartCutterPage() {
  return <ChartCutterClient />;
}
