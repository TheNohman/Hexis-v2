import { describe, it } from "vitest";

// Sanity test scaffold: verify that `deleteWorkoutAction` calls
// `getCurrentUserId` before delegating to the mutation. This action is
// not implemented on `main` yet, so we skip for now — un-skip once the
// action is added and wire up the mocks below.
describe("deleteWorkoutAction", () => {
  it.skip(
    "calls getCurrentUserId before the mutation (action not implemented yet)",
    () => {
      // Intended shape when implemented:
      //
      // vi.mock("@/lib/auth-helpers", () => ({
      //   getCurrentUserId: vi.fn().mockResolvedValue("user-1"),
      // }));
      // vi.mock("@/lib/workouts/mutations", () => ({
      //   deleteWorkout: vi.fn().mockResolvedValue(undefined),
      // }));
      //
      // const { deleteWorkoutAction } = await import("./actions");
      // await deleteWorkoutAction("w1");
      //
      // expect(getCurrentUserId).toHaveBeenCalledBefore(deleteWorkout);
    },
  );
});
