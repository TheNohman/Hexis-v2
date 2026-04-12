import { auth, signIn } from "@/auth";
import { redirect } from "next/navigation";

export default async function Home() {
  const session = await auth();

  if (session) {
    redirect("/dashboard");
  }

  return (
    <main className="flex-1 flex flex-col items-center justify-center px-6 relative overflow-hidden">
      {/* Decorative gradient orbs */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-accent/10 rounded-full blur-[128px] pointer-events-none" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-accent/5 rounded-full blur-[128px] pointer-events-none" />

      <div className="max-w-lg text-center space-y-8 relative z-10">
        {/* Logo mark */}
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-accent/10 border border-accent/20 mb-2">
          <span className="text-accent font-display text-2xl font-black tracking-tighter">H</span>
        </div>

        <div className="space-y-4">
          <h1 className="text-5xl sm:text-6xl font-display font-black tracking-tight leading-none">
            HEXIS
          </h1>
          <p className="text-lg text-muted leading-relaxed max-w-sm mx-auto">
            Suivi fitness. Programmes d&apos;entra&icirc;nement.
            Progression.
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
            className="inline-flex items-center gap-2 rounded-xl bg-accent text-background px-10 py-4 text-base font-bold tracking-wide hover:bg-accent-dark transition-colors cursor-pointer uppercase"
          >
            Commencer
          </button>
        </form>
      </div>
    </main>
  );
}
