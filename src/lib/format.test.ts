import { describe, it, expect } from "vitest";
import { formatDuration, secondsToTimeString, timeStringToSeconds } from "./format";

describe("formatDuration", () => {
  it("returns empty string for nullish", () => {
    expect(formatDuration(null)).toBe("");
    expect(formatDuration(undefined)).toBe("");
  });
  it("renders seconds under 1 minute", () => {
    expect(formatDuration(0)).toBe("0s");
    expect(formatDuration(45)).toBe("45s");
    expect(formatDuration(59)).toBe("59s");
  });
  it("renders minutes between 1 min and 1 h", () => {
    expect(formatDuration(60)).toBe("1min");
    expect(formatDuration(150)).toBe("2m30");
    expect(formatDuration(3599)).toBe("59m59");
  });
  it("renders hours for >= 1 h", () => {
    expect(formatDuration(3600)).toBe("1h");
    expect(formatDuration(4500)).toBe("1h15");
  });
  it("clamps negative input to 0", () => {
    expect(formatDuration(-10)).toBe("0s");
  });
});

describe("secondsToTimeString / timeStringToSeconds round-trip", () => {
  it("round-trips on a typical value", () => {
    const s = 3725; // 1h02m05s
    expect(secondsToTimeString(s)).toBe("01:02:05");
    expect(timeStringToSeconds("01:02:05")).toBe(s);
  });
  it("parses HH:MM without seconds", () => {
    expect(timeStringToSeconds("00:02")).toBe(120);
  });
  it("returns null on invalid input", () => {
    expect(timeStringToSeconds("")).toBe(null);
    expect(timeStringToSeconds("abc")).toBe(null);
    expect(timeStringToSeconds("1:2:3:4")).toBe(null);
  });
});
