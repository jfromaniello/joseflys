import { describe, it, expect } from "vitest";
import { buildReversedLegData } from "../lib/flightPlan/flightPlanReverse";
import type {
  FlightPlan,
  FlightPlanLeg,
} from "../lib/flightPlan/flightPlanStorage";

function makeLeg(partial: Partial<FlightPlanLeg> & { id: string }): FlightPlanLeg {
  return {
    index: 0,
    th: 90,
    tas: 120,
    md: 0,
    dist: 100,
    ff: 10,
    fuelUnit: "gph",
    plane: "",
    unit: "kt",
    ...partial,
  };
}

function makePlan(legs: FlightPlanLeg[], extra: Partial<FlightPlan> = {}): FlightPlan {
  return {
    id: "plan1",
    name: "Test Plan",
    created_at: 0,
    updated_at: 0,
    legs: legs.map((leg, index) => ({ ...leg, index })),
    ...extra,
  };
}

describe("buildReversedLegData", () => {
  it("returns an empty array when there are no legs", () => {
    expect(buildReversedLegData(makePlan([]))).toEqual([]);
  });

  it("reverses leg order and swaps from/to", () => {
    const plan = makePlan([
      makeLeg({ id: "a", from: { name: "A" }, to: { name: "B" } }),
      makeLeg({ id: "b", from: { name: "B" }, to: { name: "C" } }),
    ]);

    const reversed = buildReversedLegData(plan);

    expect(reversed).toHaveLength(2);
    // First reversed leg is the old last leg, flown backwards: C -> B
    expect(reversed[0].from?.name).toBe("C");
    expect(reversed[0].to?.name).toBe("B");
    // Second reversed leg: B -> A
    expect(reversed[1].from?.name).toBe("B");
    expect(reversed[1].to?.name).toBe("A");
  });

  it("reverses the true course by 180 degrees and normalizes", () => {
    const plan = makePlan([
      makeLeg({ id: "a", th: 90 }),
      makeLeg({ id: "b", th: 270 }),
      makeLeg({ id: "c", th: 10 }),
    ]);

    const reversed = buildReversedLegData(plan);

    // Order is reversed: c (10 -> 190), b (270 -> 90), a (90 -> 270)
    expect(reversed[0].th).toBe(190);
    expect(reversed[1].th).toBe(90);
    expect(reversed[2].th).toBe(270);
  });

  it("reverses checkpoints within each leg", () => {
    const plan = makePlan([
      makeLeg({
        id: "a",
        from: { name: "A" },
        to: { name: "B" },
        checkpoints: [{ name: "W1" }, { name: "W2" }, { name: "W3" }],
      }),
    ]);

    const reversed = buildReversedLegData(plan);

    expect(reversed[0].checkpoints?.map((c) => c.name)).toEqual([
      "W3",
      "W2",
      "W1",
    ]);
  });

  it("keeps wind, TAS, fuel flow and magnetic variation exact", () => {
    const plan = makePlan([
      makeLeg({
        id: "a",
        tas: 135,
        wd: 270,
        ws: 22,
        var: -8,
        md: 8,
        ff: 14.3,
        fuelUnit: "lph",
      }),
    ]);

    const reversed = buildReversedLegData(plan);

    expect(reversed[0].tas).toBe(135);
    expect(reversed[0].wd).toBe(270);
    expect(reversed[0].ws).toBe(22);
    expect(reversed[0].var).toBe(-8);
    expect(reversed[0].md).toBe(8);
    expect(reversed[0].ff).toBe(14.3);
    expect(reversed[0].fuelUnit).toBe("lph");
  });

  it("swaps climb and descent phases per leg", () => {
    const plan = makePlan([
      makeLeg({
        id: "a",
        climbTas: 90,
        climbDist: 10,
        climbFuel: 3,
        climbWd: 200,
        climbWs: 5,
        descentTas: 110,
        descentDist: 8,
        descentFuel: 2,
        descentWd: 300,
        descentWs: 9,
      }),
    ]);

    const reversed = buildReversedLegData(plan);

    expect(reversed[0].climbTas).toBe(110);
    expect(reversed[0].climbDist).toBe(8);
    expect(reversed[0].climbFuel).toBe(2);
    expect(reversed[0].climbWd).toBe(300);
    expect(reversed[0].climbWs).toBe(9);
    expect(reversed[0].descentTas).toBe(90);
    expect(reversed[0].descentDist).toBe(10);
    expect(reversed[0].descentFuel).toBe(3);
    expect(reversed[0].descentWd).toBe(200);
    expect(reversed[0].descentWs).toBe(5);
  });

  it("drops alternative legs", () => {
    const plan = makePlan([
      makeLeg({ id: "dep", from: { name: "A" }, to: { name: "B" }, climbDist: 10, climbTas: 90, climbFuel: 3 }),
      makeLeg({
        id: "dest",
        from: { name: "B" },
        to: { name: "C" },
        descentTas: 110,
        descentDist: 8,
        descentFuel: 2,
      }),
      // Alternate leg: descent data after the first descent leg -> dropped
      makeLeg({
        id: "alt",
        from: { name: "C" },
        to: { name: "D" },
        descentTas: 110,
        descentDist: 8,
        descentFuel: 2,
      }),
    ]);

    const reversed = buildReversedLegData(plan);

    expect(reversed).toHaveLength(2);
    // No reversed leg references the alternate point D as origin/destination
    const names = reversed.flatMap((l) => [l.from?.name, l.to?.name]);
    expect(names).not.toContain("D");
  });

  it("moves destination reserve fuel onto the new arrival leg and clears it elsewhere", () => {
    const plan = makePlan([
      makeLeg({ id: "dep", from: { name: "A" }, to: { name: "B" } }),
      makeLeg({
        id: "dest",
        from: { name: "B" },
        to: { name: "C" },
        descentTas: 110,
        descentDist: 8,
        descentFuel: 2,
        additionalFuel: 30,
        approachLandingFuel: 5,
      }),
    ]);

    const reversed = buildReversedLegData(plan);

    // New departure leg (reversed destination) must not carry reserves
    expect(reversed[0].additionalFuel).toBeUndefined();
    expect(reversed[0].approachLandingFuel).toBeUndefined();
    // New arrival leg (reversed departure, ends at A) carries the reserves
    expect(reversed[1].to?.name).toBe("A");
    expect(reversed[1].additionalFuel).toBe(30);
    expect(reversed[1].approachLandingFuel).toBe(5);
  });

  it("regenerates leg descriptions from the swapped endpoints", () => {
    const plan = makePlan([
      makeLeg({ id: "a", from: { name: "A" }, to: { name: "B" }, desc: "A to B" }),
    ]);

    const reversed = buildReversedLegData(plan);

    expect(reversed[0].desc).toBe("B to A");
  });

  it("clears cumulative fields on the first reversed leg", () => {
    const plan = makePlan([
      makeLeg({ id: "a", from: { name: "A" }, to: { name: "B" } }),
      makeLeg({
        id: "b",
        from: { name: "B" },
        to: { name: "C" },
        prevFuel: 12,
        elapsedMin: 50,
        elapsedDist: 100,
      }),
    ]);

    const reversed = buildReversedLegData(plan);

    expect(reversed[0].prevFuel).toBeUndefined();
    expect(reversed[0].elapsedMin).toBeUndefined();
    expect(reversed[0].elapsedDist).toBeUndefined();
    // Second leg accumulates the first reversed leg's distance
    expect(reversed[1].elapsedDist).toBe(100);
  });
});
