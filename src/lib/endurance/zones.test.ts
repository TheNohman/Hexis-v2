import { describe, it, expect } from "vitest";
import {
  computeHeartRateZones,
  computePaceZones,
  formatPace,
} from "./zones";

describe("computeHeartRateZones", () => {
  it("uses %HRmax when FC repos is not provided", () => {
    const zones = computeHeartRateZones(200, null);
    expect(zones.usedKarvonen).toBe(false);
    // Z1 = 50-60% HRmax
    expect(zones.zones[0].lowBpm).toBe(100);
    expect(zones.zones[0].highBpm).toBe(120);
    // Z5 = 90-100% HRmax
    expect(zones.zones[4].lowBpm).toBe(180);
    expect(zones.zones[4].highBpm).toBe(200);
  });

  it("uses Karvonen when FC repos is provided", () => {
    const zones = computeHeartRateZones(200, 50);
    expect(zones.usedKarvonen).toBe(true);
    // HRR = 200 - 50 = 150. Z2 low = 50 + 150 * 0.6 = 140.
    expect(zones.zones[1].lowBpm).toBe(140);
    expect(zones.zones[1].highBpm).toBe(155);
  });

  it("falls back to %HRmax when FC repos is invalid (>= FCmax)", () => {
    const zones = computeHeartRateZones(180, 200);
    expect(zones.usedKarvonen).toBe(false);
  });

  it("returns 5 zones in monotonic order", () => {
    const zones = computeHeartRateZones(185, 55);
    expect(zones.zones).toHaveLength(5);
    for (let i = 1; i < zones.zones.length; i++) {
      expect(zones.zones[i].lowBpm).toBeGreaterThanOrEqual(zones.zones[i - 1].lowBpm);
    }
  });
});

describe("computePaceZones", () => {
  it("produces faster (smaller) paces for higher zones", () => {
    const zones = computePaceZones(16);
    // Z1 is slower than Z5 → lowPaceSecPerKm bigger for Z1.
    expect(zones.zones[0].lowPaceSecPerKm).toBeGreaterThan(zones.zones[4].lowPaceSecPerKm);
  });

  it("computes a reasonable VMA pace (around 3:45/km for 16 km/h)", () => {
    const zones = computePaceZones(16);
    // 100% VMA at 16 km/h = 3 min 45 s/km = 225 s/km.
    const vmaSec = Math.round(60 / 16 * 60);
    expect(vmaSec).toBe(225);
    // Z5 high pct = 1.0 → 225 s/km.
    expect(zones.zones[4].highPaceSecPerKm).toBeCloseTo(225, 0);
  });
});

describe("formatPace", () => {
  it("formats 360 s/km as 6:00/km", () => {
    expect(formatPace(360)).toBe("6:00/km");
  });
  it("pads seconds to two digits", () => {
    expect(formatPace(345)).toBe("5:45/km");
    expect(formatPace(305)).toBe("5:05/km");
  });
});
