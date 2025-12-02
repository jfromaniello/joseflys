"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, Suspense } from "react";

function DynamicManifestInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Build the full URL including search params
    const fullPath = searchParams.toString()
      ? `${pathname}?${searchParams.toString()}`
      : pathname;

    // Find existing manifest link or create one
    let manifestLink = document.querySelector(
      'link[rel="manifest"]'
    ) as HTMLLinkElement | null;

    if (!manifestLink) {
      manifestLink = document.createElement("link");
      manifestLink.rel = "manifest";
      document.head.appendChild(manifestLink);
    }

    // Get the page title for the manifest
    const pageTitle = document.title;

    // Update the manifest href with the current path and title
    const params = new URLSearchParams({
      startUrl: fullPath,
      title: pageTitle,
    });
    manifestLink.href = `/api/manifest?${params.toString()}`;
  }, [pathname, searchParams]);

  return null;
}

export function DynamicManifest() {
  return (
    <Suspense fallback={null}>
      <DynamicManifestInner />
    </Suspense>
  );
}
