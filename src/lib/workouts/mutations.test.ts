import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the prisma module before importing the module under test so that
// any top-level `import { prisma } from "@/lib/prisma"` resolves to our
// spy surface. Each test resets the mocks.
vi.mock("@/lib/prisma", () => {
  return {
    prisma: {
      workout: {
        findUnique: vi.fn(),
        update: vi.fn(),
        create: vi.fn(),
        updateMany: vi.fn(),
      },
      workoutBlock: {
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      workoutEntry: {
        update: vi.fn(),
      },
      entryKpiValue: {
        update: vi.fn(),
      },
      // The real implementation wraps writes in a transaction; stub it
      // so the callback runs against our mocked `tx` surface.
      $transaction: vi.fn(),
    },
  };
});

import { prisma } from "@/lib/prisma";
import {
  bulkValidatePlannedEntries,
  cloneWorkoutAsPlanned,
  incrementCompletedRounds,
} from "./mutations";

// Typed accessor to the mocked prisma object.
const mocked = prisma as unknown as {
  workout: {
    findUnique: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    updateMany: ReturnType<typeof vi.fn>;
  };
  workoutBlock: {
    findUnique: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  workoutEntry: {
    update: ReturnType<typeof vi.fn>;
  };
  entryKpiValue: {
    update: ReturnType<typeof vi.fn>;
  };
  $transaction: ReturnType<typeof vi.fn>;
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("incrementCompletedRounds", () => {
  it("increments completedRounds on an INTERVAL block", async () => {
    mocked.workoutBlock.findUnique.mockResolvedValue({
      id: "b1",
      mode: "INTERVAL",
      intervalConfig: { roundCount: 5 },
      completedRounds: 2,
      workout: { userId: "user-1" },
    });
    mocked.workoutBlock.update.mockResolvedValue({ id: "b1", completedRounds: 3 });

    await incrementCompletedRounds("b1", "user-1");

    expect(mocked.workoutBlock.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "b1" },
        data: { completedRounds: 3 },
      }),
    );
  });

  it("caps completedRounds at roundCount", async () => {
    mocked.workoutBlock.findUnique.mockResolvedValue({
      id: "b1",
      mode: "INTERVAL",
      intervalConfig: { roundCount: 4 },
      completedRounds: 4,
      workout: { userId: "user-1" },
    });
    mocked.workoutBlock.update.mockResolvedValue({});

    await incrementCompletedRounds("b1", "user-1");

    expect(mocked.workoutBlock.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "b1" },
        data: { completedRounds: 4 },
      }),
    );
  });

  it("throws Not found when block is missing", async () => {
    mocked.workoutBlock.findUnique.mockResolvedValue(null);
    await expect(incrementCompletedRounds("missing", "user-1")).rejects.toThrow(
      "Not found",
    );
    expect(mocked.workoutBlock.update).not.toHaveBeenCalled();
  });

  it("throws Forbidden on ownership mismatch", async () => {
    mocked.workoutBlock.findUnique.mockResolvedValue({
      id: "b1",
      mode: "INTERVAL",
      intervalConfig: { roundCount: 5 },
      completedRounds: 0,
      workout: { userId: "other-user" },
    });
    await expect(incrementCompletedRounds("b1", "user-1")).rejects.toThrow(
      "Forbidden",
    );
    expect(mocked.workoutBlock.update).not.toHaveBeenCalled();
  });

  it("rejects non-INTERVAL blocks", async () => {
    mocked.workoutBlock.findUnique.mockResolvedValue({
      id: "b1",
      mode: "STANDARD",
      intervalConfig: null,
      completedRounds: 0,
      workout: { userId: "user-1" },
    });
    await expect(incrementCompletedRounds("b1", "user-1")).rejects.toThrow(
      "Not an interval block",
    );
  });
});

