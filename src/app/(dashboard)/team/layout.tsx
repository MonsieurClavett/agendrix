import { redirect } from "next/navigation";

import { requireTenantContext } from "@/lib/session";

export default async function TeamLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await requireTenantContext();
  if (ctx.role !== "MANAGER") {
    redirect("/dashboard?error=forbidden");
  }
  return <>{children}</>;
}
