import { auth, signIn } from "@/auth";
import { redirect } from "next/navigation";

export default async function Home() {
  const session = await auth();

  if (session) {
    redirect("/dashboard");
  }

  return (
    <main className="flex-1 flex flex-col items-center justify-center px-6">
      <div className="max-w-sm w-full text-center space-y-8">
        <div className="space-y-3">
          <h1 className="text-4xl font-display font-bold tracking-tight">
            Hexis
          </h1>
          <p className="text-muted leading-relaxed">
            Votre application de suivi fitness personnalis&eacute;.
          </p>
        </div>

        <form
          action={async () => {
            "use server";
            await signIn("keycloak", { redirectTo: "/dashboard" });
          }}
        >
          <button
            type="submit"
            className="w-full rounded-xl bg-accent text-white px-8 py-3.5 font-semibold hover:bg-accent-hover transition-colors cursor-pointer shadow-sm"
          >
            Se connecter
          </button>
        </form>
      </div>
    </main>
  );
}