describe("bulkValidatePlannedEntries", () => {
  it("copies planned -> actual and flips entries to DONE", async () => {
    mocked.workout.findUnique.mockResolvedValue({
      id: "w1",
      userId: "user-1",
      blocks: [
        {
          id: "b1",
          entries: [
            {
              id: "e1",
              values: [
                {
                  id: "v1",
                  valueNumeric: null,
                  valueText: null,
                  plannedNumeric: 80,
                  plannedText: null,
                },
                {
                  id: "v2",
                  valueNumeric: 10, // already filled — should be skipped
                  valueText: null,
                  plannedNumeric: 8,
                  plannedText: null,
                },
              ],
            },
            {
              id: "e2",
              values: [
                {
                  id: "v3",
                  valueNumeric: null,
                  valueText: null,
                  plannedNumeric: null,
                  plannedText: null, // nothing to copy
                },
              ],
            },
          ],
        },
      ],
    });

    // Capture the transaction callback and run it with our tx mock.
    const tx = {
      entryKpiValue: { update: vi.fn().mockResolvedValue({}) },
      workoutEntry: { update: vi.fn().mockResolvedValue({}) },
    };
    mocked.$transaction.mockImplementation(async (cb: (tx: unknown) => Promise<unknown>) => {
      return cb(tx);
    });

    const result = await bulkValidatePlannedEntries("w1", "user-1");

    expect(result).toEqual({ validatedCount: 2 });
    // Only v1 should be updated (v2 already filled, v3 had nothing planned).
    expect(tx.entryKpiValue.update).toHaveBeenCalledTimes(1);
    expect(tx.entryKpiValue.update).toHaveBeenCalledWith({
      where: { id: "v1" },
      data: { valueNumeric: 80, valueText: null },
    });
    // Both entries flipped to DONE.
    expect(tx.workoutEntry.update).toHaveBeenCalledTimes(2);
    expect(tx.workoutEntry.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "e1" },
        data: expect.objectContaining({ status: "DONE" }),
      }),
    );
  });

  it("throws Not found when workout is missing", async () => {
    mocked.workout.findUnique.mockResolvedValue(null);
    await expect(bulkValidatePlannedEntries("w1", "user-1")).rejects.toThrow();
  });

  it("throws Forbidden on ownership mismatch", async () => {
    mocked.workout.findUnique.mockResolvedValue({
      id: "w1",
      userId: "other-user",
      blocks: [],
    });
    await expect(bulkValidatePlannedEntries("w1", "user-1")).rejects.toThrow(
      /Forbidden/,
    );
  });
});

describe("cloneWorkoutAsPlanned", () => {
  function buildSourceWorkout() {
    return {
      id: "w1",
      userId: "user-1",
      name: "Push day",
      blocks: [
        {
          name: "Warmup",
          displayOrder: 0,
          entries: [
            {
              exerciseId: "ex-bench",
              displayOrder: 0,
              restDurationSecs: 60,
              isWarmup: false,
              exercise: { type: "STRENGTH" },
              values: [
                {
                  kpiDefinitionId: "kpi-w",
                  kpiDefinition: { slug: "weight_kg" },
                  valueNumeric: 80,
                  valueText: null,
                  plannedNumeric: 75,
                  plannedText: null,
                },
                {
                  kpiDefinitionId: "kpi-r",
                  kpiDefinition: { slug: "reps" },
                  valueNumeric: 5,
                  valueText: null,
                  plannedNumeric: 5,
                  plannedText: null,
                },
              ],
            },
          ],
        },
      ],
    };
  }

  it("applies weight bump on STRENGTH weight KPI only", async () => {
    mocked.workout.findUnique.mockResolvedValue(buildSourceWorkout());
    mocked.workout.updateMany.mockResolvedValue({ count: 0 });
    mocked.workout.create.mockResolvedValue({ id: "new-workout" });

    await cloneWorkoutAsPlanned("w1", "user-1", { weightDeltaKg: 2.5 });

    const call = mocked.workout.create.mock.calls[0][0];
    const createdValues =
      call.data.blocks.create[0].entries.create[0].values.create;
    // weight_kg: 80 (actual) + 2.5 bump = 82.5
    expect(createdValues[0]).toEqual(
      expect.objectContaining({
        kpiDefinitionId: "kpi-w",
        plannedNumeric: 82.5,
      }),
    );
    // reps KPI: NOT bumped — stays at 5.
    expect(createdValues[1]).toEqual(
      expect.objectContaining({
        kpiDefinitionId: "kpi-r",
        plannedNumeric: 5,
      }),
    );
  });

  it("finishes any active workout before cloning", async () => {
    mocked.workout.findUnique.mockResolvedValue(buildSourceWorkout());
    mocked.workout.updateMany.mockResolvedValue({ count: 0 });
    mocked.workout.create.mockResolvedValue({ id: "new-workout" });

    await cloneWorkoutAsPlanned("w1", "user-1");

    expect(mocked.workout.updateMany).toHaveBeenCalledWith({
      where: { userId: "user-1", finishedAt: null },
      data: expect.objectContaining({ finishedAt: expect.any(Date) }),
    });
  });

  it("throws on ownership mismatch", async () => {
    mocked.workout.findUnique.mockResolvedValue({
      ...buildSourceWorkout(),
      userId: "other-user",
    });
    await expect(
      cloneWorkoutAsPlanned("w1", "user-1"),
    ).rejects.toThrow(/Forbidden/);
    expect(mocked.workout.create).not.toHaveBeenCalled();
  });

  it("throws Not found when source is missing", async () => {
    mocked.workout.findUnique.mockResolvedValue(null);
    await expect(cloneWorkoutAsPlanned("w1", "user-1")).rejects.toThrow();
    expect(mocked.workout.create).not.toHaveBeenCalled();
  });
});
