import type { Metadata } from "next";
import { createPageMetadata } from "@/lib/metadata";

export async function generateMetadata(): Promise<Metadata> {
  return createPageMetadata({
    title: "Flight Replay 3D | Animated Flight Path Viewer",
    description:
      "Upload a GPX track and replay your flight in a 3D globe with time-based animation and speed controls.",
    keywords: [
      "GPX replay",
      "flight replay",
      "3D flight path",
      "Cesium GPX viewer",
      "aviation track playback",
      "flight route animation",
    ],
    path: "/replay",
  });
}
