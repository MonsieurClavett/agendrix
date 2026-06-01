import { auth } from "@/auth";
import { NextResponse } from "next/server";

const PROTECTED_PREFIXES = [
  "/dashboard",
  "/team",
  "/schedules",
  "/positions",
  "/disponibilites",
  "/conges",
  "/quarts-a-combler",
  "/echanges",
  "/templates",
  "/annonces",
  "/preferences",
  "/punch-locations",
  "/pointage",
  "/me",
  "/punch",
  "/rapports",
  "/api/reports",
  "/modifications",
  "/audit",
  "/approbation",
];

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
  matcher: [
    "/dashboard/:path*",
    "/team/:path*",
    "/schedules/:path*",
    "/positions/:path*",
    "/disponibilites/:path*",
    "/conges/:path*",
    "/quarts-a-combler/:path*",
    "/echanges/:path*",
    "/templates/:path*",
    "/annonces/:path*",
    "/preferences/:path*",
    "/punch-locations/:path*",
    "/pointage/:path*",
    "/me/:path*",
    "/punch/:path*",
    "/rapports/:path*",
    "/api/reports/:path*",
    "/modifications/:path*",
    "/audit/:path*",
    "/approbation/:path*",
  ],
};
