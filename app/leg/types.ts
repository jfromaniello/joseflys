/**
 * Shared types for Leg Planner
 * Used by both server-side (ClientWrapper) and client-side (LegPlannerClient) components
 */

export interface LegPlannerProps {
  initialTh: string;
  initialTas: string;
  initialWd: string;
  initialWs: string;
  initialMagVar: string; // WMM convention (positive=E, negative=W)
  initialDist: string;
  initialFf: string;
  initialDevTable: string;
  initialPlane: string;
  initialDesc: string;
  initialSpeedUnit: string;
  initialFuelUnit: string;
  initialWaypoints: string;
  initialDepTime: string;
  initialElapsedMin: string;
  initialElapsedDist: string;
  initialPrevFuel: string;
  initialClimbTas: string;
  initialClimbDist: string;
  initialClimbFuel: string;
  initialClimbWd: string;
  initialClimbWs: string;
  initialDescentTas: string;
  initialDescentDist: string;
  initialDescentFuel: string;
  initialDescentWd: string;
  initialDescentWs: string;
  initialAdditionalFuel: string;
  initialApproachLandingFuel: string;
  initialFlightPlanId: string;
  initialLegId: string;
  initialFromCity: string;
  initialToCity: string;
  initialFrom?: { lat: string; lon: string; name?: string };
  initialTo?: { lat: string; lon: string; name?: string };
  initialCheckpoints: Array<{ lat: string; lon: string; name?: string }>;
}
