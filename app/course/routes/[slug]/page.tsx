import { notFound } from "next/navigation";
import { Metadata } from "next";
import { Geodesic } from "geographiclib-geodesic";
import { magvar } from "magvar";
import { getRouteBySlug, getAllRouteSlugs, VfrRoute } from "@/data/vfr-routes";
import { fetchMetar } from "@/lib/clients/metar";
import { ClientWrapper } from "../../ClientWrapper";
import { formatCourse } from "@/lib/formatters";
import Link from "next/link";

interface RoutePageProps {
  params: Promise<{ slug: string }>;
}

// Force dynamic rendering to fetch live METAR data
export const dynamic = "force-dynamic";

// Generate static params for all routes (for metadata generation)
export async function generateStaticParams() {
  const slugs = getAllRouteSlugs();
  return slugs.map((slug) => ({ slug }));
}

// Generate metadata for SEO
export async function generateMetadata({ params }: RoutePageProps): Promise<Metadata> {
  const { slug } = await params;
  const route = getRouteBySlug(slug);

  if (!route) {
    return { title: "Route Not Found" };
  }

  return {
    title: route.seoTitle,
    description: route.metaDescription,
    keywords: route.keywords,
    openGraph: {
      title: route.seoTitle,
      description: route.metaDescription,
      type: "website",
      url: `https://joseflys.com/course/routes/${route.slug}`,
    },
    twitter: {
      card: "summary_large_image",
      title: route.seoTitle,
      description: route.metaDescription,
    },
    alternates: {
      canonical: `https://joseflys.com/course/routes/${route.slug}`,
    },
  };
}

// Calculate route data
function calculateRouteData(route: VfrRoute) {
  const geod = Geodesic.WGS84;
  const result = geod.Inverse(
    route.origin.lat,
    route.origin.lon,
    route.destination.lat,
    route.destination.lon
  );

  const distanceNm = (result.s12 ?? 0) / 1852;
  const trueCourse = result.azi1 ?? 0;
  const normalizedTrueCourse = trueCourse < 0 ? trueCourse + 360 : trueCourse;

  // Get magnetic variation at midpoint
  const midLat = (route.origin.lat + route.destination.lat) / 2;
  const midLon = (route.origin.lon + route.destination.lon) / 2;
  const magVariation = magvar(midLat, midLon, 0);

  return {
    distanceNm: Math.round(distanceNm * 10) / 10,
    trueCourse: Math.round(normalizedTrueCourse),
    magVariation: Math.round(magVariation * 10) / 10,
  };
}

// Custom header component for route pages
function RouteHeader({ route, routeData, flightTimeMinutes, windDir, windSpeed }: {
  route: VfrRoute;
  routeData: { distanceNm: number; trueCourse: number };
  flightTimeMinutes: number;
  windDir?: number;
  windSpeed?: number;
}) {
  const flightTimeHours = Math.floor(flightTimeMinutes / 60);
  const flightTimeRemainder = flightTimeMinutes % 60;

  return (
    <div className="text-center mb-6 max-w-4xl">
      {/* Breadcrumb */}
      <nav className="text-xs mb-3" style={{ color: "oklch(0.5 0.02 240)" }}>
        <Link href="/" className="hover:underline">Home</Link>
        <span className="mx-1">/</span>
        <Link href="/course" className="hover:underline">Course Calculator</Link>
        <span className="mx-1">/</span>
        <span style={{ color: "oklch(0.65 0.02 240)" }}>{route.origin.icao} to {route.destination.icao}</span>
      </nav>

      {/* Title */}
      <h1 className="text-2xl sm:text-3xl font-bold mb-3" style={{ color: "white" }}>
        {route.origin.icao} → {route.destination.icao}
        <span className="block text-base sm:text-lg font-normal mt-1" style={{ color: "oklch(0.65 0.02 240)" }}>
          {route.origin.city} to {route.destination.city}
        </span>
      </h1>

      {/* Quick Stats */}
      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-sm" style={{ color: "oklch(0.65 0.02 240)" }}>
        <span><strong style={{ color: "oklch(0.75 0.15 230)" }}>{routeData.distanceNm}</strong> NM</span>
        <span className="hidden sm:inline">•</span>
        <span><strong style={{ color: "oklch(0.75 0.15 230)" }}>{formatCourse(routeData.trueCourse)}</strong> TC</span>
        <span className="hidden sm:inline">•</span>
        <span><strong style={{ color: "oklch(0.75 0.15 230)" }}>{flightTimeHours > 0 ? `${flightTimeHours}h ${flightTimeRemainder}m` : `${flightTimeMinutes}m`}</strong> @ {route.typicalTas}kt</span>
        {windDir !== undefined && windSpeed !== undefined && (
          <>
            <span className="hidden sm:inline">•</span>
            <span>Wind: <strong style={{ color: "oklch(0.75 0.15 230)" }}>{String(windDir).padStart(3, '0')}°/{windSpeed}kt</strong></span>
          </>
        )}
      </div>

      <p className="text-xs mt-2" style={{ color: "oklch(0.5 0.02 240)" }}>
        Pre-loaded with current METAR wind. Adjust values as needed.
      </p>
    </div>
  );
}

