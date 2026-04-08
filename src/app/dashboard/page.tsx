import { auth, signOut } from "@/auth";

export default async function Dashboard() {
  const session = await auth();

  return (
    <main className="flex-1 flex flex-col items-center justify-center px-4">
      <div className="max-w-lg w-full space-y-8">
        <h1 className="text-3xl font-bold">Tableau de bord</h1>

        <div className="rounded-xl border border-foreground/10 p-6 space-y-4">
          <h2 className="text-lg font-semibold">Informations utilisateur</h2>

          <div className="space-y-2 text-sm">
            {session?.user?.image && (
              <div className="flex items-center gap-4">
                <img
                  src={session.user.image}
                  alt="Avatar"
                  className="w-16 h-16 rounded-full"
                />
              </div>
            )}
            <div className="flex justify-between py-2 border-b border-foreground/5">
              <span className="text-foreground/60">Nom</span>
              <span className="font-medium">{session?.user?.name ?? "N/A"}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-foreground/5">
              <span className="text-foreground/60">Email</span>
              <span className="font-medium">{session?.user?.email ?? "N/A"}</span>
            </div>
          </div>
        </div>

        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/" });
          }}
        >
          <button
            type="submit"
            className="rounded-lg border border-foreground/20 px-6 py-2 text-sm font-medium hover:bg-foreground/5 transition-colors cursor-pointer"
          >
            Se déconnecter
          </button>
        </form>
      </div>
    </main>
  );
}
