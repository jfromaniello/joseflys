import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense, cache } from "react";
import { GpxReplayClient } from "../GpxReplayClient";
import { createPageMetadata } from "@/lib/metadata";
import { computeGpxStats, formatTrackDuration } from "@/lib/gpxStats";
import { formatDistance } from "@/lib/formatters";
import { fetchSharedReplayGpx, REPLAY_SHORT_ID_PATTERN } from "@/lib/replayBlob";

export const dynamic = "force-dynamic";

interface SharedReplayPageProps {
  params: Promise<{ id: string }>;
}

// Wrapped in React cache so generateMetadata and the page render share a single
// blob lookup + download per request.
const fetchSharedGpx = cache(fetchSharedReplayGpx);

export async function generateMetadata({
  params,
}: SharedReplayPageProps): Promise<Metadata> {
  const { id } = await params;

  let stats = null;
  try {
    const gpx = await fetchSharedGpx(id);
    if (gpx) stats = computeGpxStats(gpx);
  } catch (error) {
    console.error(`[/replay/${id}] Metadata stats error:`, error);
  }

  if (!stats) {
    return createPageMetadata({
      title: "Shared Flight Replay | GPX Replay 3D",
      description:
        "Replay this shared flight track in an animated 3D globe with time-based playback and speed controls.",
      keywords: ["GPX replay", "shared flight", "3D flight path", "flight replay"],
      path: `/replay/${id}`,
    });
  }

  const summary = [
    `${formatDistance(stats.distanceNm, 1)} NM`,
    `max ${Math.round(stats.maxAltitudeFt).toLocaleString("en-US")} ft`,
    formatTrackDuration(stats.durationMs),
    `peak ${Math.round(stats.maxSpeedKt)} KT`,
  ].join(" · ");

  return createPageMetadata({
    title: "Shared Flight Replay | GPX Replay 3D",
    description: `${summary} — replay this flight in an animated 3D globe with time-based playback and speed controls.`,
    keywords: ["GPX replay", "shared flight", "3D flight path", "flight replay"],
    path: `/replay/${id}`,
  });
}

export default async function SharedReplayPage({ params }: SharedReplayPageProps) {
  const { id } = await params;

  if (!REPLAY_SHORT_ID_PATTERN.test(id)) {
    notFound();
  }

  let gpx: string | null = null;
  try {
    gpx = await fetchSharedGpx(id);
  } catch (error) {
    console.error(`[/replay/${id}] Blob fetch error:`, error);
    notFound();
  }

  if (!gpx) {
    notFound();
  }

  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-slate-900 via-blue-950 to-slate-900">
          <div className="text-white">Loading...</div>
        </div>
      }
    >
      <GpxReplayClient initialGpx={gpx} initialGpxName={`shared-${id}.gpx`} />
    </Suspense>
  );
}
