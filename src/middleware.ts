import { auth } from "@/lib/auth";

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const path = req.nextUrl.pathname;

  if (path.startsWith("/login")) {
    if (isLoggedIn) {
      return Response.redirect(new URL("/feed", req.nextUrl));
    }
    return;
  }

  if (!isLoggedIn) {
    const login = new URL("/login", req.nextUrl);
    login.searchParams.set("callbackUrl", path);
    return Response.redirect(login);
  }

  const role = (req.auth?.user as { role?: string })?.role ?? "VIEWER";

  if (role === "VIEWER") {
    const restricted = ["/keywords", "/upload", "/admin"];
    if (restricted.some((r) => path.startsWith(r))) {
      return Response.redirect(new URL("/feed", req.nextUrl));
    }
  }

  if (role === "ANALYST" && path.startsWith("/admin")) {
    return Response.redirect(new URL("/feed", req.nextUrl));
  }

  return;
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/auth).*)"],
};

