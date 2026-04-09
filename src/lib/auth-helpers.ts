import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/**
 * Ensure the current request is authenticated and return the database-backed
 * user ID. Since we use JWT sessions without a Prisma adapter, the User row
 * doesn't exist automatically — we upsert it on first access, keyed on email.
 *
 * Throws an Error if the user is not authenticated.
 */
export async function getCurrentUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.email) {
    throw new Error("Unauthorized");
  }

  const user = await prisma.user.upsert({
    where: { email: session.user.email },
    update: {
      name: session.user.name ?? undefined,
      image: session.user.image ?? undefined,
    },
    create: {
      email: session.user.email,
      name: session.user.name ?? null,
      image: session.user.image ?? null,
    },
  });

  return user.id;
}
