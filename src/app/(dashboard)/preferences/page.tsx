import { requireTenantContext } from "@/lib/session";
import { getOwnPreferences } from "@/lib/repositories/employeePreference";
import { PageHeader } from "@/components/ui/page-header";
import { PreferencesForm } from "./_components/PreferencesForm";

export default async function PreferencesPage() {
  const ctx = await requireTenantContext();
  const prefs = await getOwnPreferences(ctx);

  return (
    <div className="page-enter space-y-5">
      <PageHeader
        eyebrow="Vous"
        title="Mes préférences"
        description="Indiquez vos heures souhaitées et vos jours préférés. Ces informations aident votre gestionnaire à mieux planifier."
      />

      <PreferencesForm
        initial={{
          minHoursPerWeek: prefs?.minHoursPerWeek ?? null,
          maxHoursPerWeek: prefs?.maxHoursPerWeek ?? null,
          preferredDays: prefs?.preferredDays ?? [],
          notes: prefs?.notes ?? "",
        }}
      />
    </div>
  );
}
