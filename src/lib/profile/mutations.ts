import { prisma } from "@/lib/prisma";

export async function updateUserProfile(
  userId: string,
  data: {
    unitSystem?: string;
    defaultRestSecs?: number | null;
    mentorEnabled?: boolean;
    fcMax?: number | null;
    fcResting?: number | null;
    vmaKmh?: number | null;
    ftp?: number | null;
  },
): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: {
      ...(data.unitSystem !== undefined && { unitSystem: data.unitSystem }),
      ...(data.defaultRestSecs !== undefined && {
        defaultRestSecs: data.defaultRestSecs,
      }),
      ...(data.mentorEnabled !== undefined && {
        mentorEnabled: data.mentorEnabled,
      }),
      ...(data.fcMax !== undefined && { fcMax: data.fcMax }),
      ...(data.fcResting !== undefined && { fcResting: data.fcResting }),
      ...(data.vmaKmh !== undefined && { vmaKmh: data.vmaKmh }),
      ...(data.ftp !== undefined && { ftp: data.ftp }),
    },
  });
}

export async function getUserProfile(userId: string): Promise<{
  unitSystem: string;
  defaultRestSecs: number | null;
  mentorEnabled: boolean;
  email: string | null;
  name: string | null;
  fcMax: number | null;
  fcResting: number | null;
  vmaKmh: number | null;
  ftp: number | null;
}> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      unitSystem: true,
      defaultRestSecs: true,
      mentorEnabled: true,
      email: true,
      name: true,
      fcMax: true,
      fcResting: true,
      vmaKmh: true,
      ftp: true,
    },
  });

  if (!user) throw new Error("Not found");

  return {
    unitSystem: user.unitSystem,
    defaultRestSecs: user.defaultRestSecs,
    mentorEnabled: user.mentorEnabled,
    email: user.email,
    name: user.name,
    fcMax: user.fcMax,
    fcResting: user.fcResting,
    vmaKmh: user.vmaKmh,
    ftp: user.ftp,
  };
}
