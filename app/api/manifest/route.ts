import { NextRequest, NextResponse } from "next/server";

const DEFAULT_NAME = "José's Aviation Tools";
const DEFAULT_SHORT_NAME = "Aviation Calc";

export async function GET(request: NextRequest) {
  const startUrl = request.nextUrl.searchParams.get("startUrl") || "/";
  const title = request.nextUrl.searchParams.get("title");

  // Use page title if provided, otherwise use defaults
  const name = title || DEFAULT_NAME;
  // For short_name, extract first part before " | " or use default
  const shortName = title?.split(" | ")[0] || DEFAULT_SHORT_NAME;

  const manifest = {
    name,
    short_name: shortName,
    description:
      "Aviation tools for flight planning, performance, and navigation",
    icons: [
      {
        src: "/android-chrome-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any maskable",
      },
      {
        src: "/android-chrome-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any maskable",
      },
    ],
    theme_color: "#1e293b",
    background_color: "#0f172a",
    display: "standalone",
    start_url: startUrl,
    scope: "/",
    orientation: "any",
    categories: ["utilities", "aviation"],
    lang: "en",
    dir: "ltr",
    prefer_related_applications: false,
  };

  return NextResponse.json(manifest, {
    headers: {
      "Content-Type": "application/manifest+json",
    },
  });
}
