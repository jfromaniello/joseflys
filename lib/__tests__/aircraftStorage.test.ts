/**
 * Tests for Aircraft Storage and Serialization (CBOR format)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { serializeAircraft, deserializeAircraft, saveAircraft, loadCustomAircraft } from '../aircraftStorage';
import { AircraftPerformance } from '../aircraftPerformance';

describe('Aircraft Serialization (CBOR)', () => {
  describe('serializeAircraft', () => {
    it('should serialize aircraft with only name and model by default', () => {
      const aircraft: AircraftPerformance = {
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

      const serialized = serializeAircraft(aircraft); // No options = only name + model

      expect(serialized).toBeTruthy();
      expect(serialized.length).toBeGreaterThan(0);
      expect(serialized).not.toContain('~'); // No legacy format markers
      expect(serialized).not.toContain('+'); // URL-safe
      expect(serialized).not.toContain('/'); // URL-safe
      expect(serialized).not.toContain('='); // No padding

      // Verify it's compact (should be much smaller without all the data)
      const deserialized = deserializeAircraft(serialized);
      expect(deserialized?.name).toBe(aircraft.name);
      expect(deserialized?.model).toBe(aircraft.model);
      expect(deserialized?.standardWeight).toBeUndefined();
      expect(deserialized?.maxWeight).toBeUndefined();
      expect(deserialized?.climbTable).toBeUndefined();
      expect(deserialized?.deviationTable).toBeUndefined();
    });

    it('should serialize aircraft with all fields when explicitly requested', () => {
      const aircraft: AircraftPerformance = {
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

      const serialized = serializeAircraft(aircraft, {
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
      const aircraft: AircraftPerformance = {
        name: 'My Plane',
        model: 'C_xyz789',
      };

      const serialized = serializeAircraft(aircraft);

      expect(serialized).toBeTruthy();
      expect(serialized.length).toBeGreaterThan(0);
    });

    it('should serialize aircraft with only deviation table', () => {
      const aircraft: AircraftPerformance = {
        name: 'Plane with Deviation',
        model: 'dev123',
        deviationTable: [
          { forHeading: 0, steerHeading: 2 },
          { forHeading: 180, steerHeading: 178 },
        ],
      };

      const serialized = serializeAircraft(aircraft, {
        includeDeviationTable: true,
      });

      expect(serialized).toBeTruthy();
      expect(serialized.length).toBeGreaterThan(0);

      const deserialized = deserializeAircraft(serialized);
      expect(deserialized?.deviationTable).toHaveLength(2);
    });

    it('should serialize aircraft with only climb table', () => {
      const aircraft: AircraftPerformance = {
        name: 'Plane with Climb',
        model: 'clb123',
        climbTable: [
          { altitudeFrom: 0, altitudeTo: 5000, rateOfClimb: 500, climbTAS: 75, fuelFlow: 7.0 },
        ],
      };

      const serialized = serializeAircraft(aircraft, {
        includeClimbTable: true,
      });

      expect(serialized).toBeTruthy();
      expect(serialized.length).toBeGreaterThan(0);

      const deserialized = deserializeAircraft(serialized);
      expect(deserialized?.climbTable).toHaveLength(1);
    });

    it('should handle empty arrays', () => {
      const aircraft: AircraftPerformance = {
        name: 'Empty Arrays',
        model: 'C_empty',
        climbTable: [],
        deviationTable: [],
      };

      const serialized = serializeAircraft(aircraft);

      expect(serialized).toBeTruthy();
    });

    it('should handle special characters in name', () => {
      const aircraft: AircraftPerformance = {
        name: 'Cessna 150 José (2)',
        model: 'C_special',
      };

      const serialized = serializeAircraft(aircraft);

      expect(serialized).toBeTruthy();
    });
  });

  describe('deserializeAircraft', () => {
    it('should deserialize aircraft with all fields', () => {
      const original: AircraftPerformance = {
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

      const serialized = serializeAircraft(original, {
        includeStandardWeight: true,
        includeMaxWeight: true,
        includeClimbTable: true,
        includeDeviationTable: true,
      });
      const deserialized = deserializeAircraft(serialized);

      expect(deserialized).not.toBeNull();
      expect(deserialized?.name).toBe(original.name);
      expect(deserialized?.model).toBe(original.model);
      expect(deserialized?.standardWeight).toBe(original.standardWeight);
      expect(deserialized?.maxWeight).toBe(original.maxWeight);
      expect(deserialized?.climbTable).toHaveLength(1);
      expect(deserialized?.deviationTable).toHaveLength(1);
    });

    it('should deserialize aircraft with only required fields', () => {
      const original: AircraftPerformance = {
        name: 'Minimal Plane',
        model: 'C_min',
      };

      const serialized = serializeAircraft(original);
      const deserialized = deserializeAircraft(serialized);

      expect(deserialized).not.toBeNull();
      expect(deserialized?.name).toBe(original.name);
      expect(deserialized?.model).toBe(original.model);
      expect(deserialized?.standardWeight).toBeUndefined();
      expect(deserialized?.maxWeight).toBeUndefined();
      expect(deserialized?.climbTable).toBeUndefined();
      expect(deserialized?.deviationTable).toBeUndefined();
    });

    it('should return null for invalid serialized data', () => {
      expect(deserializeAircraft('')).toBeNull();
      expect(deserializeAircraft('invalid')).toBeNull();
      expect(deserializeAircraft('12345')).toBeNull();
    });

    it('should handle legacy tilde-separated format', () => {
      const legacy = 'Test Plane~C_legacy~1500~1700~CLIMB~0,2000,670,70,6~DEV~0,2~30,28';
      const deserialized = deserializeAircraft(legacy);

      expect(deserialized).not.toBeNull();
      expect(deserialized?.name).toBe('Test Plane');
      expect(deserialized?.model).toBe('C_legacy');
      expect(deserialized?.standardWeight).toBe(1500);
      expect(deserialized?.maxWeight).toBe(1700);
      expect(deserialized?.climbTable).toHaveLength(1);
      expect(deserialized?.deviationTable).toHaveLength(2);
    });
  });

  describe('Round-trip serialization', () => {
    it('should maintain data integrity through serialize -> deserialize', () => {
      const original: AircraftPerformance = {
        name: 'Round Trip Test',
        model: 'rt123',
        standardWeight: 1800,
        maxWeight: 2200,
        climbTable: [
          { altitudeFrom: 0, altitudeTo: 1000, rateOfClimb: 700, climbTAS: 70, fuelFlow: 6.2 },
          { altitudeFrom: 1000, altitudeTo: 2000, rateOfClimb: 670, climbTAS: 70, fuelFlow: 6.0 },
          { altitudeFrom: 2000, altitudeTo: 3000, rateOfClimb: 625, climbTAS: 69, fuelFlow: 5.9 },
        ],
        deviationTable: [
          { forHeading: 0, steerHeading: 2 },
          { forHeading: 30, steerHeading: 28 },
          { forHeading: 60, steerHeading: 57 },
          { forHeading: 90, steerHeading: 87 },
        ],
      };

      const serialized = serializeAircraft(original, {
        includeStandardWeight: true,
        includeMaxWeight: true,
        includeClimbTable: true,
        includeDeviationTable: true,
      });
      const deserialized = deserializeAircraft(serialized);

      expect(deserialized).not.toBeNull();
      expect(deserialized?.name).toBe(original.name);
      expect(deserialized?.model).toBe(original.model);
      expect(deserialized?.standardWeight).toBe(original.standardWeight);
      expect(deserialized?.maxWeight).toBe(original.maxWeight);

      // Check climb table
      expect(deserialized?.climbTable).toHaveLength(original.climbTable!.length);
      original.climbTable!.forEach((seg, i) => {
        expect(deserialized?.climbTable?.[i].altitudeFrom).toBe(seg.altitudeFrom);
        expect(deserialized?.climbTable?.[i].altitudeTo).toBe(seg.altitudeTo);
        expect(deserialized?.climbTable?.[i].rateOfClimb).toBe(seg.rateOfClimb);
        expect(deserialized?.climbTable?.[i].climbTAS).toBe(seg.climbTAS);
        expect(deserialized?.climbTable?.[i].fuelFlow).toBe(seg.fuelFlow);
      });

      // Check deviation table
      expect(deserialized?.deviationTable).toHaveLength(original.deviationTable!.length);
      original.deviationTable!.forEach((dev, i) => {
        expect(deserialized?.deviationTable?.[i].forHeading).toBe(dev.forHeading);
        expect(deserialized?.deviationTable?.[i].steerHeading).toBe(dev.steerHeading);
      });
    });

    it('should handle large datasets efficiently', () => {
      const original: AircraftPerformance = {
        name: 'Large Dataset Plane',
        model: 'large',
        standardWeight: 2000,
        maxWeight: 2400,
        climbTable: Array.from({ length: 20 }, (_, i) => ({
          altitudeFrom: i * 500,
          altitudeTo: (i + 1) * 500,
          rateOfClimb: 700 - i * 20,
          climbTAS: 70 - i,
          fuelFlow: 6.5 - i * 0.1,
        })),
        deviationTable: Array.from({ length: 24 }, (_, i) => ({
          forHeading: i * 15,
          steerHeading: i * 15 - (i % 2 === 0 ? 2 : 3),
        })),
      };

      const serialized = serializeAircraft(original, {
        includeStandardWeight: true,
        includeMaxWeight: true,
        includeClimbTable: true,
        includeDeviationTable: true,
      });
      const deserialized = deserializeAircraft(serialized);

      expect(deserialized).not.toBeNull();
      expect(deserialized?.climbTable).toHaveLength(20);
      expect(deserialized?.deviationTable).toHaveLength(24);

      // Verify size is reasonable (should be < 1KB for this dataset)
      expect(serialized.length).toBeLessThan(1000);
    });

    it('should handle floating point numbers correctly', () => {
      const original: AircraftPerformance = {
        name: 'Float Test',
        model: 'float',
        standardWeight: 1499.5,
        maxWeight: 1649.9,
        climbTable: [
          { altitudeFrom: 0, altitudeTo: 2000, rateOfClimb: 670.5, climbTAS: 70.2, fuelFlow: 6.25 },
        ],
      };

      const serialized = serializeAircraft(original, {
        includeStandardWeight: true,
        includeMaxWeight: true,
        includeClimbTable: true,
      });
      const deserialized = deserializeAircraft(serialized);

      expect(deserialized?.standardWeight).toBeCloseTo(1499.5, 1);
      expect(deserialized?.maxWeight).toBeCloseTo(1649.9, 1);
      expect(deserialized?.climbTable?.[0].rateOfClimb).toBeCloseTo(670.5, 1);
      expect(deserialized?.climbTable?.[0].climbTAS).toBeCloseTo(70.2, 1);
      expect(deserialized?.climbTable?.[0].fuelFlow).toBeCloseTo(6.25, 2);
    });
  });

  describe('Edge cases', () => {
    it('should handle undefined vs null correctly', () => {
      const withUndefined: AircraftPerformance = {
        name: 'Undefined Test',
        model: 'undef',
        standardWeight: undefined,
        maxWeight: undefined,
      };

      const serialized = serializeAircraft(withUndefined, {
        includeStandardWeight: true,
        includeMaxWeight: true,
      });
      const deserialized = deserializeAircraft(serialized);

      expect(deserialized?.standardWeight).toBeUndefined();
      expect(deserialized?.maxWeight).toBeUndefined();
    });

    it('should handle zero values', () => {
      const withZeros: AircraftPerformance = {
        name: 'Zero Test',
        model: 'zero',
        standardWeight: 0,
        maxWeight: 0,
        climbTable: [
          { altitudeFrom: 0, altitudeTo: 0, rateOfClimb: 0, climbTAS: 0, fuelFlow: 0 },
        ],
        deviationTable: [
          { forHeading: 0, steerHeading: 0 },
        ],
      };

      const serialized = serializeAircraft(withZeros, {
        includeStandardWeight: true,
        includeMaxWeight: true,
        includeClimbTable: true,
        includeDeviationTable: true,
      });
      const deserialized = deserializeAircraft(serialized);

      expect(deserialized?.standardWeight).toBe(0);
      expect(deserialized?.maxWeight).toBe(0);
      expect(deserialized?.climbTable?.[0].rateOfClimb).toBe(0);
    });

    it('should handle negative values', () => {
      const withNegatives: AircraftPerformance = {
        name: 'Negative Test',
        model: 'neg',
        deviationTable: [
          { forHeading: 0, steerHeading: -5 },
          { forHeading: 180, steerHeading: -3 },
        ],
      };

      const serialized = serializeAircraft(withNegatives, {
        includeDeviationTable: true,
      });
      const deserialized = deserializeAircraft(serialized);

      expect(deserialized?.deviationTable?.[0].steerHeading).toBe(-5);
      expect(deserialized?.deviationTable?.[1].steerHeading).toBe(-3);
    });
  });

  describe('Compression efficiency', () => {
    it('should produce compact output', () => {
      const aircraft: AircraftPerformance = {
        name: 'Compact Test',
        model: 'test',
        standardWeight: 1500,
        maxWeight: 1650,
        climbTable: [
          { altitudeFrom: 0, altitudeTo: 2000, rateOfClimb: 670, climbTAS: 70, fuelFlow: 6.0 },
        ],
        deviationTable: [
          { forHeading: 0, steerHeading: 2 },
          { forHeading: 30, steerHeading: 28 },
        ],
      };

      const serialized = serializeAircraft(aircraft, {
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
      const aircraft: AircraftPerformance = {
        name: 'Minimal Test',
        model: 'test',
        standardWeight: 1500,
        maxWeight: 1650,
        climbTable: [
          { altitudeFrom: 0, altitudeTo: 2000, rateOfClimb: 670, climbTAS: 70, fuelFlow: 6.0 },
        ],
        deviationTable: [
          { forHeading: 0, steerHeading: 2 },
        ],
      };

      const minimalSerialized = serializeAircraft(aircraft); // Default: only name + model
      const fullSerialized = serializeAircraft(aircraft, {
        includeStandardWeight: true,
        includeMaxWeight: true,
        includeClimbTable: true,
        includeDeviationTable: true,
      });

      // Minimal should be significantly smaller (less than 60% of full)
      expect(minimalSerialized.length).toBeLessThan(fullSerialized.length * 0.6);
    });
  });
});
