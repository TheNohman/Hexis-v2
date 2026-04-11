import { auth } from "@/auth";

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isProtected =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/sessions") ||
    pathname.startsWith("/templates");

  if (!req.auth && isProtected) {
    const newUrl = new URL("/api/auth/signin", req.nextUrl.origin);
    newUrl.searchParams.set("callbackUrl", req.nextUrl.href);
    return Response.redirect(newUrl);
  }
});

export const config = {
  matcher: ["/dashboard/:path*", "/sessions/:path*", "/templates/:path*"],
};
