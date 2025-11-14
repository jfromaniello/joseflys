import { describe, it, expect } from "vitest";

/**
 * Helper function to escape city names for filename
 * Extracted from SegmentsCalculatorClient.tsx for testing
 */
function escapeForFilename(name: string): string {
  return name
    .split(",")[0] // Take only first part (city name)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "-") // Replace non-alphanumeric with dashes
    .replace(/-+/g, "-") // Replace multiple dashes with single dash
    .replace(/^-|-$/g, ""); // Remove leading/trailing dashes
}

/**
 * Generate GPX content from location data and segments
 * Extracted from SegmentsCalculatorClient.tsx for testing
 */
interface Location {
  name: string;
  lat: number;
  lon: number;
}

interface Segment {
  startLat: number;
  startLon: number;
  endLat: number;
  endLon: number;
  heading: number;
  distance: number;
  segmentNumber: number;
  cumulativeDistance: number;
}

function generateGPX(
  fromLocation: Location,
  toLocation: Location,
  segments: Segment[]
): string {
  const waypoints = [
    // Origin
    `    <rtept lat="${fromLocation.lat.toFixed(6)}" lon="${fromLocation.lon.toFixed(6)}">
      <name>${fromLocation.name.split(",")[0]}</name>
    </rtept>`,
    // Intermediate waypoints (use endLat/endLon from each segment except the last)
    ...segments.slice(0, -1).map(
      (seg, idx) =>
        `    <rtept lat="${seg.endLat.toFixed(6)}" lon="${seg.endLon.toFixed(6)}">
      <name>WPT${String(idx + 1).padStart(2, "0")}</name>
    </rtept>`
    ),
    // Destination
    `    <rtept lat="${toLocation.lat.toFixed(6)}" lon="${toLocation.lon.toFixed(6)}">
      <name>${toLocation.name.split(",")[0]}</name>
    </rtept>`,
  ];

  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="joseflys.com" xmlns="http://www.topografix.com/GPX/1/1">
  <rte>
    <name>FPL ${fromLocation.name.split(",")[0]} to ${toLocation.name.split(",")[0]}</name>
${waypoints.join("\n")}
  </rte>
</gpx>`;
}

describe("GPX Generator", () => {
  describe("escapeForFilename", () => {
    it("should convert simple city name to lowercase", () => {
      expect(escapeForFilename("Tokyo, Japan")).toBe("tokyo");
      expect(escapeForFilename("Paris, France")).toBe("paris");
      expect(escapeForFilename("London, UK")).toBe("london");
    });

    it("should handle city names with spaces", () => {
      expect(escapeForFilename("New York, NY, USA")).toBe("new-york");
      expect(escapeForFilename("Los Angeles, CA")).toBe("los-angeles");
      expect(escapeForFilename("San Francisco, CA")).toBe("san-francisco");
    });

    it("should handle city names with special characters", () => {
      expect(escapeForFilename("São Paulo, Brazil")).toBe("s-o-paulo");
      expect(escapeForFilename("Zürich, Switzerland")).toBe("z-rich");
      expect(escapeForFilename("México City, México")).toBe("m-xico-city");
    });

    it("should replace multiple spaces/dashes with single dash", () => {
      expect(escapeForFilename("St.  Petersburg, Russia")).toBe("st-petersburg");
      expect(escapeForFilename("Rio de Janeiro, Brazil")).toBe("rio-de-janeiro");
    });

    it("should remove leading and trailing dashes", () => {
      expect(escapeForFilename("-City-, Country")).toBe("city");
      expect(escapeForFilename("'City', Country")).toBe("city");
    });

    it("should handle coordinate-only names", () => {
      // Function splits on comma and takes first part only
      expect(escapeForFilename("40.7128°, -74.0060°")).toBe("40-7128");
      expect(escapeForFilename("-31.4201°, -64.1888°")).toBe("31-4201");
    });

    it("should only take first part before comma", () => {
      expect(escapeForFilename("New York, NY, USA")).toBe("new-york");
      expect(escapeForFilename("Tokyo")).toBe("tokyo");
    });

    it("should handle apostrophes and punctuation", () => {
      expect(escapeForFilename("O'Hare, IL")).toBe("o-hare");
      expect(escapeForFilename("St. John's, Canada")).toBe("st-john-s");
    });

    it("should preserve numbers", () => {
      expect(escapeForFilename("Area 51, NV")).toBe("area-51");
      expect(escapeForFilename("Route 66, USA")).toBe("route-66");
    });
  });

  describe("generateGPX", () => {
    const newYork: Location = {
      name: "New York, NY, USA",
      lat: 40.7127281,
      lon: -74.0060152,
    };

    const tokyo: Location = {
      name: "Tokyo, Japan",
      lat: 35.6768601,
      lon: 139.7638947,
    };

    it("should generate valid GPX with 3 segments", () => {
      const segments: Segment[] = [
        {
          segmentNumber: 1,
          startLat: 40.7127281,
          startLon: -74.0060152,
          endLat: 41.5,
          endLon: -70.2,
          heading: 45.0,
          distance: 100.5,
          cumulativeDistance: 100.5,
        },
        {
          segmentNumber: 2,
          startLat: 41.5,
          startLon: -70.2,
          endLat: 42.3,
          endLon: -65.8,
          heading: 50.0,
          distance: 120.3,
          cumulativeDistance: 220.8,
        },
        {
          segmentNumber: 3,
          startLat: 42.3,
          startLon: -65.8,
          endLat: 35.6768601,
          endLon: 139.7638947,
          heading: 280.0,
          distance: 5650.2,
          cumulativeDistance: 5871.0,
        },
      ];

      const gpx = generateGPX(newYork, tokyo, segments);

      // Verify XML declaration
      expect(gpx).toContain('<?xml version="1.0" encoding="UTF-8"?>');

      // Verify GPX root element
      expect(gpx).toContain(
        '<gpx version="1.1" creator="joseflys.com" xmlns="http://www.topografix.com/GPX/1/1">'
      );

      // Verify route name
      expect(gpx).toContain("<name>FPL New York to Tokyo</name>");

      // Verify origin waypoint
      expect(gpx).toContain(
        '<rtept lat="40.712728" lon="-74.006015">'
      );
      expect(gpx).toContain("<name>New York</name>");

      // Verify intermediate waypoints (segments 1 and 2 endpoints)
      expect(gpx).toContain('<rtept lat="41.500000" lon="-70.200000">');
      expect(gpx).toContain("<name>WPT01</name>");

      expect(gpx).toContain('<rtept lat="42.300000" lon="-65.800000">');
      expect(gpx).toContain("<name>WPT02</name>");

      // Verify destination waypoint (segment 3 endpoint)
      expect(gpx).toContain(
        '<rtept lat="35.676860" lon="139.763895">'
      );
      expect(gpx).toContain("<name>Tokyo</name>");

      // Verify correct number of waypoints (origin + 2 intermediate + destination = 4)
      const waypointCount = (gpx.match(/<rtept/g) || []).length;
      expect(waypointCount).toBe(4);
    });

    it("should generate valid GPX with single segment (direct route)", () => {
      const segments: Segment[] = [
        {
          segmentNumber: 1,
          startLat: 40.7127281,
          startLon: -74.0060152,
          endLat: 35.6768601,
          endLon: 139.7638947,
          heading: 280.0,
          distance: 5870.0,
          cumulativeDistance: 5870.0,
        },
      ];

      const gpx = generateGPX(newYork, tokyo, segments);

      // Should only have origin and destination, no intermediate waypoints
      const waypointCount = (gpx.match(/<rtept/g) || []).length;
      expect(waypointCount).toBe(2);

      // Verify no WPT waypoints
      expect(gpx).not.toContain("WPT");

      // Verify origin and destination
      expect(gpx).toContain("<name>New York</name>");
      expect(gpx).toContain("<name>Tokyo</name>");
    });

    it("should generate valid GPX with many segments (35)", () => {
      // Generate 35 segments (typical LNAV count)
      const segments: Segment[] = Array.from({ length: 35 }, (_, i) => ({
        segmentNumber: i + 1,
        startLat: 40.7127281 - i * 0.15,
        startLon: -74.0060152 + i * 6.1,
        endLat: 40.7127281 - (i + 1) * 0.15,
        endLon: -74.0060152 + (i + 1) * 6.1,
        heading: 280.0,
        distance: 167.7,
        cumulativeDistance: (i + 1) * 167.7,
      }));

      const gpx = generateGPX(newYork, tokyo, segments);

      // Should have origin + 34 intermediate + destination = 36 waypoints
      const waypointCount = (gpx.match(/<rtept/g) || []).length;
      expect(waypointCount).toBe(36);

      // Verify intermediate waypoints are numbered correctly
      expect(gpx).toContain("WPT01");
      expect(gpx).toContain("WPT02");
      expect(gpx).toContain("WPT10");
      expect(gpx).toContain("WPT34");

      // Should not have WPT35 (last segment ends at destination)
      expect(gpx).not.toContain("WPT35");
    });

    it("should format coordinates with 6 decimal places", () => {
      const segments: Segment[] = [
        {
          segmentNumber: 1,
          startLat: 40.7127281,
          startLon: -74.0060152,
          endLat: 35.6768601,
          endLon: 139.7638947,
          heading: 280.0,
          distance: 5870.0,
          cumulativeDistance: 5870.0,
        },
      ];

      const gpx = generateGPX(newYork, tokyo, segments);

      // Check precision (6 decimal places)
      expect(gpx).toContain('lat="40.712728"');
      expect(gpx).toContain('lon="-74.006015"');
      expect(gpx).toContain('lat="35.676860"');
      expect(gpx).toContain('lon="139.763895"');
    });

    it("should handle locations with coordinate-style names", () => {
      const coordLocation1: Location = {
        name: "40.7128°, -74.0060°",
        lat: 40.7128,
        lon: -74.006,
      };

      const coordLocation2: Location = {
        name: "35.6769°, 139.7639°",
        lat: 35.6769,
        lon: 139.7639,
      };

      const segments: Segment[] = [
        {
          segmentNumber: 1,
          startLat: 40.7128,
          startLon: -74.006,
          endLat: 35.6769,
          endLon: 139.7639,
          heading: 280.0,
          distance: 5870.0,
          cumulativeDistance: 5870.0,
        },
      ];

      const gpx = generateGPX(coordLocation1, coordLocation2, segments);

      // Should use only first part before comma
      expect(gpx).toContain("<name>40.7128°</name>");
      expect(gpx).toContain("<name>35.6769°</name>");
    });

    it("should handle waypoint numbering with leading zeros", () => {
      const segments: Segment[] = Array.from({ length: 12 }, (_, i) => ({
        segmentNumber: i + 1,
        startLat: 40.0 - i * 0.5,
        startLon: -74.0 + i * 5.0,
        endLat: 40.0 - (i + 1) * 0.5,
        endLon: -74.0 + (i + 1) * 5.0,
        heading: 90.0,
        distance: 100.0,
        cumulativeDistance: (i + 1) * 100.0,
      }));

      const gpx = generateGPX(newYork, tokyo, segments);

      // Check leading zeros (01-09)
      expect(gpx).toContain("WPT01");
      expect(gpx).toContain("WPT05");
      expect(gpx).toContain("WPT09");

      // Check double digits (10+)
      expect(gpx).toContain("WPT10");
      expect(gpx).toContain("WPT11");
    });

    it("should handle negative coordinates correctly", () => {
      const southAmerica: Location = {
        name: "Buenos Aires, Argentina",
        lat: -34.6037,
        lon: -58.3816,
      };

      const australia: Location = {
        name: "Sydney, Australia",
        lat: -33.8688,
        lon: 151.2093,
      };

      const segments: Segment[] = [
        {
          segmentNumber: 1,
          startLat: -34.6037,
          startLon: -58.3816,
          endLat: -33.8688,
          endLon: 151.2093,
          heading: 120.0,
          distance: 6800.0,
          cumulativeDistance: 6800.0,
        },
      ];

      const gpx = generateGPX(southAmerica, australia, segments);

      // Verify negative coordinates are preserved
      expect(gpx).toContain('lat="-34.603700"');
      expect(gpx).toContain('lon="-58.381600"');
      expect(gpx).toContain('lat="-33.868800"');
      expect(gpx).toContain('lon="151.209300"');
    });

    it("should preserve city names without commas", () => {
      const singleName: Location = {
        name: "Tokyo",
        lat: 35.6768601,
        lon: 139.7638947,
      };

      const segments: Segment[] = [
        {
          segmentNumber: 1,
          startLat: 40.7127281,
          startLon: -74.0060152,
          endLat: 35.6768601,
          endLon: 139.7638947,
          heading: 280.0,
          distance: 5870.0,
          cumulativeDistance: 5870.0,
        },
      ];

      const gpx = generateGPX(newYork, singleName, segments);

      expect(gpx).toContain("<name>Tokyo</name>");
      expect(gpx).toContain("FPL New York to Tokyo");
    });

    it("should generate well-formed XML structure", () => {
      const segments: Segment[] = [
        {
          segmentNumber: 1,
          startLat: 40.7127281,
          startLon: -74.0060152,
          endLat: 35.6768601,
          endLon: 139.7638947,
          heading: 280.0,
          distance: 5870.0,
          cumulativeDistance: 5870.0,
        },
      ];

      const gpx = generateGPX(newYork, tokyo, segments);

      // Basic XML structure validation
      expect(gpx.trim()).toMatch(/^<\?xml/); // Starts with XML declaration
      expect(gpx).toContain("</gpx>"); // Has closing GPX tag
      expect(gpx).toContain("</rte>"); // Has closing route tag

      // Count opening and closing tags match
      const openRtept = (gpx.match(/<rtept/g) || []).length;
      const closeRtept = (gpx.match(/<\/rtept>/g) || []).length;
      expect(openRtept).toBe(closeRtept);

      const openName = (gpx.match(/<name>/g) || []).length;
      const closeName = (gpx.match(/<\/name>/g) || []).length;
      expect(openName).toBe(closeName);
    });
  });

  describe("Filename generation", () => {
    it("should generate correct filename format", () => {
      const from = "New York, NY, USA";
      const to = "Tokyo, Japan";
      const segmentCount = 35;

      const filename = `${escapeForFilename(from)}-${escapeForFilename(to)}-s${segmentCount}.gpx`;

      expect(filename).toBe("new-york-tokyo-s35.gpx");
    });

    it("should handle various segment counts", () => {
      const from = "Paris, France";
      const to = "London, UK";

      expect(`${escapeForFilename(from)}-${escapeForFilename(to)}-s1.gpx`).toBe(
        "paris-london-s1.gpx"
      );
      expect(`${escapeForFilename(from)}-${escapeForFilename(to)}-s10.gpx`).toBe(
        "paris-london-s10.gpx"
      );
      expect(`${escapeForFilename(from)}-${escapeForFilename(to)}-s100.gpx`).toBe(
        "paris-london-s100.gpx"
      );
    });

    it("should handle long city names", () => {
      const from = "São Paulo, Brazil";
      const to = "Albuquerque, New Mexico";

      const filename = `${escapeForFilename(from)}-${escapeForFilename(to)}-s50.gpx`;

      expect(filename).toBe("s-o-paulo-albuquerque-s50.gpx");
    });

    it("should create safe filenames with special characters", () => {
      const from = "Mexico City, México";
      const to = "Montréal, Canada";

      const filename = `${escapeForFilename(from)}-${escapeForFilename(to)}-s25.gpx`;

      // Should be safe for filesystem
      expect(filename).toMatch(/^[a-z0-9-]+\.gpx$/);
      expect(filename).toBe("mexico-city-montr-al-s25.gpx");
    });
  });

  describe("Edge cases", () => {
    it("should handle empty segment array gracefully", () => {
      const from: Location = {
        name: "New York",
        lat: 40.7128,
        lon: -74.006,
      };
      const to: Location = {
        name: "Tokyo",
        lat: 35.6769,
        lon: 139.7639,
      };

      const gpx = generateGPX(from, to, []);

      // Should still have origin and destination
      expect(gpx).toContain("<name>New York</name>");
      expect(gpx).toContain("<name>Tokyo</name>");

      // Should have exactly 2 waypoints
      const waypointCount = (gpx.match(/<rtept/g) || []).length;
      expect(waypointCount).toBe(2);
    });

    it("should handle very small coordinate values", () => {
      const equator: Location = {
        name: "Point A",
        lat: 0.000001,
        lon: 0.000001,
      };

      const segments: Segment[] = [
        {
          segmentNumber: 1,
          startLat: 0.000001,
          startLon: 0.000001,
          endLat: 0.000002,
          endLon: 0.000002,
          heading: 45.0,
          distance: 0.1,
          cumulativeDistance: 0.1,
        },
      ];

      const gpx = generateGPX(equator, equator, segments);

      expect(gpx).toContain('lat="0.000001"');
      expect(gpx).toContain('lon="0.000001"');
    });

    it("should handle maximum coordinate values", () => {
      const northPole: Location = {
        name: "North Pole",
        lat: 90.0,
        lon: 0.0,
      };

      const southPole: Location = {
        name: "South Pole",
        lat: -90.0,
        lon: 180.0,
      };

      const segments: Segment[] = [
        {
          segmentNumber: 1,
          startLat: 90.0,
          startLon: 0.0,
          endLat: -90.0,
          endLon: 180.0,
          heading: 180.0,
          distance: 10800.0,
          cumulativeDistance: 10800.0,
        },
      ];

      const gpx = generateGPX(northPole, southPole, segments);

      expect(gpx).toContain('lat="90.000000"');
      expect(gpx).toContain('lat="-90.000000"');
      expect(gpx).toContain('lon="180.000000"');
    });
  });
});
