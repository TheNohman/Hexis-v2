"use server";

import { getCurrentUserId } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { buildMentorContext } from "@/lib/mentor/context";
import { chatWithMentor, type MentorMessage } from "@/lib/mentor/openai";

export async function sendMentorMessageAction(
  messages: MentorMessage[],
): Promise<string> {
  const userId = await getCurrentUserId();

  // Check mentor is enabled
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { mentorEnabled: true },
  });
  if (!user?.mentorEnabled) {
    throw new Error("Le mentor IA n'est pas activé. Active-le dans ton profil.");
  }

  const context = await buildMentorContext(userId);
  const response = await chatWithMentor(context, messages);
  return response;
}
