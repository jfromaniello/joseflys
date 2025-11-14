import type { Metadata } from "next";
import { createPageMetadata } from "@/lib/metadata";

export async function generateMetadata(): Promise<Metadata> {
  return createPageMetadata({
    title: "Local Chart | UTM Projection Route Chart",
    description:
      "Create printable route charts with fixed UTM scale for local VFR flights. Ideal for short-range navigation with accurate measurements using ruler or plotter.",
    keywords: [
      "local chart",
      "route chart",
      "VFR chart",
      "UTM projection",
      "UTM chart",
      "scale chart",
      "printable chart",
      "aviation chart",
      "flight chart",
      "navigation chart",
      "local navigation",
      "short range navigation",
      "VFR navigation",
      "ruler navigation",
      "plotter navigation",
      "fixed scale chart",
      "aeronautical chart",
      "flight planning chart",
    ],
    path: "/local-chart",
  });
}