// SEO content component
function RouteContent({ route }: { route: VfrRoute }) {
  return (
    <div className="w-full max-w-4xl mx-auto px-4 sm:px-0 py-8 mt-4">
      {/* Full Page Title for SEO */}
      <h2 className="text-2xl font-bold mb-4" style={{ color: "white" }}>
        {route.pageTitle}
      </h2>
      <p className="leading-relaxed mb-8" style={{ color: "oklch(0.7 0.02 240)" }}>
        {route.introduction}
      </p>

      {/* Route Overview */}
      <section className="mb-10">
        <h3 className="text-xl font-bold mb-4" style={{ color: "white" }}>
          {route.routeOverview.heading}
        </h3>
        <p className="leading-relaxed" style={{ color: "oklch(0.75 0.02 240)" }}>
          {route.routeOverview.content}
        </p>
      </section>

      {/* Airport Information */}
      <section className="mb-10">
        <h3 className="text-xl font-bold mb-4" style={{ color: "white" }}>
          Airport Information
        </h3>
        <div className="grid md:grid-cols-2 gap-6">
          {/* Origin */}
          <div className="p-4 rounded-xl bg-slate-800/50 border border-gray-700">
            <h4 className="text-lg font-semibold mb-3" style={{ color: "oklch(0.85 0.15 230)" }}>
              Departure: {route.origin.icao}
            </h4>
            <dl className="space-y-2 text-sm" style={{ color: "oklch(0.7 0.02 240)" }}>
              <div className="flex justify-between">
                <dt>Name:</dt>
                <dd className="text-right max-w-[60%]">{route.origin.name}</dd>
              </div>
              <div className="flex justify-between">
                <dt>Location:</dt>
                <dd>{route.origin.city}, {route.origin.state}</dd>
              </div>
              <div className="flex justify-between">
                <dt>Elevation:</dt>
                <dd>{route.origin.elevation} ft</dd>
              </div>
              {route.origin.atis && (
                <div className="flex justify-between">
                  <dt>ATIS:</dt>
                  <dd>{route.origin.atis}</dd>
                </div>
              )}
            </dl>
          </div>

          {/* Destination */}
          <div className="p-4 rounded-xl bg-slate-800/50 border border-gray-700">
            <h4 className="text-lg font-semibold mb-3" style={{ color: "oklch(0.85 0.15 140)" }}>
              Arrival: {route.destination.icao}
            </h4>
            <dl className="space-y-2 text-sm" style={{ color: "oklch(0.7 0.02 240)" }}>
              <div className="flex justify-between">
                <dt>Name:</dt>
                <dd className="text-right max-w-[60%]">{route.destination.name}</dd>
              </div>
              <div className="flex justify-between">
                <dt>Location:</dt>
                <dd>{route.destination.city}, {route.destination.state}</dd>
              </div>
              <div className="flex justify-between">
                <dt>Elevation:</dt>
                <dd>{route.destination.elevation} ft</dd>
              </div>
              {route.destination.atis && (
                <div className="flex justify-between">
                  <dt>ATIS:</dt>
                  <dd>{route.destination.atis}</dd>
                </div>
              )}
            </dl>
          </div>
        </div>
      </section>

      {/* Flight Planning */}
      <section className="mb-10">
        <h3 className="text-xl font-bold mb-4" style={{ color: "white" }}>
          {route.flightPlanning.heading}
        </h3>
        <p className="leading-relaxed mb-4" style={{ color: "oklch(0.75 0.02 240)" }}>
          {route.flightPlanning.content}
        </p>
        <ul className="space-y-2" style={{ color: "oklch(0.7 0.02 240)" }}>
          {route.flightPlanning.bulletPoints.map((point, index) => (
            <li key={index} className="flex items-start gap-2">
              <span style={{ color: "oklch(0.65 0.15 230)" }}>•</span>
              <span>{point}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Airspace */}
      <section className="mb-10">
        <h3 className="text-xl font-bold mb-4" style={{ color: "white" }}>
          {route.airspaceNavigation.heading}
        </h3>
        <p className="leading-relaxed mb-4" style={{ color: "oklch(0.75 0.02 240)" }}>
          {route.airspaceNavigation.content}
        </p>
        <ul className="space-y-2" style={{ color: "oklch(0.7 0.02 240)" }}>
          {route.airspaceNavigation.bulletPoints.map((point, index) => (
            <li key={index} className="flex items-start gap-2">
              <span style={{ color: "oklch(0.65 0.15 230)" }}>•</span>
              <span>{point}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Suggested Altitudes */}
      <section className="mb-10">
        <h3 className="text-xl font-bold mb-4" style={{ color: "white" }}>
          Suggested VFR Cruising Altitudes
        </h3>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-slate-800/50 border border-gray-700">
            <h4 className="font-semibold mb-2" style={{ color: "oklch(0.85 0.02 240)" }}>
              Eastbound (0°-179°)
            </h4>
            <p className="text-sm" style={{ color: "oklch(0.7 0.02 240)" }}>
              {route.suggestedAltitudes.eastbound.map(alt => `${alt.toLocaleString()} ft`).join(", ")}
            </p>
            <p className="text-xs mt-2" style={{ color: "oklch(0.55 0.02 240)" }}>
              Odd thousands + 500 ft for VFR
            </p>
          </div>
          <div className="p-4 rounded-xl bg-slate-800/50 border border-gray-700">
            <h4 className="font-semibold mb-2" style={{ color: "oklch(0.85 0.02 240)" }}>
              Westbound (180°-359°)
            </h4>
            <p className="text-sm" style={{ color: "oklch(0.7 0.02 240)" }}>
              {route.suggestedAltitudes.westbound.map(alt => `${alt.toLocaleString()} ft`).join(", ")}
            </p>
            <p className="text-xs mt-2" style={{ color: "oklch(0.55 0.02 240)" }}>
              Even thousands + 500 ft for VFR
            </p>
          </div>
        </div>
      </section>

      {/* Weather */}
      <section className="mb-10">
        <h3 className="text-xl font-bold mb-4" style={{ color: "white" }}>
          {route.weatherConsiderations.heading}
        </h3>
        <p className="leading-relaxed" style={{ color: "oklch(0.75 0.02 240)" }}>
          {route.weatherConsiderations.content}
        </p>
      </section>

      {/* Landmarks */}
      <section className="mb-10">
        <h3 className="text-xl font-bold mb-4" style={{ color: "white" }}>
          {route.landmarks.heading}
        </h3>
        <div className="grid sm:grid-cols-2 gap-3">
          {route.landmarks.items.map((landmark, index) => (
            <div key={index} className="p-3 rounded-lg bg-slate-800/30 border border-gray-700">
              <h4 className="font-semibold mb-1 text-sm" style={{ color: "oklch(0.85 0.15 230)" }}>
                {landmark.name}
              </h4>
              <p className="text-xs" style={{ color: "oklch(0.65 0.02 240)" }}>
                {landmark.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Alternates */}
      <section className="mb-10">
        <h3 className="text-xl font-bold mb-4" style={{ color: "white" }}>
          Alternate Airports
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm" style={{ color: "oklch(0.7 0.02 240)" }}>
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left py-2 px-3" style={{ color: "oklch(0.85 0.02 240)" }}>ICAO</th>
                <th className="text-left py-2 px-3" style={{ color: "oklch(0.85 0.02 240)" }}>Name</th>
                <th className="text-left py-2 px-3" style={{ color: "oklch(0.85 0.02 240)" }}>Distance</th>
                <th className="text-left py-2 px-3 hidden sm:table-cell" style={{ color: "oklch(0.85 0.02 240)" }}>Notes</th>
              </tr>
            </thead>
            <tbody>
              {route.alternates.map((alt, index) => (
                <tr key={index} className="border-b border-gray-800">
                  <td className="py-2 px-3 font-mono" style={{ color: "oklch(0.75 0.15 230)" }}>{alt.icao}</td>
                  <td className="py-2 px-3">{alt.name}</td>
                  <td className="py-2 px-3">{alt.distance}</td>
                  <td className="py-2 px-3 hidden sm:table-cell">{alt.notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Pilot Tips */}
      <section className="mb-10">
        <h3 className="text-xl font-bold mb-4" style={{ color: "white" }}>
          Tips from Experienced Pilots
        </h3>
        <ul className="space-y-2" style={{ color: "oklch(0.7 0.02 240)" }}>
          {route.pilotTips.map((tip, index) => (
            <li key={index} className="flex items-start gap-2 text-sm">
              <span style={{ color: "oklch(0.7 0.15 60)" }}>•</span>
              <span>{tip}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Related Routes */}
      {route.relatedRoutes.length > 0 && (
        <section className="mb-10">
          <h3 className="text-xl font-bold mb-4" style={{ color: "white" }}>
            Related VFR Routes
          </h3>
          <div className="flex flex-wrap gap-3">
            {route.relatedRoutes.map((relatedSlug) => (
              <Link
                key={relatedSlug}
                href={`/course/routes/${relatedSlug}`}
                className="px-4 py-2 rounded-lg bg-slate-800/50 border border-gray-700 hover:border-sky-500/50 transition-colors text-sm"
                style={{ color: "oklch(0.75 0.15 230)" }}
              >
                {relatedSlug.toUpperCase().replace("-", " → ")}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Disclaimer */}
      <section className="p-4 rounded-xl bg-amber-900/20 border border-amber-700/50">
        <p className="text-xs" style={{ color: "oklch(0.65 0.1 60)" }}>
          <strong>Disclaimer:</strong> This calculator is for educational and reference purposes only. 
          Always use official flight planning tools and verify all data with current charts, NOTAMs, 
          and weather briefings before flight. Wind data shown is from the most recent METAR and may 
          not reflect actual en-route conditions.
        </p>
      </section>
    </div>
  );
}

export default async function RoutePage({ params }: RoutePageProps) {
  const { slug } = await params;
  const route = getRouteBySlug(slug);

  if (!route) {
    notFound();
  }

  // Calculate route data
  const routeData = calculateRouteData(route);

  // Fetch current METAR for origin airport
  const metarResult = await fetchMetar(
    route.origin.icao,
    route.origin.lat,
    route.origin.lon
  );

  // Extract wind data from METAR
  const windDir = metarResult.metar?.wdir ?? undefined;
  const windSpeed = metarResult.metar?.wspd ?? undefined;

  // Calculate flight time estimate
  const flightTimeMinutes = Math.round((routeData.distanceNm / route.typicalTas) * 60);

  return (
    <ClientWrapper
      initialTh={String(routeData.trueCourse)}
      initialTas={String(route.typicalTas)}
      initialWd={windDir !== undefined ? String(windDir) : ""}
      initialWs={windSpeed !== undefined ? String(windSpeed) : ""}
      initialMagVar={String(routeData.magVariation)}
      initialDist=""
      initialFf=""
      initialDevTable=""
      initialDesc={`${route.origin.icao} to ${route.destination.icao}`}
      initialSpeedUnit="kt"
      initialFuelUnit="gph"
      initialWaypoints=""
      initialDepTime=""
      initialElapsedMin=""
      initialPrevFuel=""
      customHeader={
        <RouteHeader
          route={route}
          routeData={routeData}
          flightTimeMinutes={flightTimeMinutes}
          windDir={windDir}
          windSpeed={windSpeed}
        />
      }
      additionalContent={<RouteContent route={route} />}
      footerDescription={`VFR route calculator for ${route.origin.icao} to ${route.destination.icao}. ${route.origin.city} to ${route.destination.city}.`}
    />
  );
}
