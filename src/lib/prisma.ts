import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }
  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({ adapter });
}

/**
 * Lazy singleton — the client is created on first access only, so that
 * importing this module at build time (when DATABASE_URL may be absent)
 * doesn't crash Next.js page-data collection.
 */
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const client =
      globalForPrisma.prisma ??
      (globalForPrisma.prisma = createPrismaClient());
    const value = (client as unknown as Record<PropertyKey, unknown>)[prop];
    if (typeof value === "function") {
      return (value as (...args: unknown[]) => unknown).bind(client);
    }
    return value;
  },
});
