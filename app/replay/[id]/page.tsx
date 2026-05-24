import { notFound } from "next/navigation";
import { Suspense } from "react";
import { list } from "@vercel/blob";
import { GpxReplayClient } from "../GpxReplayClient";

export { generateMetadata } from "../metadata";

export const dynamic = "force-dynamic";

interface SharedReplayPageProps {
  params: Promise<{ id: string }>;
}

const SHORT_ID_PATTERN = /^[0-9A-Za-z]{8}$/;

async function fetchSharedGpx(id: string): Promise<string | null> {
  const { blobs } = await list({ prefix: `replays/${id}`, limit: 1 });
  const blob = blobs.find((b) => b.pathname === `replays/${id}.gpx`);
  if (!blob) return null;

  const res = await fetch(blob.url, { cache: "no-store" });
  if (!res.ok) return null;
  return res.text();
}

export default async function SharedReplayPage({ params }: SharedReplayPageProps) {
  const { id } = await params;

  if (!SHORT_ID_PATTERN.test(id)) {
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
