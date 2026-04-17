import { prisma } from "@/lib/prisma";

export type RecentEvent = {
  id: string;
  name: string;
  payload: Record<string, unknown> | null;
  createdAt: Date;
};

/**
 * Liste les N derniers events de l'utilisateur (par défaut 30), les plus
 * récents en premier.
 */
export async function listRecentEvents(
  userId: string,
  limit = 30,
): Promise<RecentEvent[]> {
  const rows = await prisma.appEvent.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: { id: true, name: true, payload: true, createdAt: true },
  });
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    payload: (r.payload as Record<string, unknown> | null) ?? null,
    createdAt: r.createdAt,
  }));
}

/**
 * Compte les events de l'utilisateur par `name` depuis une date donnée.
 * Renvoie un objet `{ [eventName]: count }` (les types d'events sans
 * occurrence ne figurent pas dans le résultat).
 */
export async function countEventsByName(
  userId: string,
  since: Date,
): Promise<Record<string, number>> {
  const rows = await prisma.appEvent.groupBy({
    by: ["name"],
    where: { userId, createdAt: { gte: since } },
    _count: { _all: true },
  });
  const result: Record<string, number> = {};
  for (const r of rows) {
    result[r.name] = r._count._all;
  }
  return result;
}
