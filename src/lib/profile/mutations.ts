import { prisma } from "@/lib/prisma";

export async function updateUserProfile(
  userId: string,
  data: {
    unitSystem?: string;
    defaultRestSecs?: number | null;
    bodyWeightKg?: number | null;
  },
): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: {
      ...(data.unitSystem !== undefined && { unitSystem: data.unitSystem }),
      ...(data.defaultRestSecs !== undefined && {
        defaultRestSecs: data.defaultRestSecs,
      }),
      ...(data.bodyWeightKg !== undefined && {
        bodyWeightKg: data.bodyWeightKg,
      }),
    },
  });
}

export async function getUserProfile(userId: string): Promise<{
  unitSystem: string;
  defaultRestSecs: number | null;
  bodyWeightKg: number | null;
  email: string | null;
  name: string | null;
}> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      unitSystem: true,
      defaultRestSecs: true,
      bodyWeightKg: true,
      email: true,
      name: true,
    },
  });

  if (!user) throw new Error("Not found");

  return {
    unitSystem: user.unitSystem,
    defaultRestSecs: user.defaultRestSecs,
    bodyWeightKg: user.bodyWeightKg,
    email: user.email,
    name: user.name,
  };
}
