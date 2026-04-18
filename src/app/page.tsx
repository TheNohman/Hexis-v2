import { auth, signIn } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function Home() {
  const session = await auth();

  if (session) {
    redirect("/dashboard");
  }

  return (
    <main
      id="main-content"
      className="flex-1 flex flex-col items-center justify-center px-6 py-12 relative overflow-hidden"
    >
      {/* Decorative blue blob — hidden to AT, respects reduced motion */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-32 -right-32 h-[420px] w-[420px] rounded-full bg-accent/20 blur-3xl motion-safe:animate-pulse"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-40 -left-32 h-[360px] w-[360px] rounded-full bg-accent-light blur-3xl"
      />

      <div className="relative max-w-xl w-full text-center space-y-10 animate-fade-in-up">
        <div className="space-y-6">
          <span className="inline-block text-[10px] uppercase tracking-widest font-semibold rounded-full bg-accent text-accent-foreground px-3 py-1">
            Suivi d&rsquo;entra&icirc;nement
          </span>
          <h1 className="font-display font-black tracking-tight text-[48px] leading-[0.95] sm:text-[72px]">
            Hexis
          </h1>
          <p className="text-muted leading-relaxed text-base sm:text-lg max-w-md mx-auto">
            L&rsquo;app qui s&rsquo;adapte &agrave; ton sport, tes objectifs, ton rythme.
            Muscu, endurance, HIIT &mdash; un seul outil, des vrais r&eacute;sultats.
          </p>
        </div>

        <div className="space-y-3">
          <form
            action={async () => {
              "use server";
              await signIn("keycloak", { redirectTo: "/dashboard" });
            }}
          >
            <button
              type="submit"
              className="w-full sm:w-auto sm:min-w-[260px] rounded-full bg-foreground text-background px-8 py-4 font-semibold text-sm uppercase tracking-widest hover:opacity-90 transition-opacity cursor-pointer shadow-hero"
            >
              Se connecter
            </button>
          </form>
          <p className="text-xs text-subtle">
            <Link
              href="/glossary"
              className="text-accent-ink hover:underline underline-offset-2"
            >
              Glossaire
            </Link>
            <span aria-hidden="true" className="mx-2">&middot;</span>
            Connexion s&eacute;curis&eacute;e via Keycloak
          </p>
        </div>
      </div>
    </main>
  );
}
