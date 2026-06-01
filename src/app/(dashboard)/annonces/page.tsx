import { requireTenantContext } from "@/lib/session";
import { listAnnouncementsForCompany } from "@/lib/repositories/announcement";
import { PageHeader } from "@/components/ui/page-header";
import { AnnouncementsList } from "./_components/AnnouncementsList";
import { NewAnnouncementButton } from "./_components/NewAnnouncementButton";

export default async function AnnoncesPage() {
  const ctx = await requireTenantContext();
  const announcements = await listAnnouncementsForCompany(ctx);
  const isManager = ctx.role === "MANAGER";

  return (
    <div className="page-enter space-y-5">
      <PageHeader
        eyebrow="Communication"
        title="Annonces internes"
        description="Les annonces publiées par les gestionnaires de votre entreprise."
        action={isManager ? <NewAnnouncementButton /> : null}
      />

      <AnnouncementsList
        announcements={announcements.map((a) => ({
          id: a.id,
          title: a.title,
          body: a.body,
          isPinned: a.isPinned,
          createdAt: a.createdAt,
          authorName: a.author?.name ?? a.author?.email ?? null,
        }))}
        canManage={isManager}
      />
    </div>
  );
}
