import { requireManagerContext } from "@/lib/session";
import { listTemplates } from "@/lib/repositories/scheduleTemplate";
import { PageHeader } from "@/components/ui/page-header";
import { TemplatesList } from "./_components/TemplatesList";

export default async function TemplatesPage() {
  const ctx = await requireManagerContext();
  const templates = await listTemplates(ctx);

  return (
    <div className="page-enter space-y-5">
      <PageHeader
        eyebrow="Modèles"
        title="Modèles d'horaire"
        description="Sauvegardez une semaine type et réappliquez-la sur n'importe quelle autre semaine pour gagner du temps de planification."
      />

      <TemplatesList
        templates={templates.map((t) => ({
          id: t.id,
          name: t.name,
          createdAt: t.createdAt,
          shiftCount: t._count.shifts,
          createdByName: t.createdBy?.name ?? t.createdBy?.email ?? null,
        }))}
      />
    </div>
  );
}
