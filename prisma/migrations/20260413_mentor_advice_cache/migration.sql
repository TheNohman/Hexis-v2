-- Cache du conseil IA pour la prochaine séance
ALTER TABLE "User" ADD COLUMN "lastAdvice" TEXT;
ALTER TABLE "User" ADD COLUMN "lastAdviceAt" TIMESTAMP(3);
