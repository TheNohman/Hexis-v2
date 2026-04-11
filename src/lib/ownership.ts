export function assertOwnership<T extends { userId: string }>(
  entity: T | null,
  userId: string,
): asserts entity is T {
  if (!entity) throw new Error("Not found");
  if (entity.userId !== userId) throw new Error("Forbidden");
}
