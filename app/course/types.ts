/**
 * Shared types for Course Calculator
 * Used by both server-side (ClientWrapper) and client-side (CourseCalculatorClient) components
 */

export interface CourseCalculatorProps {
  initialTh: string;
  initialTas: string;
  initialWd: string;
  initialWs: string;
  initialMagVar: string; // WMM convention (positive=E, negative=W)
  initialDist: string;
  initialFf: string;
  initialDevTable: string;
  initialPlane?: string;
  initialDesc: string;
  initialSpeedUnit: string;
  initialFuelUnit: string;
  initialWaypoints: string;
  initialDepTime: string;
  initialElapsedMin: string;
  initialPrevFuel: string;
}
