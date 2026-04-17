import { auth } from "@/auth";

export default auth((req) => {
  const { pathname } = req.nextUrl;

  // /glossary is intentionally PUBLIC (no auth gate).
  const isPublic = pathname.startsWith("/glossary");

  const isProtected =
    !isPublic &&
    (pathname.startsWith("/dashboard") ||
      pathname.startsWith("/sessions") ||
      pathname.startsWith("/templates") ||
      pathname.startsWith("/onboarding") ||
      pathname.startsWith("/profile") ||
      pathname.startsWith("/stats") ||
      pathname.startsWith("/history") ||
      pathname.startsWith("/programs") ||
      pathname.startsWith("/planning") ||
      pathname.startsWith("/wellness") ||
      pathname.startsWith("/bodyweight") ||
      pathname.startsWith("/measurements") ||
      pathname.startsWith("/exercises"));

  if (!req.auth && isProtected) {
    const newUrl = new URL("/api/auth/signin", req.nextUrl.origin);
    newUrl.searchParams.set("callbackUrl", req.nextUrl.href);
    return Response.redirect(newUrl);
  }
});

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/sessions/:path*",
    "/templates/:path*",
    "/onboarding/:path*",
    "/profile/:path*",
    "/stats/:path*",
    "/history/:path*",
    "/programs/:path*",
    "/planning/:path*",
    "/wellness/:path*",
    "/bodyweight/:path*",
    "/measurements/:path*",
    "/exercises/:path*",
  ],
};
