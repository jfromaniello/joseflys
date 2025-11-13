import Script from "next/script";

/**
 * Google Analytics 4 Component
 *
 * Loads Google Analytics tracking scripts when NEXT_PUBLIC_GA_MEASUREMENT_ID is set.
 *
 * Usage:
 * 1. Get your GA4 Measurement ID from https://analytics.google.com/
 * 2. Create a .env.local file and add: NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX
 * 3. This component is already included in the root layout
 *
 * The component uses Next.js Script component with strategy="afterInteractive" to:
 * - Load scripts after the page becomes interactive
 * - Not block initial page rendering
 * - Track page views and events automatically
 */
export function Analytics() {
  const measurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

  // Don't render anything if measurement ID is not configured
  if (!measurementId) {
    return null;
  }

  return (
    <>
      {/* Google Analytics gtag.js script */}
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`}
        strategy="afterInteractive"
      />

      {/* Google Analytics initialization */}
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${measurementId}', {
            page_path: window.location.pathname,
          });
        `}
      </Script>
    </>
  );
}
