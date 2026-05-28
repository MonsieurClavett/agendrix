import { auth } from "@/auth";
import { NextResponse } from "next/server";

const PROTECTED_PREFIXES = ["/dashboard"];

export default auth((req) => {
  const isProtected = PROTECTED_PREFIXES.some((p) =>
    req.nextUrl.pathname.startsWith(p),
  );

  if (isProtected && !req.auth) {
    const url = new URL("/login", req.nextUrl);
    url.searchParams.set("callbackUrl", req.nextUrl.pathname);
    return NextResponse.redirect(url);
  }
});

export const config = {
  matcher: ["/dashboard/:path*"],
};
