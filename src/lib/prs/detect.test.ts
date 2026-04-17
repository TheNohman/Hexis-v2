import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => {
  return {
    prisma: {
      exercise: { findUnique: vi.fn() },
      exerciseMax: {
        create: vi.fn(),
        createMany: vi.fn(),
        findMany: vi.fn(),
      },
      workout: { findFirst: vi.fn() },
    },
  };
});

import { prisma } from "@/lib/prisma";
import { addManualPR, detectAndRecordPRs, estimate1RM } from "./detect";

const mocked = prisma as unknown as {
  exercise: { findUnique: ReturnType<typeof vi.fn> };
  exerciseMax: {
    create: ReturnType<typeof vi.fn>;
    createMany: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
  };
  workout: { findFirst: ReturnType<typeof vi.fn> };
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("estimate1RM (Epley formula)", () => {
  it("returns the raw weight for a 1-rep lift", () => {
    expect(estimate1RM(100, 1)).toBeCloseTo(103.33, 1);
  });

  it("computes Epley estimates for multi-rep sets", () => {
    expect(estimate1RM(80, 5)).toBeCloseTo(93.33, 1);
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

describe("addManualPR", () => {
  it("creates a MANUAL ExerciseMax with Epley 1RM", async () => {
    mocked.exercise.findUnique.mockResolvedValue({
      id: "ex-1",
      isSystem: true,
      userId: null,
    });
    mocked.exerciseMax.create.mockResolvedValue({ id: "max-1" });

    const achievedAt = new Date("2026-04-01T10:00:00Z");
    await addManualPR("user-1", {
      exerciseId: "ex-1",
      weightKg: 100,
      reps: 5,
      achievedAt,
    });

    expect(mocked.exerciseMax.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: "user-1",
        exerciseId: "ex-1",
        weightKg: 100,
        reps: 5,
        estimated1RM: estimate1RM(100, 5),
        achievedAt,
        source: "MANUAL",
      }),
    });
  });

  it("defaults achievedAt to now when omitted", async () => {
    mocked.exercise.findUnique.mockResolvedValue({
      id: "ex-1",
      isSystem: false,
      userId: "user-1",
    });
    mocked.exerciseMax.create.mockResolvedValue({ id: "max-1" });

    await addManualPR("user-1", { exerciseId: "ex-1", weightKg: 90, reps: 3 });

    const call = mocked.exerciseMax.create.mock.calls[0][0];
    expect(call.data.achievedAt).toBeInstanceOf(Date);
  });

  it("throws Not found for missing exercise", async () => {
    mocked.exercise.findUnique.mockResolvedValue(null);
    await expect(
      addManualPR("user-1", { exerciseId: "ex-1", weightKg: 90, reps: 3 }),
    ).rejects.toThrow("Not found");
    expect(mocked.exerciseMax.create).not.toHaveBeenCalled();
  });

  it("throws Forbidden when exercise is another user's", async () => {
    mocked.exercise.findUnique.mockResolvedValue({
      id: "ex-1",
      isSystem: false,
      userId: "other-user",
    });
    await expect(
      addManualPR("user-1", { exerciseId: "ex-1", weightKg: 90, reps: 3 }),
    ).rejects.toThrow("Forbidden");
    expect(mocked.exerciseMax.create).not.toHaveBeenCalled();
  });

  it("rejects non-positive weight", async () => {
    await expect(
      addManualPR("user-1", { exerciseId: "ex-1", weightKg: 0, reps: 3 }),
    ).rejects.toThrow();
    await expect(
      addManualPR("user-1", { exerciseId: "ex-1", weightKg: -5, reps: 3 }),
    ).rejects.toThrow();
  });

  it("rejects non-integer or non-positive reps", async () => {
    await expect(
      addManualPR("user-1", { exerciseId: "ex-1", weightKg: 80, reps: 0 }),
    ).rejects.toThrow();
    await expect(
      addManualPR("user-1", { exerciseId: "ex-1", weightKg: 80, reps: 1.5 }),
    ).rejects.toThrow();
  });
});

describe("detectAndRecordPRs", () => {
  it("returns [] when workout is not found / not owned", async () => {
    mocked.workout.findFirst.mockResolvedValue(null);
    const out = await detectAndRecordPRs("w1", "user-1");
    expect(out).toEqual([]);
    expect(mocked.exerciseMax.createMany).not.toHaveBeenCalled();
  });

  it("detects a new PR and persists it when no previous best exists", async () => {
    mocked.workout.findFirst.mockResolvedValue({
      id: "w1",
      userId: "user-1",
      finishedAt: new Date("2026-04-10T12:00:00Z"),
      blocks: [
        {
          entries: [
            {
              exercise: { id: "ex-1", name: "Bench", type: "STRENGTH" },
              values: [
                { kpiDefinition: { slug: "weight_kg" }, valueNumeric: 100 },
                { kpiDefinition: { slug: "reps" }, valueNumeric: 5 },
              ],
            },
          ],
        },
      ],
    });
    mocked.exerciseMax.findMany.mockResolvedValue([]);
    mocked.exerciseMax.createMany.mockResolvedValue({ count: 1 });

    const out = await detectAndRecordPRs("w1", "user-1");
    expect(out).toHaveLength(1);
    expect(out[0]).toEqual(
      expect.objectContaining({
        exerciseId: "ex-1",
        previousEstimated1RM: null,
      }),
    );
    expect(mocked.exerciseMax.createMany).toHaveBeenCalled();
  });

  it("does NOT record a PR when the estimated 1RM does not beat the prior best", async () => {
    mocked.workout.findFirst.mockResolvedValue({
      id: "w1",
      userId: "user-1",
      finishedAt: new Date(),
      blocks: [
        {
          entries: [
            {
              exercise: { id: "ex-1", name: "Bench", type: "STRENGTH" },
              values: [
                { kpiDefinition: { slug: "weight_kg" }, valueNumeric: 80 },
                { kpiDefinition: { slug: "reps" }, valueNumeric: 5 },
              ],
            },
          ],
        },
      ],
    });
    mocked.exerciseMax.findMany.mockResolvedValue([
      { exerciseId: "ex-1", estimated1RM: 999 },
    ]);

    const out = await detectAndRecordPRs("w1", "user-1");
    expect(out).toEqual([]);
    expect(mocked.exerciseMax.createMany).not.toHaveBeenCalled();
  });

  it("ignores non-STRENGTH exercises", async () => {
    mocked.workout.findFirst.mockResolvedValue({
      id: "w1",
      userId: "user-1",
      finishedAt: new Date(),
      blocks: [
        {
          entries: [
            {
              exercise: { id: "cardio-1", name: "Run", type: "CARDIO" },
              values: [
                { kpiDefinition: { slug: "weight_kg" }, valueNumeric: 50 },
                { kpiDefinition: { slug: "reps" }, valueNumeric: 20 },
              ],
            },
          ],
        },
      ],
    });
    const out = await detectAndRecordPRs("w1", "user-1");
    expect(out).toEqual([]);
    expect(mocked.exerciseMax.createMany).not.toHaveBeenCalled();
  });
});
