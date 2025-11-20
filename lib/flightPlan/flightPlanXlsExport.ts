/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Flight Plan XLS Export
 * Generates comprehensive Excel navigation logs matching PDF format
 */

import * as XLSX from "xlsx-js-style";
import type { FlightPlan } from "./flightPlanStorage";
import {
  calculateLegResults,
  calculateLegWaypoints,
  detectAlternativeLegs,
  calculateMainRouteTotals,
  calculateTotalFuelWithAlternatives,
  formatHoursToTime,
  formatTimeHHMM,
} from "./flightPlanCalculations";
import { calculateCourse } from "../courseCalculations";
import { getFuelResultUnit, type FuelUnit } from "../fuelConversion";
import { getSpeedUnitLabel, type SpeedUnit } from "../speedConversion";
import {
  formatCourse,
  formatCorrection,
  formatDeviation,
  formatWind,
  formatFuel,
  formatDistance,
} from "../formatters";

// Note: All formatting functions now imported from ./formatters

/**
 * Generate Excel file for a flight plan
 */
export function generateFlightPlanXLS(flightPlan: FlightPlan): void {
  // Get fuel unit from first leg (the actual unit like "gph")
  const fuelFlowUnit = flightPlan.legs.length > 0
    ? (flightPlan.legs[0].fuelUnit || "gph")
    : "gph";
  const fuelDisplayUnit = getFuelResultUnit(fuelFlowUnit as FuelUnit);

  // Get speed unit from first leg (like "kt", "mph", "kmh")
  const speedUnit = flightPlan.legs.length > 0
    ? (flightPlan.legs[0].unit || "kt")
    : "kt";

  // Get the display label (like "KT", "MPH", "km/h")
  const speedUnitLabel = getSpeedUnitLabel(speedUnit as SpeedUnit);

  // Calculate total fuel capacity (use last leg's total fuel as maximum)
  let totalFuelCapacity = 0;
  if (flightPlan.legs.length > 0) {
    const lastLeg = flightPlan.legs[flightPlan.legs.length - 1];
    const lastResult = calculateLegResults(lastLeg);
    if (lastResult) {
      totalFuelCapacity = lastResult.totalFuel;
    }
  }

  // Detect alternative legs
  const alternativeLegs = detectAlternativeLegs(flightPlan.legs);

  // Calculate totals
  const legResults = new Map();
  flightPlan.legs.forEach((leg) => {
    const result = calculateLegResults(leg);
    if (result) {
      legResults.set(leg.id, result);
    }
  });

  const mainRouteTotals = calculateMainRouteTotals(
    flightPlan.legs,
    legResults,
    alternativeLegs
  );
  const totalFuelWithAlternatives = calculateTotalFuelWithAlternatives(
    flightPlan.legs,
    legResults
  );

  // Create worksheet data
  const data: any[][] = [];

  // Track row indices for styling
  const headerRowIndex = 6; // After title, blank, summary header, 2 summary rows, blank

  // Title
  data.push([flightPlan.name || "Flight Plan"]);
  data.push([]);

  // Summary section
  data.push(["Flight Plan Summary"]);
  data.push([
    "Total Distance:",
    `${formatDistance(mainRouteTotals.distance)} NM`,
    "",
    "Total Fuel:",
    formatFuel(totalFuelWithAlternatives, fuelDisplayUnit),
  ]);
  data.push([
    "Total Time:",
    formatHoursToTime(mainRouteTotals.time),
    "",
    "ETA:",
    mainRouteTotals.eta ? formatTimeHHMM(mainRouteTotals.eta) : "N/A",
  ]);
  data.push([]);

  // Table headers
  data.push([
    "Leg",
    "Alt",
    "TC",
    "Var.",
    "MC",
    "WCA",
    "MH",
    "Dev",
    "CH",
    "TAS",
    "Wind",
    "GS",
    "Dist (Partial)",
    "Dist (Total)",
    "Time (Partial)",
    "Time (Total)",
    "Fuel (Partial)",
    "Fuel (Total)",
    "Fuel Remaining",
  ]);

  const dataStartRow = headerRowIndex + 1;

  // Process each leg
  flightPlan.legs.forEach((leg, legIndex) => {
    const legResult = legResults.get(leg.id);
    if (!legResult) return;

    const courseCalc = calculateCourse(leg);
    if (!courseCalc) return;

    const compassCourse = legResult.compassCourse;
    const compassDeviation = legResult.compassDeviation;

    // MH (Magnetic Heading) = TH + WCA + Variation (this is magneticHeading from courseCalc)
    const magneticHeading = courseCalc.magneticHeading;

    // Check if this is an alternative leg
    const isAlternative = alternativeLegs.has(leg.id);

    // Format leg name - use description, then from city name, then fallback to "Leg N"
    const baseLegName = leg.desc || leg.from?.name || leg.fromCity || `Leg ${legIndex + 1}`;
    const legName = isAlternative ? `[Alt.] ${baseLegName}` : baseLegName;

    const altitude = "-";

    // Calculate waypoints for this leg
    const waypoints = calculateLegWaypoints(leg, legResult);

    // Check if next leg is an alternative
    const nextLeg = legIndex < flightPlan.legs.length - 1 ? flightPlan.legs[legIndex + 1] : null;
    const nextLegIsAlternative = nextLeg ? alternativeLegs.has(nextLeg.id) : false;

    // Add main leg row - first leg shows elapsed/previous values if they exist
    if (legIndex === 0) {
      // First leg - show elapsed time and previous fuel (taxi/ground ops) if they exist
      const elapsedTime = leg.elapsedMin || 0;
      const previousFuel = leg.prevFuel || 0;

      data.push([
        legName,
        altitude,
        formatCourse(leg.th),
        formatDeviation(leg.md),
        formatCourse(courseCalc.magneticCourse),
        formatCorrection(courseCalc.windCorrectionAngle, 0),
        formatCourse(magneticHeading),
        compassDeviation !== null ? formatDeviation(compassDeviation) : "-",
        compassCourse !== null ? formatCourse(compassCourse) : "-",
        `${Math.round(leg.tas)} ${speedUnitLabel}`,
        formatWind(leg.wd, leg.ws, false),
        `${Math.round(legResult.groundSpeed)} ${speedUnitLabel}`,
        formatDistance(leg.elapsedDist || 0),
        formatDistance(leg.elapsedDist || 0),
        formatHoursToTime(elapsedTime / 60),
        formatHoursToTime(elapsedTime / 60),
        formatFuel(previousFuel, fuelDisplayUnit),
        formatFuel(previousFuel, fuelDisplayUnit),
        formatFuel(totalFuelCapacity - previousFuel, fuelDisplayUnit),
      ]);
    } else {
      // Subsequent legs - show previous leg's cumulative values
      const prevLeg = flightPlan.legs[legIndex - 1];
      const prevLegResult = legResults.get(prevLeg.id);
      const currentLegIsAlternative = alternativeLegs.has(leg.id);

      if (prevLegResult) {
        // Check if previous leg has waypoints
        const prevWaypoints = calculateLegWaypoints(prevLeg, prevLegResult);
        const hasWaypoints = prevWaypoints.length > 0;
        const lastWaypoint = hasWaypoints ? prevWaypoints[prevWaypoints.length - 1] : null;

        let distancePartial: string;
        let distanceTotal: string;
        let timePartial: string;
        let timeTotal: string;
        let fuelPartial: string;
        let fuelTotal: string;
        let fuelRemaining: string;

        // If previous leg has waypoints and its next leg (current leg) is NOT alternative, use last waypoint
        if (lastWaypoint && !currentLegIsAlternative) {
          // Use last waypoint values (it was not shown in the table)
          distancePartial = formatDistance(lastWaypoint.distanceSinceLast);
          distanceTotal = formatDistance(lastWaypoint.distance);
          timePartial = formatHoursToTime(lastWaypoint.timeSinceLast / 60);
          timeTotal = lastWaypoint.eta ? formatTimeHHMM(lastWaypoint.eta) : "N/A";
          fuelPartial = formatFuel(lastWaypoint.fuelSinceLast || 0, fuelDisplayUnit);
          fuelTotal = formatFuel(lastWaypoint.fuelUsed || 0, fuelDisplayUnit);
          fuelRemaining = formatFuel(totalFuelCapacity - (lastWaypoint.fuelUsed || 0), fuelDisplayUnit);
        } else {
          // No waypoints or current leg is alternative, use leg values
          distancePartial = formatDistance(0);
          distanceTotal = formatDistance(prevLegResult.totalDistance);
          timePartial = "00:00";
          timeTotal = formatHoursToTime(prevLegResult.totalTime);
          fuelPartial = `0.0 ${fuelDisplayUnit}`;
          fuelTotal = formatFuel(prevLegResult.totalFuel, fuelDisplayUnit);
          fuelRemaining = formatFuel(totalFuelCapacity - prevLegResult.totalFuel, fuelDisplayUnit);
        }

        data.push([
          legName,
          altitude,
          formatCourse(leg.th),
          formatDeviation(leg.md),
          formatCourse(courseCalc.magneticCourse),
          formatCorrection(courseCalc.windCorrectionAngle, 0),
          formatCourse(magneticHeading),
          compassDeviation !== null ? formatDeviation(compassDeviation) : "-",
          compassCourse !== null ? formatCourse(compassCourse) : "-",
          `${Math.round(leg.tas)}`,
          formatWind(leg.wd, leg.ws, false),
          `${Math.round(legResult.groundSpeed)}`,
          distancePartial,
          distanceTotal,
          timePartial,
          timeTotal,
          fuelPartial,
          fuelTotal,
          fuelRemaining,
        ]);
      }
    }

    // Add waypoint rows - exclude last waypoint if next leg is NOT alternative
    const waypointsToShow = nextLeg && !nextLegIsAlternative && waypoints.length > 0
      ? waypoints.slice(0, -1) // Exclude last waypoint
      : waypoints; // Show all waypoints

    waypointsToShow.forEach((waypoint) => {
      data.push([
        `  ${waypoint.name}`, // Indent waypoint names
        altitude,
        formatCourse(leg.th),
        formatDeviation(leg.md),
        formatCourse(courseCalc.magneticCourse),
        formatCorrection(courseCalc.windCorrectionAngle, 0),
        formatCourse(magneticHeading),
        compassDeviation !== null ? formatDeviation(compassDeviation) : "-",
        compassCourse !== null ? formatCourse(compassCourse) : "-",
        `${Math.round(leg.tas)} ${speedUnitLabel}`,
        formatWind(leg.wd, leg.ws, false),
        `${Math.round(legResult.groundSpeed)} ${speedUnitLabel}`,
        formatDistance(waypoint.distanceSinceLast), // Partial
        formatDistance(waypoint.distance), // Total (from departure)
        formatHoursToTime(waypoint.timeSinceLast / 60), // Partial (convert from minutes to hours)
        waypoint.eta ? formatTimeHHMM(waypoint.eta) : "N/A", // Total (arrival time)
        formatFuel(waypoint.fuelSinceLast || 0, fuelDisplayUnit), // Partial
        formatFuel(waypoint.fuelUsed || 0, fuelDisplayUnit), // Total
        formatFuel(totalFuelCapacity - (waypoint.fuelUsed || 0), fuelDisplayUnit), // Remaining
      ]);
    });
  });

  // Add empty row before abbreviations
  data.push([]);

  // Add abbreviations
  data.push(["Abbreviations:"]);
  const abbreviations = [
    "TC: True Course",
    "Var: Magnetic Variation",
    "MC: Magnetic Course",
    "WCA: Wind Correction Angle",
    "MH: Magnetic Heading",
    "Dev: Compass Deviation",
    "CH: Compass Heading",
    "TAS: True Airspeed",
    "GS: Ground Speed",
    "Dist: Distance (NM)",
    "Alt: Altitude",
  ];
  abbreviations.forEach((abbr) => {
    data.push([abbr]);
  });

  // Create workbook and worksheet
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(data);

  // Set column widths
  ws["!cols"] = [
    { wch: 25 }, // Leg
    { wch: 8 },  // Alt
    { wch: 8 },  // TC
    { wch: 8 },  // Var
    { wch: 8 },  // MC
    { wch: 8 },  // WCA
    { wch: 8 },  // MH
    { wch: 8 },  // Dev
    { wch: 8 },  // CH
    { wch: 8 },  // TAS
    { wch: 10 }, // Wind
    { wch: 8 },  // GS
    { wch: 14 }, // Dist Partial
    { wch: 14 }, // Dist Total
    { wch: 14 }, // Time Partial
    { wch: 14 }, // Time Total
    { wch: 16 }, // Fuel Partial
    { wch: 16 }, // Fuel Total
    { wch: 16 }, // Fuel Remaining
  ];

  // Apply styling
  const range = XLSX.utils.decode_range(ws["!ref"] || "A1");

  // Style title row (row 0)
  const titleCell = "A1";
  if (ws[titleCell]) {
    ws[titleCell].s = {
      font: { bold: true, sz: 16, color: { rgb: "1F4788" } },
      alignment: { horizontal: "left", vertical: "center" },
    };
  }

  // Style summary header (row 2)
  const summaryHeaderCell = "A3";
  if (ws[summaryHeaderCell]) {
    ws[summaryHeaderCell].s = {
      font: { bold: true, sz: 12, color: { rgb: "2E5C8A" } },
      alignment: { horizontal: "left", vertical: "center" },
    };
  }

  // Style summary data rows (rows 3-4)
  const summaryCells = ["A4", "B4", "D4", "E4", "A5", "B5", "D5", "E5"];
  summaryCells.forEach((cellAddr) => {
    if (!ws[cellAddr]) return;
    const col = cellAddr.charCodeAt(0) - 65; // A=0, B=1, etc.

    // Labels (columns 0 and 3)
    if (col === 0 || col === 3) {
      ws[cellAddr].s = {
        font: { bold: true, sz: 10 },
        alignment: { horizontal: "right", vertical: "center" },
      };
    } else if (col === 1 || col === 4) {
      // Values (columns 1 and 4)
      ws[cellAddr].s = {
        font: { sz: 10, color: { rgb: "1F4788" } },
        alignment: { horizontal: "left", vertical: "center" },
      };
    }
  });

  // Style table headers (row 6)
  for (let col = range.s.c; col <= range.e.c; col++) {
    const cellAddress = XLSX.utils.encode_cell({ r: headerRowIndex, c: col });
    if (!ws[cellAddress]) continue;
    ws[cellAddress].s = {
      font: { bold: true, sz: 10, color: { rgb: "FFFFFF" } },
      fill: { fgColor: { rgb: "1F4788" } },
      alignment: { horizontal: "center", vertical: "center" },
      border: {
        top: { style: "thin", color: { rgb: "000000" } },
        bottom: { style: "thin", color: { rgb: "000000" } },
        left: { style: "thin", color: { rgb: "000000" } },
        right: { style: "thin", color: { rgb: "000000" } },
      },
    };
  }

  // Style data rows (alternating colors)
  for (let row = dataStartRow; row <= range.e.r; row++) {
    const isEvenRow = (row - dataStartRow) % 2 === 0;
    const fillColor = isEvenRow ? "F0F4F8" : "FFFFFF";

    for (let col = range.s.c; col <= range.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
      if (!ws[cellAddress]) continue;

      // Check if this is a leg name (bold if not indented)
      const cellValue = ws[cellAddress].v;
      const isLegName = col === 0 && cellValue && !String(cellValue).startsWith("  ");
      const isAlternative = cellValue && String(cellValue).includes("[Alt.]");

      ws[cellAddress].s = {
        font: {
          bold: isLegName,
          sz: 9,
          color: isAlternative ? { rgb: "D97706" } : undefined,
        },
        fill: { fgColor: { rgb: fillColor } },
        alignment: { horizontal: col === 0 ? "left" : "center", vertical: "center" },
        border: {
          top: { style: "thin", color: { rgb: "E2E8F0" } },
          bottom: { style: "thin", color: { rgb: "E2E8F0" } },
          left: { style: "thin", color: { rgb: "E2E8F0" } },
          right: { style: "thin", color: { rgb: "E2E8F0" } },
        },
      };
    }
  }

  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(wb, ws, "Flight Plan");

  // Generate filename
  const filename = `${flightPlan.name || "FlightPlan"}.xlsx`;

  // Write file
  XLSX.writeFile(wb, filename);
}
