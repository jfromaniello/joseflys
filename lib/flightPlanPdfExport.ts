/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Flight Plan PDF Export
 * Generates comprehensive PDF navigation logs matching sample.pdf format
 */

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
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
import { calculateCourse } from "./courseCalculations";
import { getFuelResultUnit, type FuelUnit } from "./fuelConversion";
import { getSpeedUnitLabel, type SpeedUnit } from "./speedConversion";
import {
  formatCourse,
  formatAngle,
  formatDeviation,
  formatWind,
  formatFuel,
  formatDistance,
} from "./formatters";

interface PDFRowData {
  name: string;
  altitude: string;
  trueCourse: string;
  declination: string;
  magneticCourse: string;
  wca: string;
  magneticHeading: string;
  deviation: string;
  compassHeading: string;
  tas: string;
  wind: string;
  groundSpeed: string;
  distancePartial: string;
  distanceTotal: string;
  timePartial: string;
  timeTotal: string;
  fuelPartial: string;
  fuelTotal: string;
  fuelRemaining: string;
}

// Note: All formatting functions now imported from ./formatters

/**
 * Format time as hours:minutes (specific to PDF export)
 */
function formatTime(hours: number): string {
  const totalMinutes = Math.round(hours * 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${h}:${m.toString().padStart(2, "0")}`;
}

/**
 * Generate PDF for a flight plan
 */
export function generateFlightPlanPDF(flightPlan: FlightPlan): void {
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
  });

  // Get fuel unit from first leg (the actual unit like "gph")
  const fuelFlowUnit = flightPlan.legs.length > 0
    ? flightPlan.legs[0].fuelUnit
    : "gph";

  // Get the display unit (like "GAL")
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

  // Header section
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text(flightPlan.name, 15, 15);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");

  // Fuel info header
  doc.text(`Fuel: ${formatFuel(totalFuelCapacity, fuelDisplayUnit)}`, 15, 22);

  // Magnetic declination (from first leg)
  if (flightPlan.legs.length > 0) {
    const firstLeg = flightPlan.legs[0];
    doc.text(`Magnetic Declination: ${formatDeviation(firstLeg.md)}`, 60, 22);
  }

  // Date if available
  if (flightPlan.date) {
    doc.text(`Date: ${flightPlan.date}`, 140, 22);
  }

  // Calculate totals for summary box
  const alternativeLegs = detectAlternativeLegs(flightPlan.legs);
  const hasAlternatives = alternativeLegs.size > 0;

  // Calculate all leg results for summary
  const legResults = new Map();
  flightPlan.legs.forEach((leg) => {
    const result = calculateLegResults(leg);
    if (result) {
      legResults.set(leg.id, result);
    }
  });

  const mainRouteTotals = calculateMainRouteTotals(flightPlan.legs, legResults, alternativeLegs);
  const totalFuel = calculateTotalFuelWithAlternatives(flightPlan.legs, legResults);

  // Add summary box
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("Flight Plan Summary", 15, 30);

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");

  const summaryY = 35;
  const boxWidth = 35;
  const boxSpacing = 5;

  // Box 1: Total Distance
  doc.text("Total Distance:", 15, summaryY);
  doc.setFont("helvetica", "bold");
  doc.text(`${formatDistance(mainRouteTotals.distance)} NM`, 15, summaryY + 4);
  doc.setFont("helvetica", "normal");

  // Box 2: Total Fuel
  doc.text("Total Fuel:", 15 + boxWidth + boxSpacing, summaryY);
  doc.setFont("helvetica", "bold");
  doc.text(`${totalFuel.toFixed(1)} ${fuelDisplayUnit}`, 15 + boxWidth + boxSpacing, summaryY + 4);
  doc.setFont("helvetica", "normal");

  // Box 3: Total Time
  doc.text("Total Time:", 15 + (boxWidth + boxSpacing) * 2, summaryY);
  doc.setFont("helvetica", "bold");
  doc.text(formatHoursToTime(mainRouteTotals.time), 15 + (boxWidth + boxSpacing) * 2, summaryY + 4);
  doc.setFont("helvetica", "normal");

  // Box 4: ETA (if available)
  if (mainRouteTotals.eta) {
    const etaLabel = hasAlternatives ? "ETA to Main:" : "ETA:";
    doc.text(etaLabel, 15 + (boxWidth + boxSpacing) * 3, summaryY);
    doc.setFont("helvetica", "bold");
    doc.text(formatTimeHHMM(mainRouteTotals.eta), 15 + (boxWidth + boxSpacing) * 3, summaryY + 4);
    doc.setFont("helvetica", "normal");
  }

  // Prepare table data
  const tableData: PDFRowData[] = [];

  flightPlan.legs.forEach((leg, legIndex) => {
    const legResult = calculateLegResults(leg);
    if (!legResult) return;

    const courseCalc = calculateCourse(leg);
    if (!courseCalc) return;

    const compassCourse = legResult.compassCourse;
    const compassDeviation = legResult.compassDeviation;

    // MH (Magnetic Heading) = TH + WCA + Variation (this is magneticHeading from courseCalc)
    const magneticHeading = courseCalc.magneticHeading;

    // Check if this is an alternative leg
    const isAlternative = alternativeLegs.has(leg.id);

    // Format leg name - add [Alt.] prefix for alternatives
    const baseLegName = leg.desc || `Leg ${legIndex + 1}`;
    const legName = isAlternative ? `[Alt.] ${baseLegName}` : baseLegName;

    const altitude = "-";

    // Calculate waypoints for this leg (includes all partial and cumulative values)
    const waypoints = calculateLegWaypoints(leg, legResult);

    // Check if next leg is an alternative
    const nextLeg = legIndex < flightPlan.legs.length - 1 ? flightPlan.legs[legIndex + 1] : null;
    const nextLegIsAlternative = nextLeg ? alternativeLegs.has(nextLeg.id) : false;

    // Add main leg row - first leg shows elapsed/previous values if they exist, subsequent legs show previous values
    if (legIndex === 0) {
      // First leg - show elapsed time and previous fuel (taxi/ground ops) if they exist
      const elapsedTime = leg.elapsedMin || 0;
      const previousFuel = leg.prevFuel || 0;

      tableData.push({
        name: legName,
        altitude: altitude,
        trueCourse: formatCourse(leg.th),
        declination: formatDeviation(leg.md),
        magneticCourse: formatCourse(courseCalc.magneticCourse),
        wca: formatAngle(courseCalc.windCorrectionAngle, 0),
        magneticHeading: formatCourse(magneticHeading),
        deviation: compassDeviation !== null ? formatDeviation(compassDeviation) : "-",
        compassHeading: compassCourse !== null ? formatCourse(compassCourse) : "-",
        tas: `${Math.round(leg.tas)} ${speedUnitLabel}`,
        wind: formatWind(leg.wd, leg.ws, false),
        groundSpeed: `${Math.round(legResult.groundSpeed)} ${speedUnitLabel}`,
        distancePartial: formatDistance(0),
        distanceTotal: formatDistance(leg.elapsedDist || 0),
        timePartial: formatTime(elapsedTime / 60),
        timeTotal: formatTime(elapsedTime / 60),
        fuelPartial: formatFuel(previousFuel, fuelDisplayUnit),
        fuelTotal: formatFuel(previousFuel, fuelDisplayUnit),
        fuelRemaining: formatFuel(totalFuelCapacity - previousFuel, fuelDisplayUnit),
      });
    } else {
      // Subsequent legs - show values from previous leg
      const prevLeg = flightPlan.legs[legIndex - 1];
      const prevLegResult = calculateLegResults(prevLeg);
      const currentLegIsAlternative = alternativeLegs.has(leg.id);

      if (prevLegResult) {
        // Check if previous leg has waypoints and next leg is NOT alternative
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

        // If current leg is alternative, show cumulative from ALL previous main route legs
        if (currentLegIsAlternative) {
          // For alternatives, use the accumulated values before this alternative branch
          const prevDistance = prevLeg.dist || 0;
          const prevTime = prevLegResult.legDuration || 0;
          const prevFuel = prevLegResult.fuelUsed - (prevLeg.prevFuel || 0);
          const totalDist = (prevLeg.elapsedDist || 0) + prevDistance;
          const totalTime = (prevLeg.elapsedMin || 0) / 60 + prevTime;
          const totalFuel = prevLegResult.totalFuel;

          distancePartial = formatDistance(prevDistance);
          distanceTotal = formatDistance(totalDist);
          timePartial = formatTime(prevTime);
          timeTotal = formatTime(totalTime);
          fuelPartial = formatFuel(prevFuel, fuelDisplayUnit);
          fuelTotal = formatFuel(totalFuel, fuelDisplayUnit);
          fuelRemaining = formatFuel(totalFuelCapacity - totalFuel, fuelDisplayUnit);
        } else if (lastWaypoint && !nextLegIsAlternative) {
          // Use last waypoint values (it will not be shown in the table)
          distancePartial = formatDistance(lastWaypoint.distanceSinceLast);
          distanceTotal = formatDistance(lastWaypoint.distance);
          timePartial = formatTime(lastWaypoint.timeSinceLast / 60);
          timeTotal = formatTime(lastWaypoint.cumulativeTime / 60);
          fuelPartial = formatFuel(lastWaypoint.fuelSinceLast || 0, fuelDisplayUnit);
          fuelTotal = formatFuel(lastWaypoint.fuelUsed || 0, fuelDisplayUnit);
          fuelRemaining = formatFuel(totalFuelCapacity - (lastWaypoint.fuelUsed || 0), fuelDisplayUnit);
        } else {
          // No waypoints or next leg is alternative, use leg values
          const prevDistance = prevLeg.dist || 0;
          const prevTime = prevLegResult.legDuration || 0;
          const prevFuel = prevLegResult.fuelUsed - (prevLeg.prevFuel || 0);
          const totalDist = (prevLeg.elapsedDist || 0) + prevDistance;
          const totalTime = (prevLeg.elapsedMin || 0) / 60 + prevTime;
          const totalFuel = prevLegResult.totalFuel;

          distancePartial = formatDistance(prevDistance);
          distanceTotal = formatDistance(totalDist);
          timePartial = formatTime(prevTime);
          timeTotal = formatTime(totalTime);
          fuelPartial = formatFuel(prevFuel, fuelDisplayUnit);
          fuelTotal = formatFuel(totalFuel, fuelDisplayUnit);
          fuelRemaining = formatFuel(totalFuelCapacity - totalFuel, fuelDisplayUnit);
        }

        tableData.push({
          name: legName,
          altitude: altitude,
          trueCourse: formatCourse(leg.th),
          declination: formatDeviation(leg.md),
          magneticCourse: formatCourse(courseCalc.magneticCourse),
          wca: formatAngle(courseCalc.windCorrectionAngle, 0),
          magneticHeading: formatCourse(magneticHeading),
          deviation: compassDeviation !== null ? formatDeviation(compassDeviation) : "-",
          compassHeading: compassCourse !== null ? formatCourse(compassCourse) : "-",
          tas: `${Math.round(leg.tas)}`,
          wind: formatWind(leg.wd, leg.ws, false),
          groundSpeed: `${Math.round(legResult.groundSpeed)}`,
          distancePartial,
          distanceTotal,
          timePartial,
          timeTotal,
          fuelPartial,
          fuelTotal,
          fuelRemaining,
        });
      }
    }

    // Add waypoint rows - exclude last waypoint if next leg is NOT alternative
    const waypointsToShow = nextLeg && !nextLegIsAlternative && waypoints.length > 0
      ? waypoints.slice(0, -1) // Exclude last waypoint
      : waypoints; // Show all waypoints

    waypointsToShow.forEach((waypoint) => {
      tableData.push({
        name: `  ${waypoint.name}`, // Indent waypoint names
        altitude: altitude,
        trueCourse: formatCourse(leg.th),
        declination: formatDeviation(leg.md),
        magneticCourse: formatCourse(courseCalc.magneticCourse),
        wca: formatAngle(courseCalc.windCorrectionAngle, 0),
        magneticHeading: formatCourse(magneticHeading),
        deviation: compassDeviation !== null ? formatDeviation(compassDeviation) : "-",
        compassHeading: compassCourse !== null ? formatCourse(compassCourse) : "-",
        tas: `${Math.round(leg.tas)} ${speedUnitLabel}`,
        wind: formatWind(leg.wd, leg.ws, false),
        groundSpeed: `${Math.round(legResult.groundSpeed)} ${speedUnitLabel}`,
        distancePartial: formatDistance(waypoint.distanceSinceLast), // Partial
        distanceTotal: formatDistance(waypoint.distance), // Total (accumulated from leg start)
        timePartial: formatTime(waypoint.timeSinceLast / 60), // Convert minutes to hours
        timeTotal: formatTime(waypoint.cumulativeTime / 60), // Convert minutes to hours
        fuelPartial: formatFuel(waypoint.fuelSinceLast || 0, fuelDisplayUnit),
        fuelTotal: formatFuel(waypoint.fuelUsed || 0, fuelDisplayUnit),
        fuelRemaining: formatFuel(totalFuelCapacity - (waypoint.fuelUsed || 0), fuelDisplayUnit),
      });
    });
  });

  // Create table with autoTable
  autoTable(doc, {
    startY: 45, // Start after summary box
    head: [
      [
        { content: "Leg", rowSpan: 2 },
        { content: "Alt/FL", rowSpan: 2 },
        { content: "TC", rowSpan: 2 },
        { content: "Var.", rowSpan: 2 },
        { content: "MC", rowSpan: 2 },
        { content: "WCA", rowSpan: 2 },
        { content: "MH", rowSpan: 2 },
        { content: "Dev", rowSpan: 2 },
        { content: "CH", rowSpan: 2 },
        { content: "TAS", rowSpan: 2 },
        { content: "Wind", rowSpan: 2 },
        { content: "GS", rowSpan: 2 },
        { content: "Distance (NM)", colSpan: 2 },
        { content: "Flight Time", colSpan: 2 },
        { content: "Fuel Consumed", colSpan: 2 },
        { content: "Fuel Rem.", rowSpan: 2 },
      ],
      [
        "Partial",
        "Total",
        "Partial",
        "Total",
        "Partial",
        "Total",
      ],
    ],
    body: tableData.map((row) => [
      row.name,
      row.altitude,
      row.trueCourse,
      row.declination,
      row.magneticCourse,
      row.wca,
      row.magneticHeading,
      row.deviation,
      row.compassHeading,
      row.tas,
      row.wind,
      row.groundSpeed,
      row.distancePartial,
      row.distanceTotal,
      row.timePartial,
      row.timeTotal,
      row.fuelPartial,
      row.fuelTotal,
      row.fuelRemaining,
    ]),
    didParseCell: function (data: any) {
      // Make leg names (non-indented rows) bold
      if (data.column.index === 0 && data.cell.section === "body") {
        const cellText = data.cell.text[0];
        // If it doesn't start with spaces, it's a leg (not a waypoint)
        if (cellText && !cellText.startsWith("  ")) {
          data.cell.styles.fontStyle = "bold";
        }
      }
    },
    theme: "grid",
    styles: {
      fontSize: 8,
      cellPadding: 2,
      overflow: "linebreak",
      halign: "center",
      valign: "middle",
    },
    headStyles: {
      fillColor: [41, 128, 185], // Blue header
      textColor: 255,
      fontStyle: "bold",
      fontSize: 8,
      halign: "center",
      valign: "middle",
    },
    alternateRowStyles: {
      fillColor: [245, 245, 245], // Light gray
    },
    columnStyles: {
      0: { halign: "left", cellWidth: 30 }, // Leg name - más ancho para nombres largos
      1: { cellWidth: 12 }, // Altitude
      2: { cellWidth: 13 }, // TC
      3: { cellWidth: 12 }, // Var
      4: { cellWidth: 13 }, // MC
      5: { cellWidth: 11 }, // WCA
      6: { cellWidth: 13 }, // MH
      7: { cellWidth: 10 }, // Dev
      8: { cellWidth: 13 }, // CH
      9: { cellWidth: 12 }, // TAS
      10: { cellWidth: 16 }, // Wind
      11: { cellWidth: 12 }, // GS
      12: { cellWidth: 15 }, // Dist Partial
      13: { cellWidth: 15 }, // Dist Total
      14: { cellWidth: 15 }, // Time Partial
      15: { cellWidth: 15 }, // Time Total
      16: { cellWidth: 18 }, // Fuel Partial - más ancho para "XX.X GAL"
      17: { cellWidth: 18 }, // Fuel Total
      18: { cellWidth: 18 }, // Fuel Remaining
    },
  });

  // Get Y position after table
  const finalY = (doc as any).lastAutoTable.finalY + 10;

  // Add abbreviations legend
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("Abbreviations:", 15, finalY);

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");

  const legendItems = [
    "TC: True Course",
    "Var: Magnetic Variation",
    "MC: Magnetic Course",
    "WCA: Wind Correction Angle",
    "MH: Magnetic Heading",
    "Dev: Compass Deviation",
    "CH: Compass Heading",
    "TAS: True Air Speed",
    "GS: Ground Speed",
  ];

  const legendY = finalY + 5;
  const legendColumnWidth = 70;
  const legendRowHeight = 4;

  legendItems.forEach((item, index) => {
    const col = Math.floor(index / 3);
    const row = index % 3;
    const x = 15 + (col * legendColumnWidth);
    const y = legendY + (row * legendRowHeight);
    doc.text(item, x, y);
  });

  // Add footer note
  const noteY = legendY + (3 * legendRowHeight) + 5;
  doc.setFontSize(7);
  doc.setFont("helvetica", "italic");
  doc.text(
    `Generated by joseflys.com on ${new Date().toLocaleDateString()}`,
    15,
    noteY
  );

  // Save the PDF
  const fileName = `${flightPlan.name.replace(/[^a-z0-9]/gi, "_")}_${
    flightPlan.date || new Date().toISOString().split("T")[0]
  }.pdf`;

  doc.save(fileName);
}
