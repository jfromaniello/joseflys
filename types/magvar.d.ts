declare module 'magvar' {
  /**
   * Calculate magnetic declination (variation) at a specific location
   * using the World Magnetic Model (WMM) 2025-2030
   *
   * @param latitude - Geodetic latitude in degrees (WGS84; positive for northern hemisphere)
   * @param longitude - Geodetic longitude in degrees (positive for eastern hemisphere)
   * @param altitude - Height in kilometers above mean sea level (optional, defaults to 0)
   * @returns Magnetic declination in degrees
   *          Positive = magnetic north is east of true north
   *          Negative = magnetic north is west of true north
   */
  export function magvar(latitude: number, longitude: number, altitude?: number): number;
}
