import { auth, signIn } from "@/auth";
import { redirect } from "next/navigation";

export default async function Home() {
  const session = await auth();

  if (session) {
    redirect("/dashboard");
  }

  return (
    <main className="flex-1 flex flex-col items-center justify-center px-4">
      <div className="max-w-2xl text-center space-y-8">
        <h1 className="text-5xl font-bold tracking-tight">
          Hexis
        </h1>
        <p className="text-xl text-foreground/60">
          Votre application de suivi fitness personnalisé.
          Programmes d&apos;entraînement, suivi de progression et bien plus.
        </p>
        <form
          action={async () => {
            "use server";
            await signIn("keycloak", { redirectTo: "/dashboard" });
          }}
        >
          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-lg bg-foreground text-background px-8 py-3 text-lg font-medium hover:opacity-90 transition-opacity cursor-pointer"
          >
            Se connecter
          </button>
        </form>
      </div>
    </main>
  );
}
