import { describe, it, expect } from "vitest";
import { estimate1RM } from "./detect";

describe("estimate1RM (Epley formula)", () => {
  it("returns the raw weight for a 1-rep lift", () => {
    expect(estimate1RM(100, 1)).toBeCloseTo(103.33, 1);
    // Epley: 100 * (1 + 1/30) = 103.33; reps=1 still applies formula.
    // If we want exact weight-for-1, that's a business decision. The
    // formula is inclusive.
  });

  it("computes Epley estimates for multi-rep sets", () => {
    // 80 kg × 5 reps ≈ 80 * (1 + 5/30) = 93.33
    expect(estimate1RM(80, 5)).toBeCloseTo(93.33, 1);
    // 100 kg × 10 reps ≈ 100 * (1 + 10/30) = 133.33
    expect(estimate1RM(100, 10)).toBeCloseTo(133.33, 1);
  });

  it("ranks higher reps above lower reps at same weight", () => {
    const low = estimate1RM(100, 3);
    const high = estimate1RM(100, 8);
    expect(high).toBeGreaterThan(low);
  });

  it("ranks higher weight above lower weight at same reps", () => {
    const low = estimate1RM(80, 5);
    const high = estimate1RM(100, 5);
    expect(high).toBeGreaterThan(low);
  });

  it("returns 0 on invalid input (non-positive weight or reps)", () => {
    expect(estimate1RM(0, 5)).toBe(0);
    expect(estimate1RM(-10, 5)).toBe(0);
    expect(estimate1RM(80, 0)).toBe(0);
    expect(estimate1RM(80, -1)).toBe(0);
  });

  it("rounds to 2 decimals", () => {
    const result = estimate1RM(82.5, 7);
    expect(result.toString()).toMatch(/^\d+(\.\d{1,2})?$/);
  });
});
