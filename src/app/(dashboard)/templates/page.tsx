import { requireManagerContext } from "@/lib/session";
import { listTemplates } from "@/lib/repositories/scheduleTemplate";
import { TemplatesList } from "./_components/TemplatesList";

export default async function TemplatesPage() {
  const ctx = await requireManagerContext();
  const templates = await listTemplates(ctx);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Modèles d&apos;horaire</h1>
        <p className="text-muted-foreground text-sm">
          Sauvegardez une semaine type et réappliquez-la sur n&apos;importe quelle
          autre semaine pour gagner du temps de planification.
        </p>
      </div>

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
