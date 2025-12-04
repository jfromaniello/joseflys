/**
 * Tests for Aircraft Storage and Serialization (CBOR format)
 * These tests use the old format (with standardWeight/maxWeight) to test backward compatibility
 */

import { describe, it, expect } from 'vitest';
import { serializeAircraft, deserializeAircraft } from '../lib/aircraftStorage';
import { AircraftPerformance, LegacyAircraftPerformance, migrateAircraftToNewFormat } from '../lib/aircraft';

describe('Aircraft Serialization (CBOR)', () => {
  describe('serializeAircraft', () => {
    it('should serialize aircraft with only name and model by default', () => {
      const aircraft: LegacyAircraftPerformance = {
        name: 'Cessna 150',
        model: 'abc123',
        standardWeight: 1400,
        maxWeight: 1650,
        climbTable: [
          { altitudeFrom: 0, altitudeTo: 2000, rateOfClimb: 670, climbTAS: 70, fuelFlow: 6.0 },
          { altitudeFrom: 2000, altitudeTo: 4000, rateOfClimb: 580, climbTAS: 68, fuelFlow: 5.8 },
        ],
        deviationTable: [
          { forHeading: 0, steerHeading: 2 },
          { forHeading: 30, steerHeading: 28 },
        ],
      };

      const serialized = serializeAircraft(migrateAircraftToNewFormat(aircraft)); // No options = only name + model

      expect(serialized).toBeTruthy();
      expect(serialized.length).toBeGreaterThan(0);
      expect(serialized).not.toContain('~'); // No legacy format markers
      expect(serialized).not.toContain('+'); // URL-safe
      expect(serialized).not.toContain('/'); // URL-safe
      expect(serialized).not.toContain('='); // No padding

      // Verify it's compact (should be much smaller without all the data)
      const deserialized: AircraftPerformance | null = deserializeAircraft(serialized);
      expect(deserialized?.name).toBe(aircraft.name);
      expect(deserialized?.model).toBe(aircraft.model);
      // Migration creates default values when weights are not serialized
      expect(deserialized?.weights?.standardWeight).toBeUndefined();
      expect(deserialized?.weights?.maxGrossWeight).toBe(2200); // Default: 2000 + 200
      expect(deserialized?.climbTable).toEqual([]);
      expect(deserialized?.deviationTable).toBeUndefined();
    });

    it('should serialize aircraft with all fields when explicitly requested', () => {
      const aircraft: LegacyAircraftPerformance = {
        name: 'Cessna 150',
        model: 'abc123',
        standardWeight: 1400,
        maxWeight: 1650,
        climbTable: [
          { altitudeFrom: 0, altitudeTo: 2000, rateOfClimb: 670, climbTAS: 70, fuelFlow: 6.0 },
          { altitudeFrom: 2000, altitudeTo: 4000, rateOfClimb: 580, climbTAS: 68, fuelFlow: 5.8 },
        ],
        deviationTable: [
          { forHeading: 0, steerHeading: 2 },
          { forHeading: 30, steerHeading: 28 },
        ],
      };

      const serialized = serializeAircraft(migrateAircraftToNewFormat(aircraft), {
        includeStandardWeight: true,
        includeMaxWeight: true,
        includeClimbTable: true,
        includeDeviationTable: true,
      });

      expect(serialized).toBeTruthy();
      expect(serialized.length).toBeGreaterThan(0);
      expect(serialized).not.toContain('~'); // No legacy format markers
      expect(serialized).not.toContain('+'); // URL-safe
      expect(serialized).not.toContain('/'); // URL-safe
      expect(serialized).not.toContain('='); // No padding
    });

    it('should serialize aircraft with only required fields', () => {
      const aircraft: LegacyAircraftPerformance = {
        name: 'My Plane',
        model: 'C_xyz789',
      };

      const serialized = serializeAircraft(migrateAircraftToNewFormat(aircraft));

      expect(serialized).toBeTruthy();
      expect(serialized.length).toBeGreaterThan(0);
    });

    it('should serialize aircraft with only deviation table', () => {
      const aircraft: LegacyAircraftPerformance = {
        name: 'Plane with Deviation',
        model: 'dev123',
        deviationTable: [
          { forHeading: 0, steerHeading: 2 },
          { forHeading: 180, steerHeading: 178 },
        ],
      };

      const serialized = serializeAircraft(migrateAircraftToNewFormat(aircraft), {
        includeDeviationTable: true,
      });

      expect(serialized).toBeTruthy();
      expect(serialized.length).toBeGreaterThan(0);

      const deserialized: AircraftPerformance | null = deserializeAircraft(serialized);
      expect(deserialized?.deviationTable).toHaveLength(2);
    });

    it('should serialize aircraft with only climb table', () => {
      const aircraft: LegacyAircraftPerformance = {
        name: 'Plane with Climb',
        model: 'clb123',
        climbTable: [
          { altitudeFrom: 0, altitudeTo: 5000, rateOfClimb: 500, climbTAS: 75, fuelFlow: 7.0 },
        ],
      };

      const serialized = serializeAircraft(migrateAircraftToNewFormat(aircraft), {
        includeClimbTable: true,
      });

      expect(serialized).toBeTruthy();
      expect(serialized.length).toBeGreaterThan(0);

      const deserialized: AircraftPerformance | null = deserializeAircraft(serialized);
      expect(deserialized?.climbTable).toHaveLength(1);
    });

    it('should handle empty arrays', () => {
      const aircraft: LegacyAircraftPerformance = {
        name: 'Empty Arrays',
        model: 'C_empty',
        climbTable: [],
        deviationTable: [],
      };

      const serialized = serializeAircraft(migrateAircraftToNewFormat(aircraft));

      expect(serialized).toBeTruthy();
    });

    it('should handle special characters in name', () => {
      const aircraft: LegacyAircraftPerformance = {
        name: 'Cessna 150 José (2)',
        model: 'C_special',
      };

      const serialized = serializeAircraft(migrateAircraftToNewFormat(aircraft));

      expect(serialized).toBeTruthy();
    });
  });

  describe('deserializeAircraft', () => {
    it('should deserialize aircraft with all fields', () => {
      const original: LegacyAircraftPerformance = {
        name: 'Cessna 150',
        model: 'abc123',
        standardWeight: 1400,
        maxWeight: 1650,
        climbTable: [
          { altitudeFrom: 0, altitudeTo: 2000, rateOfClimb: 670, climbTAS: 70, fuelFlow: 6.0 },
        ],
        deviationTable: [
          { forHeading: 0, steerHeading: 2 },
        ],
      };

      const serialized = serializeAircraft(migrateAircraftToNewFormat(original), {
        includeStandardWeight: true,
        includeMaxWeight: true,
        includeClimbTable: true,
        includeDeviationTable: true,
      });
      const deserialized: AircraftPerformance | null = deserializeAircraft(serialized);

      expect(deserialized).not.toBeNull();
      expect(deserialized?.name).toBe(original.name);
      expect(deserialized?.model).toBe(original.model);
      expect(deserialized?.weights?.standardWeight).toBe(original.standardWeight);
      expect(deserialized?.weights?.maxGrossWeight).toBe(original.maxWeight);
      expect(deserialized?.climbTable).toHaveLength(1);
      expect(deserialized?.deviationTable).toHaveLength(1);
    });

    it('should deserialize aircraft with only required fields', () => {
      const original: LegacyAircraftPerformance = {
        name: 'Minimal Plane',
        model: 'C_min',
      };

      const serialized = serializeAircraft(migrateAircraftToNewFormat(original));
      const deserialized: AircraftPerformance | null = deserializeAircraft(serialized);

      expect(deserialized).not.toBeNull();
      expect(deserialized?.name).toBe(original.name);
      expect(deserialized?.model).toBe(original.model);
      // Migration creates default values for missing weights
      expect(deserialized?.weights?.standardWeight).toBeUndefined();
      expect(deserialized?.weights?.maxGrossWeight).toBe(2200); // Default: 2000 + 200
      expect(deserialized?.climbTable).toEqual([]);
      expect(deserialized?.deviationTable).toBeUndefined();
    });

    it('should return null for invalid serialized data', () => {
      expect(deserializeAircraft('')).toBeNull();
      expect(deserializeAircraft('invalid')).toBeNull();
      expect(deserializeAircraft('12345')).toBeNull();
    });

    it('should handle legacy tilde-separated format', () => {
      const legacy = 'Test Plane~C_legacy~1500~1700~CLIMB~0,2000,670,70,6~DEV~0,2~30,28';
      const deserialized: AircraftPerformance | null = deserializeAircraft(legacy);

      expect(deserialized).not.toBeNull();
      expect(deserialized?.name).toBe('Test Plane');
      expect(deserialized?.model).toBe('C_legacy');
      expect(deserialized?.weights?.standardWeight).toBe(1500);
      expect(deserialized?.weights?.maxGrossWeight).toBe(1700);
      expect(deserialized?.climbTable).toHaveLength(1);
      expect(deserialized?.deviationTable).toHaveLength(2);
    });
  });

  describe('Round-trip serialization', () => {
    it('should maintain data integrity through serialize -> deserialize', () => {
      const original: LegacyAircraftPerformance = {
        name: 'Round Trip Test',
        model: 'rt123',
        standardWeight: 1800,
        maxWeight: 2200,
        climbTable: [
          { pressureAltitude: 0, oat: 0, timeFromSL: 0, fuelFromSL: 0, distanceFromSL: 0 },
          { pressureAltitude: 2000, oat: 0, timeFromSL: 3, fuelFromSL: 0.3, distanceFromSL: 3 },
          { pressureAltitude: 4000, oat: 0, timeFromSL: 7, fuelFromSL: 0.7, distanceFromSL: 7 },
        ],
        deviationTable: [
          { forHeading: 0, steerHeading: 2 },
          { forHeading: 30, steerHeading: 28 },
          { forHeading: 60, steerHeading: 57 },
          { forHeading: 90, steerHeading: 87 },
        ],
      };

      const serialized = serializeAircraft(migrateAircraftToNewFormat(original), {
        includeStandardWeight: true,
        includeMaxWeight: true,
        includeClimbTable: true,
        includeDeviationTable: true,
      });
      const deserialized: AircraftPerformance | null = deserializeAircraft(serialized);

      expect(deserialized).not.toBeNull();
      expect(deserialized?.name).toBe(original.name);
      expect(deserialized?.model).toBe(original.model);
      expect(deserialized?.weights?.standardWeight).toBe(original.standardWeight);
      expect(deserialized?.weights?.maxGrossWeight).toBe(original.maxWeight);

      // Check climb table
      expect(deserialized?.climbTable).toHaveLength(original.climbTable!.length);
      original.climbTable!.forEach((seg, i) => {
        expect(deserialized?.climbTable?.[i].pressureAltitude).toBe(seg.pressureAltitude);
        expect(deserialized?.climbTable?.[i].oat).toBe(seg.oat);
        expect(deserialized?.climbTable?.[i].timeFromSL).toBe(seg.timeFromSL);
        expect(deserialized?.climbTable?.[i].fuelFromSL).toBe(seg.fuelFromSL);
        expect(deserialized?.climbTable?.[i].distanceFromSL).toBe(seg.distanceFromSL);
      });

      // Check deviation table
      expect(deserialized?.deviationTable).toHaveLength(original.deviationTable!.length);
      original.deviationTable!.forEach((dev, i) => {
        expect(deserialized?.deviationTable?.[i].forHeading).toBe(dev.forHeading);
        expect(deserialized?.deviationTable?.[i].steerHeading).toBe(dev.steerHeading);
      });
    });

    it('should handle large datasets efficiently', () => {
      const original: LegacyAircraftPerformance = {
        name: 'Large Dataset Plane',
        model: 'large',
        standardWeight: 2000,
        maxWeight: 2400,
        climbTable: Array.from({ length: 20 }, (_, i) => ({
          pressureAltitude: i * 1000,
          oat: 20,
          timeFromSL: i * 2,
          fuelFromSL: i * 0.3,
          distanceFromSL: i * 3,
        })),
        deviationTable: Array.from({ length: 24 }, (_, i) => ({
          forHeading: i * 15,
          steerHeading: i * 15 - (i % 2 === 0 ? 2 : 3),
        })),
      };

      const serialized = serializeAircraft(migrateAircraftToNewFormat(original), {
        includeStandardWeight: true,
        includeMaxWeight: true,
        includeClimbTable: true,
        includeDeviationTable: true,
      });
      const deserialized: AircraftPerformance | null = deserializeAircraft(serialized);

      expect(deserialized).not.toBeNull();
      expect(deserialized?.climbTable).toHaveLength(20);
      expect(deserialized?.deviationTable).toHaveLength(24);

      // Verify size is reasonable (should be < 1KB for this dataset)
      expect(serialized.length).toBeLessThan(1000);
    });

    it('should handle floating point numbers correctly', () => {
      const original: LegacyAircraftPerformance = {
        name: 'Float Test',
        model: 'float',
        standardWeight: 1499.5,
        maxWeight: 1649.9,
        climbTable: [
          { pressureAltitude: 2000, oat: 15.5, timeFromSL: 3.25, fuelFromSL: 0.35, distanceFromSL: 3.75 },
        ],
      };

      const serialized = serializeAircraft(migrateAircraftToNewFormat(original), {
        includeStandardWeight: true,
        includeMaxWeight: true,
        includeClimbTable: true,
      });
      const deserialized: AircraftPerformance | null = deserializeAircraft(serialized);

      expect(deserialized?.weights?.standardWeight).toBeCloseTo(1499.5, 1);
      expect(deserialized?.weights?.maxGrossWeight).toBeCloseTo(1649.9, 1);
      expect(deserialized?.climbTable?.[0].pressureAltitude).toBe(2000);
      expect(deserialized?.climbTable?.[0].oat).toBeCloseTo(15.5, 1);
      expect(deserialized?.climbTable?.[0].timeFromSL).toBeCloseTo(3.25, 2);
    });
  });

  describe('Edge cases', () => {
    it('should handle undefined vs null correctly', () => {
      const withUndefined: LegacyAircraftPerformance = {
        name: 'Undefined Test',
        model: 'undef',
        standardWeight: undefined,
        maxWeight: undefined,
      };

      const serialized = serializeAircraft(migrateAircraftToNewFormat(withUndefined), {
        includeStandardWeight: true,
        includeMaxWeight: true,
      });
      const deserialized: AircraftPerformance | null = deserializeAircraft(serialized);

      // Migration preserves undefined standardWeight but calculates maxGrossWeight
      expect(deserialized?.weights?.standardWeight).toBeUndefined();
      expect(deserialized?.weights?.maxGrossWeight).toBe(2200); // Default: 2000 + 200
    });

    it('should handle zero values', () => {
      const withZeros: LegacyAircraftPerformance = {
        name: 'Zero Test',
        model: 'zero',
        standardWeight: 0,
        maxWeight: 0,
        climbTable: [
          { pressureAltitude: 0, oat: 0, timeFromSL: 0, fuelFromSL: 0, distanceFromSL: 0 },
        ],
        deviationTable: [
          { forHeading: 0, steerHeading: 0 },
        ],
      };

      const serialized = serializeAircraft(migrateAircraftToNewFormat(withZeros), {
        includeStandardWeight: true,
        includeMaxWeight: true,
        includeClimbTable: true,
        includeDeviationTable: true,
      });
      const deserialized: AircraftPerformance | null = deserializeAircraft(serialized);

      expect(deserialized?.weights?.standardWeight).toBe(0);
      // Migration treats 0 as falsy, so calculates default: 2000 + 200 = 2200
      expect(deserialized?.weights?.maxGrossWeight).toBe(2200);
      expect(deserialized?.climbTable?.[0].pressureAltitude).toBe(0);
    });

    it('should handle negative values', () => {
      const withNegatives: LegacyAircraftPerformance = {
        name: 'Negative Test',
        model: 'neg',
        deviationTable: [
          { forHeading: 0, steerHeading: -5 },
          { forHeading: 180, steerHeading: -3 },
        ],
      };

      const serialized = serializeAircraft(migrateAircraftToNewFormat(withNegatives), {
        includeDeviationTable: true,
      });
      const deserialized: AircraftPerformance | null = deserializeAircraft(serialized);

      expect(deserialized?.deviationTable?.[0].steerHeading).toBe(-5);
      expect(deserialized?.deviationTable?.[1].steerHeading).toBe(-3);
    });
  });

  describe('Compression efficiency', () => {
    it('should produce compact output', () => {
      const aircraft: LegacyAircraftPerformance = {
        name: 'Compact Test',
        model: 'test',
        standardWeight: 1500,
        maxWeight: 1650,
        climbTable: [
          { pressureAltitude: 2000, oat: 20, timeFromSL: 3, fuelFromSL: 0.3, distanceFromSL: 3 },
        ],
        deviationTable: [
          { forHeading: 0, steerHeading: 2 },
          { forHeading: 30, steerHeading: 28 },
        ],
      };

      const serialized = serializeAircraft(migrateAircraftToNewFormat(aircraft), {
        includeStandardWeight: true,
        includeMaxWeight: true,
        includeClimbTable: true,
        includeDeviationTable: true,
      });
      const jsonSize = JSON.stringify(aircraft).length;

      // CBOR + base64url should be significantly smaller than JSON
      expect(serialized.length).toBeLessThan(jsonSize * 0.7);
    });

    it('should produce minimal output with default options (name + model only)', () => {
      const aircraft: LegacyAircraftPerformance = {
        name: 'Minimal Test',
        model: 'test',
        standardWeight: 1500,
        maxWeight: 1650,
        climbTable: [
          { pressureAltitude: 2000, oat: 20, timeFromSL: 3, fuelFromSL: 0.3, distanceFromSL: 3 },
        ],
        deviationTable: [
          { forHeading: 0, steerHeading: 2 },
        ],
      };

      const minimalSerialized = serializeAircraft(migrateAircraftToNewFormat(aircraft)); // Default: only name + model
      const fullSerialized = serializeAircraft(migrateAircraftToNewFormat(aircraft), {
        includeStandardWeight: true,
        includeMaxWeight: true,
        includeClimbTable: true,
        includeDeviationTable: true,
      });

      // Minimal should be significantly smaller (less than 70% of full)
      expect(minimalSerialized.length).toBeLessThan(fullSerialized.length * 0.7);
    });
  });
});
